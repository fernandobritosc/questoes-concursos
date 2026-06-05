"""
Mentor diário: analisa desempenho e sugere o que revisar hoje.
Uso: python scripts/agente_mentor.py
"""

import os
import sys
import json
from collections import defaultdict
from datetime import datetime, timedelta

JSONL_PATH = os.path.join(os.path.dirname(__file__), '..', 'hermes_events.jsonl')

def carregar_eventos():
    if not os.path.exists(JSONL_PATH):
        return []
    with open(JSONL_PATH, 'r') as f:
        return [json.loads(line) for line in f if line.strip()]

def main():
    eventos = carregar_eventos()
    respondidas = [e for e in eventos if e['tipo'] in ('responder_questao', 'revisar_questao')]

    if not respondidas:
        print('📭 Nenhuma questão respondida ainda. Comece a estudar!')
        return

    hoje = datetime.now()
    stats_assunto = defaultdict(lambda: {'total': 0, 'acertos': 0, 'tempo': 0, 'ultima': None})
    stats_banca = defaultdict(lambda: {'total': 0, 'acertos': 0})

    for e in respondidas:
        d = e['dados']
        mat = d.get('materia') or 'Sem matéria'
        ass = d.get('assunto') or 'Sem assunto'
        chave = (mat, ass)
        s = stats_assunto[chave]
        s['total'] += 1
        if d.get('acertou'):
            s['acertos'] += 1
        s['tempo'] += d.get('tempo_segundos', 0)
        data = e.get('timestamp') or ''
        if data and (not s['ultima'] or data > s['ultima']):
            s['ultima'] = data

        banca = d.get('banca_texto') or 'Sem banca'
        stats_banca[banca]['total'] += 1
        if d.get('acertou'):
            stats_banca[banca]['acertos'] += 1

    # ── Assuntos fracos (prioridade) ─────────────────────────────────
    fracos = []
    for (mat, ass), s in stats_assunto.items():
        pct = round(s['acertos'] / s['total'] * 100)
        tempo_medio = round(s['tempo'] / s['total'])
        if s['total'] >= 2 and pct < 70:
            fracos.append((mat, ass, pct, s['total'], tempo_medio))

    fracos.sort(key=lambda x: x[2])

    # ── Assuntos fortes ──────────────────────────────────────────────
    fortes = []
    for (mat, ass), s in stats_assunto.items():
        pct = round(s['acertos'] / s['total'] * 100)
        if s['total'] >= 2 and pct >= 80:
            fortes.append((mat, ass, pct, s['total']))

    print('╔══════════════════════════════════════════════════╗')
    print('║         🤖 HERMES — MENTOR DE ESTUDOS          ║')
    print('╚══════════════════════════════════════════════════╝')
    print()

    # ── Resumo geral ────────────────────────────────────────────────
    total_questoes = sum(s['total'] for s in stats_assunto.values())
    total_acertos = sum(s['acertos'] for s in stats_assunto.values())
    taxa_geral = round(total_acertos / total_questoes * 100)
    print(f'📊  Geral: {total_questoes} questões | {total_acertos} acertos | {taxa_geral}%')
    print(f'📚  {len(stats_assunto)} assuntos diferentes')
    print(f'🏛️   {len(stats_banca)} bancas')
    print()

    # ── Assuntos fracos ─────────────────────────────────────────────
    if fracos:
        print('🔴  ASSUNTOS QUE PRECISAM DE REVISÃO')
        print('─' * 50)
        for mat, ass, pct, qtd, tempo in fracos[:7]:
            nivel = '🔥 Crítico' if pct < 40 else '⚠️ Atenção'
            print(f'  {nivel}  {mat} → {ass}')
            print(f'       {qtd} questões · {pct}% acerto · ~{tempo}s por resposta')
            print()
    else:
        print('✅ Nenhum assunto crítico encontrado!')
        print()

    # ── Bancas com menor rendimento ─────────────────────────────────
    print('🏛️  BANCAS COM PIOR APROVEITAMENTO')
    print('─' * 50)
    bancas_ord = sorted(stats_banca.items(), key=lambda x: x[1]['acertos']/max(x[1]['total'],1))
    for banca, s in bancas_ord[:3]:
        if s['total'] >= 2:
            pct = round(s['acertos'] / s['total'] * 100)
            print(f'  {banca:<20}  {s["acertos"]}/{s["total"]} ({pct}%)')

    print()

    # ── Recomendação do dia ─────────────────────────────────────────
    print('🎯  RECOMENDAÇÃO DO DIA')
    print('─' * 50)
    if fracos:
        alvo = fracos[0]
        mat, ass, pct, qtd, tempo = alvo
        print(f'  Revisar: {mat} → {ass}')
        print(f'  Desempenho: {pct}% ({qtd} questões)')
        print()
        print(f'  Sugestão:')
        print(f'    1. Reveja a teoria deste tópico')
        print(f'    2. Faça 5 a 10 questões focadas só nele')
        print(f'    3. Anote os padrões de erro')
        if len(fracos) > 1:
            print(f'  Próximo: {fracos[1][0]} → {fracos[1][1]} ({fracos[1][2]}%)')
        print()
        if fortes:
            print(f'  💪 Não esqueça de revisar também os fortes:')
            for mat_f, ass_f, pct_f, _ in fortes[:2]:
                print(f'     ✅ {mat_f} → {ass_f} ({pct_f}%)')
    else:
        print('  Continue assim! Seu desempenho está bom.')
        qtd_hoje = sum(1 for e in respondidas
                       if e.get('timestamp','').startswith(hoje.strftime('%Y-%m-%d')))
        print(f'  Hoje: {qtd_hoje} questões respondidas.')
    print()

    # ── Streak ───────────────────────────────────────────────────────
    datas = sorted(set(e.get('timestamp','')[:10] for e in respondidas if e.get('timestamp')))
    streak = 0
    for i in range(len(datas)-1, -1, -1):
        esperada = (hoje - timedelta(days=len(datas)-1-i)).strftime('%Y-%m-%d')
        if datas[i] == esperada:
            streak += 1
        else:
            break
    print(f'🔥  Streak atual: {streak} dias consecutivos de estudo')
    print(f'📅  Última atualização: {hoje.strftime("%d/%m/%Y %H:%M")}')

if __name__ == '__main__':
    main()
