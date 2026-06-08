"""
Relatório diário: resume o dia de estudo anterior.
Uso: python scripts/relatorio_diario.py

Saída: /home/uniao/questoes/relatorio_diario.md
"""

import os, json, collections
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))
from _hermes_env import FUSO_BR, ts_to_local_date

JSONL = os.path.join(os.path.dirname(__file__), '..', 'hermes_events.jsonl')
OUT = os.path.join(os.path.dirname(__file__), '..', 'relatorio_diario.md')

def parse_dt(ts):
    if not ts:
        return None
    for fmt in ('%Y-%m-%dT%H:%M:%S.%f%z', '%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S'):
        try:
            return datetime.strptime(ts, fmt).astimezone(timezone.utc)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(ts).astimezone(timezone.utc)
    except ValueError:
        try:
            return datetime.fromisoformat(ts[:26]).astimezone(timezone.utc)
        except Exception:
            return None

hoje = datetime.now(FUSO_BR).date()
ontem = hoje - timedelta(days=1)
ontem_str = ontem.strftime('%Y-%m-%d')

eventos = []
with open(JSONL, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        
        ts = ev.get('timestamp')
        if not ts:
            continue
            
        if ts_to_local_date(ts) != ontem_str:
            continue
            
        dt = parse_dt(ts)
        if dt is None:
            continue
            
        dt_local = dt.astimezone(FUSO_BR)
        eventos.append((dt_local, ev))

eventos.sort()

por_assunto = collections.defaultdict(lambda: {'total': 0, 'acertos': 0, 'tempo': 0, 'erros': []})
por_banca = collections.defaultdict(lambda: {'total': 0, 'acertos': 0})
repeticoes = collections.defaultdict(list)
ultimas = []

for dt, ev in eventos:
    d = ev.get('dados', {})
    mat = d.get('materia') or 'Sem matéria'
    ass = d.get('assunto') or 'Sem assunto'
    banca = d.get('banca_texto') or 'Sem banca'
    acertou = d.get('acertou', False)
    tempo = d.get('tempo_segundos') or 0
    tid = d.get('questao_tec_id')
    qid = d.get('questao_id')

    s = por_assunto[(mat, ass)]
    s['total'] += 1
    s['tempo'] += tempo
    if acertou:
        s['acertos'] += 1
    else:
        s['erros'].append({
            'banca': banca,
            'gabarito': d.get('gabarito'),
            'marcou': d.get('alternativa_selecionada'),
        })

    b = por_banca[banca]
    b['total'] += 1
    if acertou:
        b['acertos'] += 1

    if tid:
        repeticoes[tid].append({
            'materia': mat, 'assunto': ass,
            'acertou': acertou, 'tempo': tempo
        })

    ultimas.append({
        'hora': dt.strftime('%H:%M'),
        'materia': mat, 'assunto': ass,
        'acertou': acertou, 'tempo': tempo, 'banca': banca
    })

total = sum(s['total'] for s in por_assunto.values())
acertos = sum(s['acertos'] for s in por_assunto.values())
taxa = round(acertos / total * 100) if total else 0
tempo_total = sum(s['tempo'] for s in por_assunto.values())

linhas_assunto = []
for (mat, ass), s in por_assunto.items():
    t = round(s['acertos'] / s['total'] * 100) if s['total'] else 0
    nivel = '🔴' if t < 60 else ('🟡' if t < 80 else '🟢')
    linhas_assunto.append((mat, ass, s['total'], t, round(s['tempo'] / s['total']) if s['total'] else 0, nivel))
linhas_assunto.sort(key=lambda x: x[3])

bancas_ord = []
for banca, s in por_banca.items():
    t = round(s['acertos'] / s['total'] * 100) if s['total'] else 0
    bancas_ord.append((banca, s['total'], t))
bancas_ord.sort(key=lambda x: x[2])

# ids repetidos ontem
reps_ontem = [(tid, evts) for tid, evts in repeticoes.items() if len(evts) >= 2]

top_erros = []
for (mat, ass), s in por_assunto.items():
    for i, err in enumerate(s['erros'][:3]):
        top_erros.append((mat, ass, err['banca'], err['gabarito'], err['marcou']))

# Pegadinhas = banca+assunto com pelo menos 2 erros
pegadinhas = collections.Counter()
pegadinhas_detalhe = {}
for mat, ass, banca, gab, marc in top_erros:
    chave = (banca, ass)
    pegadinhas[chave] += 1
    pegadinhas_detalhe[chave] = {
        'materia': mat, 'assunto': ass, 'banca': banca,
        'gabarito': gab, 'marcou': marc
    }

# Melhores assuntos do dia
melhores = [x for x in linhas_assunto if x[5] == '🟢']
piores = [x for x in linhas_assunto if x[5] == '🔴']
alertas = [x for x in linhas_assunto if x[5] == '🟡']

texto = []
texto.append(f"# 📋 Relatório Diário — {ontem.strftime('%d/%m/%Y')}")
texto.append("")
texto.append(f"Questões respondidas: **{total}**")
texto.append(f"Acertos: **{acertos}**")
texto.append(f"Taxa do dia: **{taxa}%**")
texto.append(f"Tempo total: **{tempo_total}s** (~{round(tempo_total/60)}min)")
texto.append("")
if melhores:
    texto.append("## 🟢 Pontos fortes do dia")
    for mat, ass, qtd, t, tmed, _ in melhores:
        texto.append(f"- {mat} — {ass}: {qtd}x ({t}%)")
    texto.append("")

if alertas:
    texto.append("## 🟡 Atenção")
    for mat, ass, qtd, t, tmed, _ in alertas:
        texto.append(f"- {mat} — {ass}: {qtd}x ({t}%)")
    texto.append("")

if piores:
    texto.append("## 🔴 Críticos do dia")
    for mat, ass, qtd, t, tmed, _ in piores:
        texto.append(f"- {mat} — {ass}: {qtd}x ({t}%)")
    texto.append("")

if bancas_ord:
    texto.append("## 🏢 Por banca")
    for banca, qtd, t in bancas_ord:
        texto.append(f"- {banca}: {qtd}x ({t}%)")
    texto.append("")

if reps_ontem:
    texto.append("## 🔄 Questões repetidas ontem")
    for tid, evts in sorted(reps_ontem, key=lambda x: -len(x[1]))[:5]:
        ac = sum(1 for x in evts if x['acertou'])
        txt = f"- {evts[0]['materia']} — {evts[0]['assunto']}: {len(evts)}x ({round(ac/len(evts)*100)}%)"
        texto.append(txt)
    texto.append("")

if pegadinhas:
    texto.append("## ⚠️ Possíveis pegadinhas (mesmo assunto + banca com erro repetido)")
    for (banca, ass), qtd in pegadinhas.most_common(5):
        det = pegadinhas_detalhe[(banca, ass)]
        texto.append(f"- {det['materia']} — {ass} ({banca}): {qtd}x erro — gabarito certo: {det['gabarito']}, você marcou: {det['marcou']}")
    texto.append("")

if ultimas:
    texto.append("## 🕒 Últimas ações")
    for u in ultimas[-8:]:
        status = "✅" if u['acertou'] else "❌"
        texto.append(f"- {u['hora']} {status} {u['materia']} — {u['assunto']} ({u['banca']})")
    texto.append("")

texto.append("---")
texto.append(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}")

with open(OUT, 'w') as f:
    f.write('\n'.join(texto))

print(OUT)
