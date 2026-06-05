"""
Estatísticas por matéria/assunto a partir do JSONL.
Uso: python scripts/agente_estatisticas.py [--jsonl ARQUIVO]
"""

import os
import sys
import json
from collections import defaultdict

JSONL_PATH = sys.argv[sys.argv.index('--jsonl') + 1] if '--jsonl' in sys.argv else \
    os.path.join(os.path.dirname(__file__), '..', 'hermes_events.jsonl')

def carregar_eventos():
    if not os.path.exists(JSONL_PATH):
        print(f'Arquivo não encontrado: {JSONL_PATH}')
        return []
    with open(JSONL_PATH, 'r') as f:
        return [json.loads(line) for line in f if line.strip()]

def main():
    eventos = carregar_eventos()
    if not eventos:
        print('Nenhum evento encontrado.')
        return

    respondidas = [e for e in eventos if e['tipo'] in ('responder_questao', 'revisar_questao')]
    print(f'Total de eventos: {len(eventos)}')
    print(f'Questões respondidas: {len(respondidas)}')
    print()

    # ── Por (matéria, assunto) ──────────────────────────────────────
    stats = defaultdict(lambda: {'total': 0, 'acertos': 0, 'tempo': 0, 'ids': set()})
    for e in respondidas:
        d = e['dados']
        chave = (d.get('materia') or 'Sem matéria', d.get('assunto') or 'Sem assunto')
        stats[chave]['total'] += 1
        if d.get('acertou'):
            stats[chave]['acertos'] += 1
        stats[chave]['tempo'] += d.get('tempo_segundos', 0)
        stats[chave]['ids'].add(d.get('questao_id'))

    print('=== DESEMPENHO POR ASSUNTO ===')
    print(f'{"Matéria":<30} {"Assunto":<35} {"Qtd":>5} {"Acertos":>7} {"%":>6} {"Tempo":>7}')
    print('-' * 90)

    for (mat, ass), s in sorted(stats.items(), key=lambda x: x[1]['acertos']/max(x[1]['total'],1)):
        pct = round(s['acertos'] / s['total'] * 100)
        tempo_medio = round(s['tempo'] / s['total'])
        dist = '⚠️' if pct < 60 else '✅'
        print(f'{mat:<30} {ass:<35} {s["total"]:>5} {s["acertos"]:>7} {pct:>5}% {tempo_medio:>5}s {dist}')

    print()
    print('=== TOP 5 ASSUNTOS MAIS FRACOS ===')
    fracos = [(k, v) for k, v in stats.items() if v['acertos']/max(v['total'],1) < 0.6]
    fracos.sort(key=lambda x: x[1]['acertos']/max(x[1]['total'],1))
    for (mat, ass), s in fracos[:5]:
        pct = round(s['acertos'] / s['total'] * 100)
        print(f'  {mat} → {ass}: {s["acertos"]}/{s["total"]} ({pct}%)')

    print()
    print('=== DISTRIBUIÇÃO POR MATÉRIA ===')
    por_materia = defaultdict(lambda: {'total': 0, 'acertos': 0, 'unicas': 0})
    for (mat, _), s in stats.items():
        por_materia[mat]['total'] += s['total']
        por_materia[mat]['acertos'] += s['acertos']
        por_materia[mat]['unicas'] += len(s['ids'])
    for mat, s in sorted(por_materia.items(), key=lambda x: -x[1]['total']):
        pct = round(s['acertos'] / s['total'] * 100) if s['total'] else 0
        dist = '⚠️' if pct < 60 else '✅'
        print(f'  {mat:<30} {s["total"]:>5} questões  {s["acertos"]:>4} acertos  {pct:>3}%  {s["unicas"]:>3} questões únicas  {dist}')

if __name__ == '__main__':
    main()
