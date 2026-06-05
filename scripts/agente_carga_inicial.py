"""
Carga inicial: busca histórico do Supabase e popula hermes_events.jsonl via relay.
Uso: python scripts/agente_carga_inicial.py [--relay URL]
"""

import os
import sys
import json
import re
import urllib.request
import urllib.error

RELAY_URL = sys.argv[sys.argv.index('--relay') + 1] if '--relay' in sys.argv else 'http://192.168.3.84:3333'
EVENTS_PATH = os.path.join(os.path.dirname(__file__), '..', 'hermes_events.jsonl')
ENV_FILE = os.path.join(os.path.dirname(__file__), '..', '.env.local')


def load_env():
    with open(ENV_FILE, 'r') as f:
        supabase_url = None
        anon_key = None
        for line in f:
            m = re.match(r'^VITE_SUPABASE_URL=(.+)$', line.strip())
            if m:
                supabase_url = m.group(1)
            m = re.match(r'^VITE_SUPABASE_ANON_KEY=(.+)$', line.strip())
            if m:
                anon_key = m.group(1)
    if not supabase_url or not anon_key:
        print('Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY necessários em .env.local')
        sys.exit(1)
    return supabase_url, anon_key


def supabase_get(url, anon_key, path):
    req = urllib.request.Request(f'{url}/rest/v1/{path}')
    req.add_header('apikey', anon_key)
    req.add_header('Authorization', f'Bearer {anon_key}')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


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


def post_event(event):
    data = json.dumps(event).encode('utf-8')
    req = urllib.request.Request(f'{RELAY_URL}/event', data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read())
    except urllib.error.URLError as e:
        print(f'  Erro ao enviar evento: {e}')
        return None


def main():
    supabase_url, anon_key = load_env()
    print(f'Conectando em {supabase_url}...')
    print(f'Relay: {RELAY_URL}')

    rows = supabase_get(supabase_url, anon_key,
        'historico_resolucoes'
        '?select=id,questao_id,alternativa,acertou,tempo_segundos,data_resolucao,'
        'questao:questao_id(id,materia,assunto,banca_texto,orgao,concurso,ano,enunciado,gabarito,alternativas)'
        '&order=data_resolucao.asc'
    )

    if not rows:
        print('Nenhum registro encontrado no histórico.')
        return

    sent = load_sent_keys(EVENTS_PATH)
    print(f'Eventos já presentes no JSONL: {len(sent)}')

    pendentes = [r for r in rows if r['id'] not in sent]
    print(f'Registros pendentes para enviar: {len(pendentes)} de {len(rows)}')

    total = len(pendentes)
    ok = 0
    for i, r in enumerate(pendentes, 1):
        q = r.get('questao') or {}
        alternativas = q.get('alternativas') or {}

        if isinstance(alternativas, str):
            try:
                alternativas = json.loads(alternativas)
            except json.JSONDecodeError:
                alternativas = {}

        event = {
            'id': f'carga_{r["id"]}',
            'tipo': 'responder_questao',
            'dados': {
                'questao_id': r['questao_id'],
                'questao_tec_id': q.get('questao_tec_id'),
                'materia': q.get('materia'),
                'assunto': q.get('assunto'),
                'banca_texto': q.get('banca_texto'),
                'orgao': q.get('orgao'),
                'concurso': q.get('concurso'),
                'ano': q.get('ano'),
                'gabarito': q.get('gabarito'),
                'alternativa_selecionada': r.get('alternativa'),
                'acertou': r.get('acertou', False),
                'tempo_segundos': r.get('tempo_segundos', 0),
                'enunciado': q.get('enunciado'),
                'alternativas': alternativas,
            },
            'timestamp': r.get('data_resolucao') or '',
        }

        result = post_event(event)
        if result and result.get('ok'):
            ok += 1
            if i % 20 == 0 or i == total:
                print(f'  [{i}/{total}] OK questao_id={r["questao_id"]} ({q.get("materia","?")})')
        else:
            print(f'  [{i}/{total}] FALHA questao_id={r["questao_id"]}')

    print(f'\nConcluído! {ok}/{total} eventos novos enviados para {RELAY_URL}')
    print(f'JSONL final: {EVENTS_PATH}')


if __name__ == '__main__':
    main()
