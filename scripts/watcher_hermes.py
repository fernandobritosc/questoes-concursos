"""
Watcher contínuo: monitora o relay, atualiza estatísticas em tempo real.
Uso: python scripts/watcher_hermes.py

Mantém estado_atual.json atualizado com:
  - estatísticas por assunto
  - padrões de erro por banca
  - últimas respostas
  - streak
  - recomendação do dia
"""

import os
import sys
import json
import time
import signal
from collections import defaultdict, deque
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.error import URLError

RELAY_URL = 'http://192.168.3.84:3333'
STATE_FILE = os.path.join(os.path.dirname(__file__), '..', 'estado_atual.json')
NOTIF_FILE = os.path.join(os.path.dirname(__file__), '..', 'notificacoes.json')
POLL_INTERVAL = 3
JANELA_RECOMENDACAO_DIAS = 7
JANELA_DEDUP_SEGUNDOS = 120

running = True

def signal_handler(sig, frame):
    global running
    running = False

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
        self.timeline_de = []
        self.timeline = []
        self.event_count = 0

    def _dedup_key(self, d):
        return (
            d.get('questao_tec_id') or d.get('questao_id') or d.get('materia'),
            d.get('materia'),
            d.get('assunto'),
        )

    def _parse_time(self, ts):
        if not ts:
            return None
        for fmt in ('%Y-%m-%dT%H:%M:%S.%f%z', '%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S'):
            try:
                return datetime.strptime(ts, fmt)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(ts)
        except ValueError:
            return datetime.fromisoformat(ts[:26])

    def ingest(self, eventos):
        for e in eventos:
            self.event_count += 1
            d = e.get('dados', {})
            mat = d.get('materia') or 'Sem matéria'
            ass = d.get('assunto') or 'Sem assunto'
            acertou = d.get('acertou', False)
            tempo = d.get('tempo_segundos', 0)
            ts = e.get('timestamp')

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
        cutoff = datetime.now() - timedelta(days=JANELA_RECOMENDACAO_DIAS)
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

        datas = sorted(set(e['timestamp'][:10] for e in self.timeline if e.get('timestamp')))
        streak = 0
        hoje = datetime.now().strftime('%Y-%m-%d')
        ontem = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        if datas and datas[-1] in (hoje, ontem):
            for i in range(len(datas)-1, -1, -1):
                esperada = (datetime.now() - timedelta(days=len(datas)-1-i)).strftime('%Y-%m-%d')
                if datas[i] == esperada:
                    streak += 1
                else:
                    break

        # Recomendação baseada em janela recente
        fracos_recentes = sorted(
            [a for a in assuntos if a['taxa'] < 70 and a['total'] >= 2],
            key=lambda x: x['taxa']
        )

        recomendacao = None
        if fracos_recentes:
            alvo = fracos_recentes[0]
            recomendacao = {
                'materia': alvo['materia'],
                'assunto': alvo['assunto'],
                'taxa': alvo['taxa'],
                'total': alvo['total'],
                'acoes': [
                    f'Revisar teoria de {alvo["materia"]} — {alvo["assunto"]}',
                    f'Fazer 5-10 questões focadas nesse tópico',
                ]
            }
            if len(fracos_recentes) > 1:
                recomendacao['proximo'] = f'{fracos_recentes[1]["materia"]} → {fracos_recentes[1]["assunto"]} ({fracos_recentes[1]["taxa"]}%)'

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
        if eventos:
            stats.ingest(eventos)
            ultimo = eventos[-1]
            stats.offset = ultimo.get('_offset', stats.offset)
            print(f'[{datetime.now().strftime("%H:%M:%S")}] +{len(eventos)} eventos '
                  f'(total: {stats.event_count})')

        estado = stats.calcular_estado()
        estado['_offset_relay'] = stats.offset

        with open(STATE_FILE + '.tmp', 'w') as f:
            json.dump(estado, f, ensure_ascii=False, indent=2)
        os.replace(STATE_FILE + '.tmp', STATE_FILE)

        # Gera notificações inteligentes (a cada 30s no máximo)
        now = time.time()
        if now - stats.ultimo_envio_notif > 30:
            notificacoes = gerar_notificacoes(stats, estado)
            if notificacoes or stats.notificacoes_ativas:
                stats.notificacoes_ativas = {n['id']: n for n in notificacoes}
                stats.ultimo_envio_notif = now
                with open(NOTIF_FILE + '.tmp', 'w') as f:
                    json.dump({'atualizado_em': datetime.now().isoformat(), 'notificacoes': notificacoes}, f, ensure_ascii=False, indent=2)
                os.replace(NOTIF_FILE + '.tmp', NOTIF_FILE)
                if notificacoes:
                    print(f'  🔔 {len(notificacoes)} notificação(ões)')

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

if __name__ == '__main__':
    main()
