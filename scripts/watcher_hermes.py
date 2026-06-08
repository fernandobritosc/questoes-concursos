"""
Watcher contínuo: monitora o relay, atualiza estatísticas em tempo real.
Uso: python scripts/watcher_hermes.py

Mantém estado_atual.json atualizado com:
  - estatísticas por assunto
  - padrões de erro por banca
  - últimas respostas
  - streak
  - recomendação do dia
Também gera resumo_evolucao.md para o Hermes LLM.
"""

import os
import sys
import json
import time
import signal
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
try:
    from zoneinfo import ZoneInfo
    FUSO_BR = ZoneInfo("America/Sao_Paulo")
except ImportError:
    FUSO_BR = timezone(-timedelta(hours=3), "BRT")
from urllib.request import Request, urlopen
from urllib.error import URLError

sys.path.insert(0, os.path.dirname(__file__))
from _hermes_env import load_config, resolve_relay_url, ts_to_local_date


STATE_FILE = os.path.join(os.path.dirname(__file__), '..', 'estado_atual.json')
NOTIF_FILE = os.path.join(os.path.dirname(__file__), '..', 'notificacoes.json')
RESUMO_FILE = os.path.join(os.path.dirname(__file__), '..', 'resumo_evolucao.md')
POLL_INTERVAL = 3
JANELA_RECOMENDACAO_DIAS = 7
JANELA_DEDUP_SEGUNDOS = 120
STREAK_GRACE_DIAS = 1

running = True

def signal_handler(sig, frame):
    global running
    running = False

RELAY_URL = resolve_relay_url(load_config())

def get_events(after):
    try:
        req = Request(f'{RELAY_URL}/events?after={after}')
        with urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except URLError:
        return None

class StatsEngine:
    def __init__(self):
        self.offset = 0
        self.notificacoes_ativas = {}
        self.ultimo_envio_notif = 0
        self.reset()

    def reset(self):
        self.por_assunto = defaultdict(lambda: {'total': 0, 'acertos': 0, 'tempo': 0, 'erros_recentes': []})
        self.por_banca = defaultdict(lambda: {'total': 0, 'acertos': 0})
        self.por_banca_assunto = defaultdict(lambda: {'total': 0, 'acertos': 0})
        self.ids_vistos = set()
        self.ids_tec = defaultdict(list)
        self.ultima_resposta_questao = {}  # dedup por questão+assunto
        self.pendentes_revisao = {}  # questao_id -> {materia, assunto, tentativas, primeiro_erro_em, ...}
        self.historico_resolvidos = []  # questões que saíram dos pendentes (para celebrar evolução)
        self.timeline_de = []
        self.timeline = []
        self.datas_estudo = set()
        self.event_count = 0

    def _dedup_key(self, d):
        return (
            d.get('questao_tec_id') or d.get('questao_id') or d.get('materia'),
            d.get('materia'),
            d.get('assunto'),
        )

    def _ts_to_local_date(self, ts):
        if not ts:
            return None
        try:
            dt = datetime.fromisoformat(ts)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(FUSO_BR).strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            return ts[:10] if ts else None

    def _parse_time(self, ts):
        if not ts:
            return None
        dt = None
        for fmt in ('%Y-%m-%dT%H:%M:%S.%f%z', '%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S'):
            try:
                dt = datetime.strptime(ts, fmt)
                break
            except ValueError:
                continue
        if not dt:
            try:
                dt = datetime.fromisoformat(ts)
            except ValueError:
                try:
                    dt = datetime.fromisoformat(ts[:26])
                except Exception:
                    return None
        if dt and dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    def ingest(self, eventos):
        for e in eventos:
            self.event_count += 1
            d = e.get('dados', {})
            mat = d.get('materia') or 'Sem matéria'
            ass = d.get('assunto') or 'Sem assunto'
            acertou = d.get('acertou', False)
            tempo = d.get('tempo_segundos', 0)
            ts = e.get('timestamp')
            dt_local = self._ts_to_local_date(ts)
            if dt_local:
                self.datas_estudo.add(dt_local)

            # Dedup: evita duplicatas na mesma sessão (janela de 2 minutos)
            dedup_k = self._dedup_key(d)
            ultima = self.ultima_resposta_questao.get(dedup_k)
            if ultima is not None and ts:
                try:
                    ultima_dt = self._parse_time(ultima['timestamp'])
                    atual_dt = self._parse_time(ts)
                    if ultima_dt and atual_dt and abs((atual_dt - ultima_dt).total_seconds()) < JANELA_DEDUP_SEGUNDOS:
                        continue
                except Exception:
                    pass

            chave = (mat, ass)
            s = self.por_assunto[chave]
            s['total'] += 1
            s['tempo'] += tempo
            if acertou:
                s['acertos'] += 1
            else:
                s['erros_recentes'].append({
                    'questao_id': d.get('questao_id'),
                    'banca': d.get('banca_texto'),
                    'gabarito': d.get('gabarito'),
                    'marcou': d.get('alternativa_selecionada'),
                    'data': ts or '',
                })
                if len(s['erros_recentes']) > 20:
                    s['erros_recentes'].pop(0)

            banca = d.get('banca_texto') or 'Sem banca'
            self.por_banca[banca]['total'] += 1
            if acertou:
                self.por_banca[banca]['acertos'] += 1

            chave_ba = f'{banca}||{ass}'
            ba = self.por_banca_assunto[chave_ba]
            ba['total'] += 1
            if acertou:
                ba['acertos'] += 1

            qid = d.get('questao_id')
            if qid:
                self.ids_vistos.add(qid)

            tid = d.get('questao_tec_id')
            if tid:
                self.ids_tec[tid].append(e)

            # Rastreamento de pendentes de revisão:
            # - responder_questao/revisar_questao com acerto → sai dos pendentes
            # - responder_questao/revisar_questao com erro → entra/atualiza pendente
            tipo_evento = e.get('tipo')
            key_revisao = tid or qid
            if tipo_evento in ('responder_questao', 'revisar_questao') and key_revisao is not None:
                if acertou:
                    removido = self.pendentes_revisao.pop(key_revisao, None)
                    if tid and qid:
                        self.pendentes_revisao.pop(qid, None)
                    if removido:
                        self.historico_resolvidos.append({
                            'questao_id': qid,
                            'materia': mat,
                            'assunto': ass,
                            'tentativas': removido.get('tentativas', 1),
                            'resolvido_em': ts or '',
                        })
                        if len(self.historico_resolvidos) > 50:
                            self.historico_resolvidos = self.historico_resolvidos[-50:]
                else:
                    if key_revisao not in self.pendentes_revisao:
                        self.pendentes_revisao[key_revisao] = {
                            'primeiro_erro_em': ts or '',
                            'tentativas': 0,
                        }
                    p = self.pendentes_revisao[key_revisao]
                    p.update({
                        'questao_id': qid,
                        'questao_tec_id': tid,
                        'materia': mat,
                        'assunto': ass,
                        'banca_texto': d.get('banca_texto') or 'Sem banca',
                        'gabarito': d.get('gabarito'),
                        'ultima_tentativa_em': ts or '',
                        'ultima_marcou': d.get('alternativa_selecionada'),
                    })
                    p['tentativas'] = p.get('tentativas', 0) + 1

            self.ultima_resposta_questao[dedup_k] = {
                'timestamp': ts,
                'acertou': acertou,
                'materia': mat,
                'assunto': ass,
            }

            self.timeline.append({
                'tipo': e.get('tipo'),
                'materia': mat,
                'assunto': ass,
                'acertou': acertou,
                'tempo': tempo,
                'timestamp': ts or '',
            })
            self.timeline_de.append({
                'tipo': e.get('tipo'),
                'materia': mat,
                'assunto': ass,
                'acertou': acertou,
                'tempo': tempo,
                'timestamp': ts,
            } if ts else None)

        if len(self.timeline) > 200:
            self.timeline = self.timeline[-200:]
            self.timeline_de = self.timeline_de[-200:]

    def calcular_estado(self):
        # Janela temporal para recomendação
        cutoff = datetime.now(timezone.utc) - timedelta(days=JANELA_RECOMENDACAO_DIAS)
        timeline_recente = []
        if self.timeline_de:
            for item in self.timeline_de:
                try:
                    dt = self._parse_time(item['timestamp'])
                    if dt and dt >= cutoff:
                        timeline_recente.append(item)
                except Exception:
                    pass

        por_assunto_recente = defaultdict(lambda: {'total': 0, 'acertos': 0, 'tempo': 0})
        for item in timeline_recente:
            key = (item['materia'], item['assunto'])
            por_assunto_recente[key]['total'] += 1
            if item['acertou']:
                por_assunto_recente[key]['acertos'] += 1
            por_assunto_recente[key]['tempo'] += item.get('tempo') or 0

        assuntos = []
        for (mat, ass), s in self.por_assunto.items():
            pct = round(s['acertos'] / s['total'] * 100) if s['total'] else 0
            assuntos.append({
                'materia': mat,
                'assunto': ass,
                'total': s['total'],
                'acertos': s['acertos'],
                'taxa': pct,
                'tempo_medio': round(s['tempo'] / s['total']) if s['total'] else 0,
                'nivel': 'critico' if pct < 40 else ('alerta' if pct < 70 else 'bom'),
            })

        bancas = []
        for banca, s in sorted(self.por_banca.items(), key=lambda x: x[1]['acertos']/max(x[1]['total'],1)):
            pct = round(s['acertos'] / s['total'] * 100) if s['total'] else 0
            if s['total'] >= 2:
                bancas.append({'banca': banca, 'total': s['total'], 'acertos': s['acertos'], 'taxa': pct})

        padroes = []
        for chave, s in self.por_banca_assunto.items():
            pct = round(s['acertos'] / s['total'] * 100) if s['total'] else 0
            if s['total'] >= 2 and pct < 60:
                banca, assunto = chave.split('||', 1)
                padroes.append({'banca': banca, 'assunto': assunto, 'total': s['total'], 'taxa': pct})

        repeticoes = []
        for tid, evts in sorted(self.ids_tec.items(), key=lambda x: -len(x[1])):
            if len(evts) >= 2:
                acertos = sum(1 for e in evts if e['dados'].get('acertou'))
                pct = round(acertos / len(evts) * 100)
                repeticoes.append({
                    'questao_tec_id': tid,
                    'materia': evts[0]['dados'].get('materia'),
                    'assunto': evts[0]['dados'].get('assunto'),
                    'vezes': len(evts),
                    'acertos': acertos,
                    'taxa': pct,
                })

        total = sum(s['total'] for s in self.por_assunto.values())
        acertos = sum(s['acertos'] for s in self.por_assunto.values())
        taxa_geral = round(acertos / total * 100) if total else 0

        datas = sorted(list(self.datas_estudo))
        streak = 0
        hoje = datetime.now(FUSO_BR).strftime('%Y-%m-%d')
        limite = (datetime.now(FUSO_BR) - timedelta(days=STREAK_GRACE_DIAS)).strftime('%Y-%m-%d')
        if datas and datas[-1] >= limite:
            ultima_dt = datetime.strptime(datas[-1], '%Y-%m-%d')
            for i in range(len(datas)-1, -1, -1):
                esperada = (ultima_dt - timedelta(days=len(datas)-1-i)).strftime('%Y-%m-%d')
                if datas[i] == esperada:
                    streak += 1
                else:
                    break

        # Recomendação baseada em janela recente
        fracos_recentes = sorted(
            [a for a in assuntos if a['taxa'] < 70 and a['total'] >= 2],
            key=lambda x: x['taxa']
        )

        # Pendentes de revisão: tudo que errou e ainda não acertou de volta
        pendentes = list(self.pendentes_revisao.values())
        pendentes_por_materia = defaultdict(int)
        for p in pendentes:
            pendentes_por_materia[p.get('materia') or 'Sem matéria'] += 1
        pendentes_por_materia_ord = sorted(
            pendentes_por_materia.items(), key=lambda x: -x[1]
        )

        # Pendentes há mais de 7 dias (urgentes)
        cutoff_antigo = datetime.now(timezone.utc) - timedelta(days=7)
        pendentes_antigas = sorted(
            [p for p in pendentes if self._parse_time(p.get('primeiro_erro_em')) and self._parse_time(p.get('primeiro_erro_em')) < cutoff_antigo],
            key=lambda x: self._parse_time(x.get('primeiro_erro_em')) or datetime.min.replace(tzinfo=timezone.utc)
        )[:10]

        # Evolução: quantas pendentes foram resolvidas nas últimas 24h
        cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        resolvidos_24h = sum(1 for r in self.historico_resolvidos if self._parse_time(r.get('resolvido_em')) and self._parse_time(r.get('resolvido_em')) >= cutoff_24h)

        # Fracos RELEVANTES (≥5 tentativas, <70%) — diferente dos fracos_recentes (≥2)
        fracos_relevantes = sorted(
            [a for a in assuntos if a['taxa'] < 70 and a['total'] >= 5],
            key=lambda x: x['taxa']
        )[:5]

        # Recomendação prioriza: pendentes > fraco relevante > fraco_recentes
        recomendacao = None
        if pendentes:
            # Agrupa pendentes por assunto para encontrar o "carro-chefe"
            pend_por_assunto = defaultdict(list)
            for p in pendentes:
                key = (p.get('materia') or '?', p.get('assunto') or '?')
                pend_por_assunto[key].append(p)
            top_assunto = sorted(
                pend_por_assunto.items(), key=lambda x: -len(x[1])
            )[0]
            (mat, ass), qids = top_assunto
            recomendacao = {
                'tipo': 'pendentes_revisao',
                'materia': mat,
                'assunto': ass,
                'pendentes': len(qids),
                'total_pendentes': len(pendentes),
                'acoes': [
                    f'Revisar {min(5, len(qids))} das {len(qids)} pendentes em {mat} → {ass}',
                    'Use a aba "Revisão" do app e filtre por este assunto',
                ],
            }
            if pendentes_antigas:
                antiga = pendentes_antigas[0]
                recomendacao['urgente'] = (
                    f'{len(pendentes_antigas)} pendente(s) há mais de 7 dias — '
                    f'a mais antiga: {antiga.get("materia")} → {antiga.get("assunto")} '
                    f'(desde {antiga.get("primeiro_erro_em", "?")[:10]})'
                )
        elif fracos_relevantes:
            alvo = fracos_relevantes[0]
            recomendacao = {
                'tipo': 'fraco_relevante',
                'materia': alvo['materia'],
                'assunto': alvo['assunto'],
                'taxa': alvo['taxa'],
                'total': alvo['total'],
                'acoes': [
                    f'Revisar teoria de {alvo["materia"]} — {alvo["assunto"]}',
                    f'Fazer 5-10 questões focadas nesse tópico',
                ],
            }
        elif fracos_recentes:
            alvo = fracos_recentes[0]
            recomendacao = {
                'tipo': 'fraco_recente',
                'materia': alvo['materia'],
                'assunto': alvo['assunto'],
                'taxa': alvo['taxa'],
                'total': alvo['total'],
                'acoes': [
                    f'Revisar teoria de {alvo["materia"]} — {alvo["assunto"]}',
                    f'Fazer 5-10 questões focadas nesse tópico',
                ],
            }

        return {
            'atualizado_em': datetime.now().isoformat(),
            'total_eventos': self.event_count,
            'total_questoes_unicas': len(self.ids_vistos),
            'total_respondidas': total,
            'total_acertos': acertos,
            'taxa_geral': taxa_geral,
            'streak': streak,
            'assuntos': assuntos,
            'bancas': bancas[:5],
            'padroes': padroes[:10],
            'repeticoes': repeticoes[:5],
            'ultimas_acoes': self.timeline[-10:][::-1] if self.timeline else [],
            'pendentes_revisao_total': len(pendentes),
            'pendentes_revisao_por_materia': dict(pendentes_por_materia_ord),
            'pendentes_antigas': pendentes_antigas,
            'resolvidos_24h': resolvidos_24h,
            'fracos_relevantes': fracos_relevantes,
            'recomendacao': recomendacao,
            'janela_recomendacao_dias': JANELA_RECOMENDACAO_DIAS,
        }

def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    stats = StatsEngine()

    # Tenta carregar offset do estado anterior
    estado_anterior = None
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                estado_anterior = json.load(f)
                stats.offset = estado_anterior.get('_offset_relay', 0)
        except (json.JSONDecodeError, IOError):
            pass

    print(f'Watcher Hermes iniciado (relay: {RELAY_URL})')
    print(f'Offset inicial: {stats.offset}')
    print(f'Estado salvo em: {STATE_FILE}')
    print('Pressione Ctrl+C para parar\n')

    while running:
        data = get_events(stats.offset)
        if data is None:
            if running:
                time.sleep(POLL_INTERVAL)
            continue

        eventos = data.get('events', [])
        if not eventos:
            if running:
                time.sleep(POLL_INTERVAL)
            continue

        stats.ingest(eventos)
        ultimo = eventos[-1]
        stats.offset = ultimo.get('_offset', stats.offset)
        print(f'[{datetime.now().strftime("%H:%M:%S")}] +{len(eventos)} eventos '
              f'(total: {stats.event_count})')

        estado = stats.calcular_estado()
        estado['_offset_relay'] = stats.offset

        try:
            with open(STATE_FILE + '.tmp', 'w', encoding='utf-8') as f:
                json.dump(estado, f, ensure_ascii=False, indent=2)
            os.replace(STATE_FILE + '.tmp', STATE_FILE)
        except PermissionError:
            # Outro processo (ex.: hermes agent) está lendo o arquivo — tenta de novo no próximo ciclo
            try:
                os.remove(STATE_FILE + '.tmp')
            except FileNotFoundError:
                pass

        PENDENTES_FILE = os.path.join(os.path.dirname(__file__), '..', 'pendentes_revisao.json')
        try:
            with open(PENDENTES_FILE + '.tmp', 'w', encoding='utf-8') as f:
                json.dump(stats.pendentes_revisao, f, ensure_ascii=False, indent=2)
            os.replace(PENDENTES_FILE + '.tmp', PENDENTES_FILE)
        except PermissionError:
            try:
                os.remove(PENDENTES_FILE + '.tmp')
            except FileNotFoundError:
                pass

        try:
            from gerar_todas_revisoes import gerar_guias
            gerar_guias()
        except Exception as e:
            print(f"  [Erro ao gerar guias de revisão] {e}", file=sys.stderr)

        # Gera notificações inteligentes (a cada 30s no máximo)
        now = time.time()
        if now - stats.ultimo_envio_notif > 30:
            notificacoes = gerar_notificacoes(stats, estado)
            if notificacoes or stats.notificacoes_ativas:
                stats.notificacoes_ativas = {n['id']: n for n in notificacoes}
                stats.ultimo_envio_notif = now
                try:
                    with open(NOTIF_FILE + '.tmp', 'w', encoding='utf-8') as f:
                        json.dump({'atualizado_em': datetime.now().isoformat(), 'notificacoes': notificacoes}, f, ensure_ascii=False, indent=2)
                    os.replace(NOTIF_FILE + '.tmp', NOTIF_FILE)
                except PermissionError:
                    try:
                        os.remove(NOTIF_FILE + '.tmp')
                    except FileNotFoundError:
                        pass
                if notificacoes:
                    print(f'  [!] {len(notificacoes)} notificacao(oes)')

        # Gera resumo pré-processado para o Hermes LLM
        try:
            with open(RESUMO_FILE + '.tmp', 'w', encoding='utf-8') as f:
                f.write(gerar_resumo_evolucao(estado))
            os.replace(RESUMO_FILE + '.tmp', RESUMO_FILE)
        except PermissionError:
            try:
                os.remove(RESUMO_FILE + '.tmp')
            except FileNotFoundError:
                pass

        if running:
            time.sleep(POLL_INTERVAL)

    print('\nWatcher encerrado.')

def gerar_notificacoes(stats, estado):
    notificacoes = []
    assuntos = estado.get('assuntos', [])

    # 1. Pegadinha repetida: mesmo banca+assunto, erro >= 2x
    padroes = estado.get('padroes', [])
    for p in padroes[:3]:
        if p['total'] >= 3:
            notificacoes.append({
                'id': f'pegadinha_{p["banca"]}_{p["assunto"]}',
                'tipo': 'pegadinha_repetida',
                'severidade': 'alta',
                'titulo': f'⚠️ Pegadinha da {p["banca"]} em {p["assunto"]}',
                'mensagem': f'Você errou {p["total"]} questões de {p["assunto"]} '
                           f'da banca {p["banca"]} ({p["taxa"]}% de acerto). '
                           f'Reveja esse tópico com atenção!',
            })

    # 2. Assunto crítico: taxa < 40%
    for a in assuntos:
        if a['taxa'] < 40 and a['total'] >= 3:
            notificacoes.append({
                'id': f'critico_{a["materia"]}_{a["assunto"]}',
                'tipo': 'assunto_critico',
                'severidade': 'urgente',
                'titulo': f'🔴 {a["assunto"]} está crítico!',
                'mensagem': f'Você acertou apenas {a["taxa"]}% das questões de '
                           f'{a["materia"]} — {a["assunto"]} ({a["total"]} tentativas). '
                           f'Priorize esse assunto hoje.',
            })

    # 3. Múltiplas tentativas da mesma questão
    for r in estado.get('repeticoes', []):
        if r['vezes'] >= 3 and r['taxa'] < 50:
            notificacoes.append({
                'id': f'repetida_{r["questao_tec_id"]}',
                'tipo': 'questao_repetida',
                'severidade': 'media',
                'titulo': f'🔄 Você já viu essa questão {r["vezes"]}x',
                'mensagem': f'A questão ID {r["questao_tec_id"]} de {r["materia"]} — '
                           f'{r["assunto"]} você já respondeu {r["vezes"]} vezes '
                           f'e acertou apenas {r["taxa"]}%. Revise o gabarito!',
            })

    # 4. Streak reset
    if estado.get('streak', 0) == 0 and stats.event_count > 100:
        notificacoes.append({
            'id': 'streak_reset',
            'tipo': 'streak',
            'severidade': 'media',
            'titulo': '🔥 Streak foi perdida',
            'mensagem': 'Você não estuda há mais de 1 dia. '
                       'Que tal responder algumas questões agora?',
        })

    # 5. Desempenho caiu: últimas 5 vs geral (se tiver dados suficientes)
    ultimas = estado.get('ultimas_acoes', [])
    if len(ultimas) >= 10:
        recentes = ultimas[:5]
        taxa_recente = sum(1 for a in recentes if a['acertou']) / len(recentes) * 100
        if taxa_recente < (estado.get('taxa_geral', 50) - 15) and taxa_recente < 60:
            notificacoes.append({
                'id': f'queda_desempenho',
                'tipo': 'queda_desempenho',
                'severidade': 'alta',
                'titulo': '📉 Desempenho caiu nas últimas questões',
                'mensagem': f'Sua taxa nas últimas 5 questões foi {round(taxa_recente)}%, '
                           f'abaixo da sua média de {estado["taxa_geral"]}%. '
                           f'Talvez esteja cansado ou o assunto mudou.',
            })

    return notificacoes[:8]  # Máximo 8 notificações

def gerar_resumo_evolucao(estado):
    rec = estado.get('recomendacao') or {}
    pendentes_total = estado.get('pendentes_revisao_total', 0)
    pendentes_por_mat = estado.get('pendentes_revisao_por_materia', {})
    pendentes_antigas = estado.get('pendentes_antigas', [])
    resolvidos_24h = estado.get('resolvidos_24h', 0)
    fracos_relevantes = estado.get('fracos_relevantes', [])
    ultimas = estado.get('ultimas_acoes', [])[:5]
    padroes = estado.get('padroes', [])[:3]

    hoje = datetime.now(FUSO_BR).strftime('%Y-%m-%d')
    qtd_hoje = sum(1 for a in ultimas if ts_to_local_date(a.get('timestamp')) == hoje)
    qtd_hoje = max(qtd_hoje, sum(1 for a in estado.get('ultimas_acoes', []) if ts_to_local_date(a.get('timestamp')) == hoje))


    linhas = [
        f'# Resumo de Evolução — {datetime.now().strftime("%d/%m/%Y %H:%M")}',
        '',
        f'**Streak:** {estado.get("streak", 0)} dia(s)  ',
        f'**Taxa geral:** {estado.get("taxa_geral", 0)}%  ',
        f'**Respondidas:** {estado.get("total_respondidas", 0)} ({estado.get("total_acertos", 0)} acertos)  ',
        f'**Questões únicas:** {estado.get("total_questoes_unicas", 0)}  ',
        f'**Respondidas hoje:** {qtd_hoje}',
        '',
    ]

    if rec:
        tipo = rec.get('tipo', 'fraco_recente')
        if tipo == 'pendentes_revisao':
            linhas.append('## 🔴 Recomendação do dia (prioridade: PENDENTES DE REVISÃO)')
            linhas.append(f'**{rec["materia"]} → {rec["assunto"]}**')
            linhas.append(f'Você tem **{rec["pendentes"]} pendente(s)** nesse assunto (de **{rec["total_pendentes"]} totais**).')
            for acao in rec.get('acoes', []):
                linhas.append(f'- {acao}')
            if rec.get('urgente'):
                linhas.append(f'')
                linhas.append(f'⏰ **Urgente:** {rec["urgente"]}')
        else:
            linhas.append('## Recomendação do dia')
            linhas.append(f'**{rec.get("materia", "?")} → {rec.get("assunto", "?")}** ({rec.get("taxa", "?")}% em {rec.get("total", "?")} tentativas)')
            for acao in rec.get('acoes', []):
                linhas.append(f'- {acao}')
        linhas.append('')

    if pendentes_total > 0:
        linhas.append(f'## 📋 Pendentes de revisão: {pendentes_total}')
        if resolvidos_24h > 0:
            linhas.append(f'✅ **{resolvidos_24h} resolvida(s) nas últimas 24h** — continue assim!')
        linhas.append('')
        if pendentes_por_mat:
            linhas.append('**Por matéria:**')
            for mat, qtd in list(pendentes_por_mat.items())[:8]:
                linhas.append(f'- {mat}: {qtd} pendente(s)')
            linhas.append('')
        if pendentes_antigas:
            linhas.append('**⏰ Pendentes há mais de 7 dias (urgentes):**')
            for p in pendentes_antigas[:5]:
                primeiro = (p.get('primeiro_erro_em') or '?')[:10]
                tentativas = p.get('tentativas', 1)
                linhas.append(f'- {p.get("materia", "?")} → {p.get("assunto", "?")} (desde {primeiro}, {tentativas}ª tentativa)')
            linhas.append('')

    if fracos_relevantes:
        linhas.append('## ⚠️ Assuntos fracos relevantes (≥5 tentativas, <70%)')
        linhas.append('| Matéria | Assunto | Taxa | Total |')
        linhas.append('|---|---|---|---|')
        for a in fracos_relevantes:
            linhas.append(f'| {a["materia"]} | {a["assunto"]} | {a["taxa"]}% | {a["total"]} |')
        linhas.append('')

    if padroes:
        linhas.append('## Padrões por banca+assunto')
        for p in padroes:
            linhas.append(f'- **{p["banca"]}** em {p["assunto"]}: {p["taxa"]}% em {p["total"]} questões')
        linhas.append('')

    if ultimas:
        linhas.append('## Últimas 5 ações')
        for a in ultimas:
            status = '✅' if a.get('acertou') else '❌'
            linhas.append(f'- {status} {a.get("materia", "?")} → {a.get("assunto", "?")} ({a.get("tempo", 0)}s)')
        linhas.append('')

    return '\n'.join(linhas) + '\n'

if __name__ == '__main__':
    main()
