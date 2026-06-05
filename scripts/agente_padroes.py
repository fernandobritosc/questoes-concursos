"""
Detecta padrões: pegadinhas recorrentes por banca, assuntos que mais erra, etc.
Uso: python scripts/agente_padroes.py [--jsonl ARQUIVO]
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
    respondidas = [e for e in eventos if e['tipo'] in ('responder_questao', 'revisar_questao')]
    if not respondidas:
        print('Nenhuma questão respondida encontrada.')
        return

    # ── 1. Banca + assunto com pior aproveitamento ──────────────────
    banca_assunto = defaultdict(lambda: {'total': 0, 'acertos': 0})
    for e in respondidas:
        d = e['dados']
        banca = d.get('banca_texto') or 'Sem banca'
        assunto = d.get('assunto') or 'Sem assunto'
        chave = f'{banca} | {assunto}'
        banca_assunto[chave]['total'] += 1
        if d.get('acertou'):
            banca_assunto[chave]['acertos'] += 1

    print('=== PADRÕES DE ERRO POR BANCA + ASSUNTO ===')
    print('(Bancas/assuntos com >= 2 tentativas e < 60% de acerto)')
    print()
    ruins = [(k, v) for k, v in banca_assunto.items()
             if v['total'] >= 2 and v['acertos']/v['total'] < 0.6]
    ruins.sort(key=lambda x: x[1]['acertos']/max(x[1]['total'],1))

    for chave, s in ruins[:10]:
        banca, assunto = chave.split(' | ', 1)
        pct = round(s['acertos'] / s['total'] * 100)
        print(f'  ⚠️  {banca:<20} {assunto:<35}  {s["acertos"]}/{s["total"]} ({pct}%)')

    if not ruins:
        print('  Nenhum padrão crítico encontrado. 👏')

    # ── 2. Questões repetidas (mesmo questao_tec_id) ────────────────
    print()
    print('=== QUESTÕES REPETIDAS (mesmo ID TEC) ===')
    repeticoes = defaultdict(list)
    for e in respondidas:
        tid = e['dados'].get('questao_tec_id')
        if tid:
            repeticoes[tid].append(e)

    rep_count = 0
    for tid, evts in sorted(repeticoes.items(), key=lambda x: -len(x[1])):
        if len(evts) >= 2:
            materia = evts[0]['dados'].get('materia') or '?'
            assunto = evts[0]['dados'].get('assunto') or '?'
            acertos = sum(1 for e in evts if e['dados'].get('acertou'))
            pct = round(acertos / len(evts) * 100)
            print(f'  ID {tid:<8} {materia:<20} {assunto:<30}  {len(evts)}x  {acertos}/{len(evts)} ({pct}%)')
            rep_count += 1

    if not rep_count:
        print('  Nenhuma questão repetida encontrada.')

    # ── 3. Erro mais recente por assunto ────────────────────────────
    print()
    print('=== ÚLTIMAS RESPOSTAS (últimas 10) ===')
    for e in respondidas[-10:]:
        d = e['dados']
        status = '✅' if d.get('acertou') else '❌'
        print(f'  {status} {d.get("materia","?"):<20} {d.get("assunto","?"):<30} '
              f'gabarito={d.get("gabarito")} marcou={d.get("alternativa_selecionada")} '
              f'({d.get("tempo_segundos",0)}s)')

if __name__ == '__main__':
    main()
