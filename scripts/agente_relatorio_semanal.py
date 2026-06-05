"""
Relatório semanal de desempenho.
Uso: python scripts/agente_relatorio_semanal.py
"""

import os
import sys
import json
from collections import defaultdict
from datetime import datetime, timedelta

JSONL_PATH = os.path.join(os.path.dirname(__file__), '..', 'hermes_events.jsonl')

def carregar_eventos():
    if not os.path.exists(JSONL_PATH):
        print('Nenhum evento encontrado.')
        return []
    with open(JSONL_PATH, 'r') as f:
        return [json.loads(line) for line in f if line.strip()]

def main():
    eventos = carregar_eventos()
    respondidas = [e for e in eventos if e['tipo'] in ('responder_questao', 'revisar_questao')]
    if not respondidas:
        print('Nenhuma questão respondida.')
        return

    hoje = datetime.now()
    inicio_semana = hoje - timedelta(days=7)
    fim_semana_passada = inicio_semana
    inicio_semana_passada = fim_semana_passada - timedelta(days=7)

    def filtro_semana(e, inicio, fim):
        ts = e.get('timestamp', '')
        if not ts: return False
        try:
            d = datetime.fromisoformat(ts[:10])
            return inicio <= d < fim
        except: return False

    semana = [e for e in respondidas if filtro_semana(e, inicio_semana, hoje)]
    passada = [e for e in respondidas if filtro_semana(e, inicio_semana_passada, fim_semana_passada)]

    total_semana = len(semana)
    total_passada = len(passada)

    def calc_stats(lista):
        if not lista: return {'total': 0, 'acertos': 0, 'taxa': 0, 'tempo': 0}
        acertos = sum(1 for e in lista if e['dados'].get('acertou'))
        tempo = sum(e['dados'].get('tempo_segundos', 0) for e in lista)
        return {
            'total': len(lista),
            'acertos': acertos,
            'taxa': round(acertos / len(lista) * 100) if lista else 0,
            'tempo': round(tempo / len(lista)) if lista else 0,
        }

    stats_semana = calc_stats(semana)
    stats_passada = calc_stats(passada)

    print('╔══════════════════════════════════════════════════╗')
    print('║     📊 RELATÓRIO SEMANAL — HERMES MENTOR       ║')
    print('╚══════════════════════════════════════════════════╝')
    print()
    print(f'Período: {inicio_semana.strftime("%d/%m/%Y")} — {hoje.strftime("%d/%m/%Y")}')
    print()

    # ── Resumo ──────────────────────────────────────────────
    print('📈 RESUMO GERAL')
    print('─' * 50)
    print(f'  Questões na semana:  {stats_semana["total"]}')
    print(f'  Acertos:             {stats_semana["acertos"]}')
    print(f'  Taxa:                {stats_semana["taxa"]}%')
    print(f'  Tempo médio:         ~{stats_semana["tempo"]}s por questão')

    if total_passada > 0:
        var_taxa = stats_semana['taxa'] - stats_passada['taxa']
        var_qtd = stats_semana['total'] - stats_passada['total']
        sinal_taxa = '+' if var_taxa > 0 else ''
        sinal_qtd = '+' if var_qtd > 0 else ''
        print(f'  vs semana passada:   {sinal_qtd}{var_qtd} questões  |  {sinal_taxa}{var_taxa}pp')
        print()
        if var_taxa > 5:
            print('  🟢 Evolução positiva! Continue assim.')
        elif var_taxa < -5:
            print('  🔴 Atenção: desempenho caiu em relação à semana passada.')
        else:
            print('  🟡 Desempenho estável em relação à semana passada.')
    print()

    # ── Por assunto (semana) ────────────────────────────────
    if semana:
        por_assunto = defaultdict(lambda: {'total': 0, 'acertos': 0})
        for e in semana:
            d = e['dados']
            chave = (d.get('materia','?'), d.get('assunto','?'))
            por_assunto[chave]['total'] += 1
            if d.get('acertou'):
                por_assunto[chave]['acertos'] += 1

        print('📚 DESEMPENHO POR ASSUNTO (SEMANA)')
        print('─' * 50)
        for (mat, ass), s in sorted(por_assunto.items(), key=lambda x: x[1]['acertos']/max(x[1]['total'],1)):
            pct = round(s['acertos'] / s['total'] * 100)
            dist = '🔴' if pct < 40 else ('🟡' if pct < 70 else '🟢')
            print(f'  {dist} {mat:<20} {ass:<30}  {s["acertos"]}/{s["total"]} ({pct}%)')
        print()

    # ── Dia mais produtivo ──────────────────────────────────
    if semana:
        por_dia = defaultdict(int)
        for e in semana:
            dia = e.get('timestamp','')[:10]
            if dia: por_dia[dia] += 1
        melhor_dia = max(por_dia, key=por_dia.get) if por_dia else ''
        if melhor_dia:
            data = datetime.fromisoformat(melhor_dia).strftime('%d/%m/%Y')
            print(f'🏆 Dia mais produtivo: {data} ({por_dia[melhor_dia]} questões)')
        print()

    # ── Ranking de assuntos fracos ──────────────────────────
    todos = defaultdict(lambda: {'total': 0, 'acertos': 0, 'erros_recentes': []})
    for e in respondidas:
        d = e['dados']
        chave = (d.get('materia','?'), d.get('assunto','?'))
        s = todos[chave]
        s['total'] += 1
        if d.get('acertou'):
            s['acertos'] += 1
        else:
            s['erros_recentes'].append(e.get('timestamp','')[:10])

    print('🎯 TOP 5 ASSUNTOS PARA REVISAR')
    print('─' * 50)
    ranking = [(k, v) for k, v in todos.items()
               if v['total'] >= 2 and v['acertos']/max(v['total'],1) < 0.7]
    ranking.sort(key=lambda x: x[1]['acertos']/max(x[1]['total'],1))

    if ranking:
        for (mat, ass), s in ranking[:5]:
            pct = round(s['acertos'] / s['total'] * 100)
            ult_erro = max(s['erros_recentes']) if s['erros_recentes'] else 'nunca'
            print(f'  {mat:<20} {ass:<30}  {pct}%  (último erro: {ult_erro})')
    else:
        print('  Nenhum assunto crítico! 🎉')
    print()

    # ── Meta para próxima semana ────────────────────────────
    print('🎯 META PARA PRÓXIMA SEMANA')
    print('─' * 50)
    if ranking:
        alvo = ranking[0]
        print(f'  Foco principal: {alvo[0][0]} — {alvo[0][1]} ({alvo[1]["acertos"]}/{alvo[1]["total"]} = {round(alvo[1]["acertos"]/alvo[1]["total"]*100)}%)')
        print(f'  Meta: resolver pelo menos 10 questões desse tópico')
    else:
        print(f'  Manter o ritmo! Tente fazer pelo menos {max(10, stats_semana["total"])} questões na semana.')
    print()
    print(f'📅 Relatório gerado em {hoje.strftime("%d/%m/%Y %H:%M")}')

if __name__ == '__main__':
    main()
