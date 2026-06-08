"""
Carga inicial: busca histórico do Supabase e popula hermes_events.jsonl via relay.
Uso: python scripts/agente_carga_inicial.py [--relay URL]
"""

import os
import sys
import json
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(__file__))
from _hermes_env import load_config, resolve_relay_url, get_supabase_credentials, supabase_get

EVENTS_PATH = os.path.join(os.path.dirname(__file__), '..', 'hermes_events.jsonl')


def load_sent_keys(path):
    keys = set()
    if not os.path.exists(path):
        return keys
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            key = obj.get('id') or obj.get('dados', {}).get('questao_id')
            if key is not None:
                keys.add(key)
    return keys


def post_event(event, events_path):
    try:
        # Pega o tamanho atual do arquivo para simular o _offset que o relay criaria
        offset = os.path.getsize(events_path) if os.path.exists(events_path) else 0
        event['_offset'] = offset
        
        with open(events_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(event, ensure_ascii=False) + '\n')
        return {'ok': True}
    except Exception as e:
        print(f'  Erro ao salvar evento localmente: {e}')
        return None


def main():
    config = load_config()
    supabase_url, _ = get_supabase_credentials(config)
    relay_url = resolve_relay_url(config)
    print(f'Conectando em {supabase_url}...')
    print(f'Relay: {relay_url}')

    rows = supabase_get(
        'historico_resolucoes'
        '?select=id,questao_id,alternativa,acertou,tempo_segundos,data_resolucao,'
        'questao:questao_id(id,questao_tec_id,materia,assunto,banca_texto,gabarito)'
        '&order=data_resolucao.asc',
        config,
    )

    if not rows:
        print('Nenhum registro encontrado no histórico.')
        return

    sent = load_sent_keys(EVENTS_PATH)
    sent_ids = {int(k.replace('carga_', '')) for k in sent if isinstance(k, str) and k.startswith('carga_')}
    print(f'Eventos já presentes no JSONL: {len(sent_ids)}')

    pendentes = [r for r in rows if r['id'] not in sent_ids]
    print(f'Registros pendentes para enviar: {len(pendentes)} de {len(rows)}')

    total = len(pendentes)
    ok = 0
    for i, r in enumerate(pendentes, 1):
        q = r.get('questao') or {}

        event = {
            'id': f'carga_{r["id"]}',
            'tipo': 'responder_questao',
            'dados': {
                'questao_id': r['questao_id'],
                'questao_tec_id': q.get('questao_tec_id'),
                'materia': q.get('materia'),
                'assunto': q.get('assunto'),
                'banca_texto': q.get('banca_texto'),
                'gabarito': q.get('gabarito'),
                'alternativa_selecionada': r.get('alternativa'),
                'acertou': r.get('acertou', False),
                'tempo_segundos': r.get('tempo_segundos', 0),
            },
            'timestamp': r.get('data_resolucao') or '',
        }

        result = post_event(event, EVENTS_PATH)
        if result and result.get('ok'):
            ok += 1
            if i % 20 == 0 or i == total:
                print(f'  [{i}/{total}] OK questao_id={r["questao_id"]} ({q.get("materia","?")})')
        else:
            print(f'  [{i}/{total}] FALHA questao_id={r["questao_id"]}')

    print(f'\nConcluído! {ok}/{total} eventos novos gravados localmente em {EVENTS_PATH}')


if __name__ == '__main__':
    main()
