"""Utilitários compartilhados para scripts Python do Hermes.

Centraliza:
- leitura de .env.local
- resolução da URL do relay
- credenciais do Supabase
- queries Supabase via REST (sem dependência da lib `supabase` Python)

Uso:
    from _hermes_env import load_config, get_supabase_credentials, supabase_get
"""

import os
import re
import json
import sys
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ENV_FILE = os.path.join(os.path.dirname(__file__), '..', '.env.local')
DEFAULT_RELAY_URL = 'http://127.0.0.1:3333'


def load_config():
    """Lê .env.local e retorna dict com todas as chaves encontradas."""
    if not os.path.exists(ENV_FILE):
        return {}
    config = {}
    with open(ENV_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            m = re.match(r'^([A-Z_][A-Z0-9_]*)=(.*)$', line)
            if m:
                config[m.group(1)] = m.group(2)
    return config


def resolve_relay_url(config=None):
    config = config if config is not None else load_config()
    return config.get('HERMES_RELAY_URL') or DEFAULT_RELAY_URL


def get_supabase_credentials(config=None, exit_on_missing=True):
    """Retorna (url, anon_key). Sai com erro se faltarem (a menos que exit_on_missing=False)."""
    config = config if config is not None else load_config()
    url = config.get('VITE_SUPABASE_URL') or config.get('SUPABASE_URL')
    key = config.get('VITE_SUPABASE_ANON_KEY') or config.get('SUPABASE_ANON_KEY')
    if (not url or not key) and exit_on_missing:
        print('Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY necessários em .env.local', file=sys.stderr)
        sys.exit(1)
    return url, key


import urllib.parse

def supabase_get(path, config=None, timeout=20):
    """Faz GET autenticado em {SUPABASE_URL}/rest/v1/{path} e retorna JSON parsed."""
    url, key = get_supabase_credentials(config)
    
    # Process path manually to safely quote parameter values without interpreting '+' as space
    if '?' in path:
        base_path, query = path.split('?', 1)
        params = []
        for param in query.split('&'):
            if '=' in param:
                k, v = param.split('=', 1)
                params.append(f"{k}={urllib.parse.quote(v)}")
            else:
                params.append(param)
        clean_path = base_path + '?' + '&'.join(params)
    else:
        clean_path = path
        
    req = Request(f'{url}/rest/v1/{clean_path}')
    req.add_header('apikey', key)
    req.add_header('Authorization', f'Bearer {key}')
    try:
        with urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        print(f"  [Supabase GET Error] {e.code}: {e.read().decode('utf-8', 'replace')}", file=sys.stderr)
        raise e


def supabase_post(path, body, config=None, timeout=20):
    """Faz POST autenticado em {SUPABASE_URL}/rest/v1/{path}."""
    url, key = get_supabase_credentials(config)
    
    if '?' in path:
        base_path, query = path.split('?', 1)
        params = []
        for param in query.split('&'):
            if '=' in param:
                k, v = param.split('=', 1)
                params.append(f"{k}={urllib.parse.quote(v)}")
            else:
                params.append(param)
        clean_path = base_path + '?' + '&'.join(params)
    else:
        clean_path = path
        
    data = json.dumps(body).encode('utf-8')
    req = Request(f'{url}/rest/v1/{clean_path}', data=data, method='POST')
    req.add_header('apikey', key)
    req.add_header('Authorization', f'Bearer {key}')
    req.add_header('Content-Type', 'application/json')
    try:
        with urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except HTTPError as e:
        print(f'  Erro Supabase POST: {e.code} {e.read().decode("utf-8", "replace")[:200]}', file=sys.stderr)
        return None
    except URLError as e:
        print(f'  Erro de conexão: {e}', file=sys.stderr)
        return None


from datetime import datetime, timedelta, timezone
try:
    from zoneinfo import ZoneInfo
    FUSO_BR = ZoneInfo("America/Sao_Paulo")
except ImportError:
    FUSO_BR = timezone(-timedelta(hours=3), "BRT")


def ts_to_local_date(ts):
    """Converte um timestamp UTC ISO-8601 para a string de data YYYY-MM-DD local de Brasília."""
    if not ts:
        return ""
    try:
        # standardizes 'Z' to UTC offset representation
        clean_ts = ts.replace('Z', '+00:00')
        # Handle trailing fractional seconds mismatch if any
        if '.' in clean_ts:
            parts = clean_ts.split('.')
            time_part, tz_part = parts[0], parts[1]
            # Keep only first 6 digits of microsecond to avoid parse error
            tz_idx = -1
            for idx, char in enumerate(tz_part):
                if char in ('+', '-'):
                    tz_idx = idx
                    break
            if tz_idx != -1:
                tz_val = tz_part[tz_idx:]
                micro_val = tz_part[:tz_idx][:6]
                clean_ts = f"{time_part}.{micro_val}{tz_val}"
        
        dt = datetime.fromisoformat(clean_ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(FUSO_BR).strftime('%Y-%m-%d')
    except Exception:
        # Fallback to simple slice if parsing fails
        return ts[:10]



