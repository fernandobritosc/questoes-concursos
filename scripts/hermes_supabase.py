"""Script auxiliar para o Hermes consultar o Supabase direto.

Uso no WSL:
  python3 /mnt/c/Programação/questoes-concursos/scripts/hermes_supabase.py

Ou importar num script maior:
  from _hermes_env import supabase_get
"""

import os
import sys
import json
from datetime import datetime, timedelta, timezone
try:
    from zoneinfo import ZoneInfo
    FUSO_BR = ZoneInfo("America/Sao_Paulo")
except ImportError:
    FUSO_BR = timezone(-timedelta(hours=3), "BRT")

sys.path.insert(0, os.path.dirname(__file__))
from _hermes_env import load_config, get_supabase_credentials, supabase_get


def get_today_questions(data=None, config=None):
    if data:
        start = datetime.fromisoformat(data).replace(tzinfo=timezone.utc)
    else:
        agora = datetime.now(FUSO_BR)
        start = agora.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    end = start + timedelta(days=1)

    rows = supabase_get(
        f'historico_resolucoes?select=*'
        f'&data_resolucao=gte.{start.isoformat()}'
        f'&data_resolucao=lt.{end.isoformat()}',
        config,
    )
    return rows or []


def get_questoes_details(questoes_ids, config=None):
    if not questoes_ids:
        return {}
    questoes_map = {}
    for i in range(0, len(questoes_ids), 1000):
        batch = questoes_ids[i:i+1000]
        ids_csv = ','.join(str(q) for q in batch)
        rows = supabase_get(
            f'questoes?select=id,materia,assunto,gabarito&id=in.({ids_csv})',
            config,
        ) or []
        for q in rows:
            questoes_map[q['id']] = q
    return questoes_map


if __name__ == '__main__':
    config = load_config()
    hoje_br = datetime.now(FUSO_BR).strftime('%d/%m/%Y')
    hist = get_today_questions(config=config)
    print(f'=== Questões de {hoje_br} (horário de Brasília) ===')
    print(f'Total: {len(hist)}')
    if hist:
        ids = [h['questao_id'] for h in hist]
        qmap = get_questoes_details(ids, config=config)
        acertos = sum(1 for h in hist if h.get('acertou'))
        erros = len(hist) - acertos
        for h in hist:
            q = qmap.get(h['questao_id'], {})
            status = '✅' if h.get('acertou') else '❌'
            tempo = h.get('tempo_gasto', '?')
            print(f'  {status} {q.get("materia","?")} | {tempo}s')
        print(f'\nResumo: {acertos} certas | {erros} erradas | {round(acertos/len(hist)*100,1)}%')
    else:
        print('Nenhuma questão registrada hoje.')
