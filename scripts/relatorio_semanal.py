import json, collections, os
from datetime import datetime, timedelta, timezone

JSONL = os.path.join(os.path.dirname(__file__), '..', 'hermes_events.jsonl')
OUT = os.path.join(os.path.dirname(__file__), '..', 'relatorio_semanal.md')
cutoff = datetime.now(timezone.utc) - timedelta(days=7)

semana = []
with open(JSONL) as f:
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
        dt = None
        for fmt in ('%Y-%m-%dT%H:%M:%S.%f%z', '%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S'):
            try:
                dt = datetime.strptime(ts, fmt).astimezone(timezone.utc)
                break
            except ValueError:
                continue
        if dt is None:
            try:
                dt = datetime.fromisoformat(ts).astimezone(timezone.utc)
            except ValueError:
                dt = datetime.fromisoformat(ts[:26]).astimezone(timezone.utc)
        if dt < cutoff:
            continue
        d = ev.get('dados', {})
        semana.append({
            'dt': dt,
            'materia': d.get('materia') or 'Sem matéria',
            'assunto': d.get('assunto') or 'Sem assunto',
            'acertou': d.get('acertou'),
            'tempo': d.get('tempo_segundos') or 0,
            'banca': d.get('banca_texto'),
        })

por_assunto = collections.defaultdict(lambda: {'total': 0, 'acertos': 0, 'tempo': 0})
for r in semana:
    key = (r['materia'], r['assunto'])
    por_assunto[key]['total'] += 1
    if r.get('acertou'):
        por_assunto[key]['acertos'] += 1
    por_assunto[key]['tempo'] += r['tempo']

total = sum(s['total'] for s in por_assunto.values())
acertos = sum(s['acertos'] for s in por_assunto.values())
taxa = round(acertos / total * 100) if total else 0

linhas = []
for (mat, ass), s in por_assunto.items():
    t = round(s['acertos'] / s['total'] * 100) if s['total'] else 0
    linhas.append((mat, ass, s['total'], t, round(s['tempo'] / s['total'])))
linhas.sort(key=lambda x: (x[0], x[1]))

semanas_ord = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
hoje = datetime.now()
inicio = hoje - timedelta(days=7)
ini_f = f"{semanas_ord[inicio.weekday()]}, {inicio.strftime('%d/%m/%Y')}"
fim_f = f"{semanas_ord[hoje.weekday()]}, {hoje.strftime('%d/%m/%Y')}"

lines = [
    f"# Relatório Semanal de Questões",
    f"",
    f"Período: {ini_f} → {fim_f}",
    f"",
    f"Total de questões: **{total}**",
    f"Acertos: **{acertos}**",
    f"Taxa geral: **{taxa}%**",
    f"",
    f"## Por assunto",
    f"",
]
for mat, ass, qtd, t, tempo in linhas:
    nivel = '🔴' if t < 60 else ('🟡' if t < 80 else '🟢')
    lines.append(f"- {nivel} **{mat}** — {ass}: {qtd}x ({t}%) | tempo médio {tempo}s")

lines += ["", "Gerado em: " + datetime.now().strftime("%d/%m/%Y %H:%M")]

with open(OUT, 'w') as f:
    f.write('\n'.join(lines))

print(OUT)
