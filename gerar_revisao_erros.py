#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera guia de revisão de erros por data.
Uso:
    python gerar_revisao_erros.py              # usa dia atual no Supabase
    python gerar_revisao_erros.py 2026-06-05  # usa data informada

Saída: revisao_erros_YYYY-MM-DD.md em C:\\Programação\\questoes-concursos\\
"""
import os, sys
from datetime import datetime, timedelta
from collections import defaultdict
from pathlib import Path

# Resolve .env do Hermes automaticamente
def carregar_env():
    # Tenta .env.local do projeto primeiro (fonte canônica)
    proj_root = Path(__file__).resolve().parent
    env_local = proj_root / '.env.local'
    if env_local.exists():
        with open(env_local, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key in ('VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_URL', 'SUPABASE_KEY'):
                    env_key = 'SUPABASE_URL' if 'URL' in key else 'SUPABASE_KEY'
                    os.environ.setdefault(env_key, value)

    # Fallback: ~/.hermes/.env (pode ter chave truncada)
    env_hermes = Path.home() / '.hermes' / '.env'
    if env_hermes.exists():
        with open(env_hermes, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key in ('SUPABASE_URL', 'SUPABASE_KEY', 'POSTGRES_SERVICE_ROLE_KEY'):
                    os.environ.setdefault(key, value)

    if 'SUPABASE_URL' not in os.environ or 'SUPABASE_KEY' not in os.environ:
        print(f"ERRO: credenciais Supabase nao encontradas em .env.local nem ~/.hermes/.env")
        sys.exit(1)

carregar_env()

# Data a consultar (prioriza argumento, senão pega dia UTC considerado "hoje" no Supabase)
if len(sys.argv) > 1:
    target_day = sys.argv[1]
else:
    target_day = (datetime.utcnow() - timedelta(hours=3)).strftime('%Y-%m-%d')

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ.get('SUPABASE_KEY') or os.environ.get('POSTGRES_SERVICE_ROLE_KEY')
if not SUPABASE_KEY:
    print("ERRO: SUPABASE_KEY ou POSTGRES_SERVICE_ROLE_KEY nao encontrada no .env")
    sys.exit(1)

# Tenta importar supabase; se não existir, usa o venv já existente
try:
    from supabase import create_client
except ModuleNotFoundError:
    sys.path.insert(0, '/tmp/venv_supabase/lib/python3.12/site-packages')
    from supabase import create_client

client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Busca histórico do dia
history = (
    client.from_('historico_resolucoes')
    .select('*')
    .gte('data_resolucao', f"{target_day}T00:00:00")
    .lte('data_resolucao', f"{target_day}T23:59:59")
    .execute()
    .data or []
)

if not history:
    print(f"Sem registros em {target_day}")
    sys.exit(0)

# Filtra erros
erros = [r for r in history if not r.get('acertou')]
ids = list({r['questao_id'] for r in erros})
questions = {q['id']: q for q in client.from_('questoes').select('*').in_('id', ids).execute().data}

# --- Gera Markdown ---
lines = []
lines.append(f'# Guia de Estudo - Erros do Dia - {target_day}')
lines.append('')
lines.append('Este documento combina:')
lines.append('- Mapa mental dos remédios constitucionais')
lines.append('- Resumo pedagógico dos erros por tema')
lines.append('- Lista das questões erradas')
lines.append('- Resoluções completas dos professores')
lines.append('')
lines.append('---')
lines.append('')
lines.append('## Mapa Mental Rapido - Remedios Constitucionais')
lines.append('')
lines.append('| Remedio | Finalidade | Legitimado | Prazo |')
lines.append('|---|---|---|---|')
lines.append('| HC | Liberdade de locomocao fisica | Qualquer pessoa | Impreterivel |')
lines.append('| HD | Acesso/retificacao de dados pessoais | Qualquer pessoa | Impreterivel |')
lines.append('| MS | Direito liquido e certo (nao HC/HD) | PF/PJ | 120 dias |')
lines.append('| MI | Inercia legislativa (falta de norma) | Qualquer pessoa | - |')
lines.append('| Acao Popular | Anular ato lesivo ao patrimonio publico | Cidadao c/direitos politicos | - |')
lines.append('| Acao Civil Publica | Tutela de direitos difusos/coletivos | MP, Defensoria, entidade 1 ano | - |')
lines.append('')
lines.append('---')
lines.append('')
lines.append('## Tema 1 - Acao Popular vs ACP vs MS')
lines.append('')
lines.append('Dica: Cidadao individual + patrimonio publico = Acao Popular.')
lines.append('Cidadao individual + dano pessoal = Mandado de Segurança.')
lines.append('MP/entidade + direitos difusos = Acao Civil Publica.')
lines.append('')
lines.append('---')
lines.append('')
lines.append('## Tema 2 - Habeas Corpus: fisica vs virtual')
lines.append('')
lines.append('Q1808: HC protege liberdade fisica. Internet nao e locomocao. LGPD nao elimina HD contra privados.')
lines.append('Q1780: Preventivo = coacao iminente (antes de acontecer).')
lines.append('')
lines.append('Dica: HC = fisica. HD = dados pessoais.')
lines.append('')
lines.append('---')
lines.append('')
lines.append('## Tema 3 - MS coletivo')
lines.append('')
lines.append('Q1791: MS coletivo exige associacao com finalidade institucional especifica.')
lines.append('Dica: Finalidade vaga = geralmente nao cabe.')
lines.append('')
lines.append('---')
lines.append('')
lines.append('## Tema 4 - Mandado de Injunção (5 erros)')
lines.append('')
lines.append('Q1796: MI = ausencia de norma, nao norma defeituosa.')
lines.append('Q1800: Descumprimento -> novo MI (Lei 13.330/2016, art. 7).')
lines.append('Q1797: Omissao pode ser parcial. Pessoa fisica OU juridica pode impetrar. MP cabe em MI coletivo.')
lines.append('Q1801: NAO cabe MI contra norma regulamentadora defeituosa.')
lines.append('Q1798: Decisao de MI tem eficacia erga omnes (art. 5, 2 da Lei 13.330/2016).')
lines.append('')
lines.append('Dica: MI = Estado parado -> Judiciario diz COMO exercer ate o Estado regulamentar.')
lines.append('')
lines.append('---')
lines.append('')
lines.append('## Lista de questoes erradas')
lines.append('')
for r in erros:
    q = questions.get(r['questao_id'], {})
    lines.append(f"ID {r['questao_id']} - {q.get('materia')} | {q.get('assunto')} - Sua resposta: {r.get('alternativa')} - Gabarito: {q.get('gabarito')}")

lines.append('')
lines.append('---')
lines.append('')
lines.append('## Resolucoes Completas dos Professores')
lines.append('')

for r in erros:
    q = questions.get(r['questao_id'], {})
    lines.append('---')
    lines.append(f"### Q{r['questao_id']} - {q.get('materia')} | {q.get('assunto')}")
    lines.append('')
    lines.append(f"- **Banca:** {q.get('banca_texto')}")
    lines.append(f"- **Orgao:** {q.get('orgao')}")
    lines.append(f"- **Ano:** {q.get('ano')}")
    lines.append(f"- **Gabarito oficial:** {q.get('gabarito')}")
    lines.append(f"- **Sua resposta:** {r.get('alternativa')}")
    lines.append(f"- **Tempo:** {r.get('tempo_segundos')}s")
    lines.append('')
    lines.append(f"**Enunciado:**")
    lines.append('')
    lines.append(q.get('enunciado', ''))
    lines.append('')
    alts = q.get('alternativas', {})
    if alts:
        lines.append('**Alternativas:**')
        for k in sorted(alts.keys()):
            v = alts[k]
            mark = ' <- Sua resposta' if k == r.get('alternativa') else ''
            lines.append(f'- {k}) {v}{mark}')
    lines.append('')
    resolucao = (q.get('resolucao_professor') or '').strip()
    if resolucao:
        lines.append('**Resolucao do Professor:**')
        lines.append('')
        lines.append(resolucao)
    else:
        lines.append('**Resolucao do Professor:** (sem resolucao cadastrada)')
    lines.append('')

out_dir = Path(r'C:\\Programação\\questoes-concursos')
out_path = out_dir / f'revisao_erros_{target_day}.md'
out_path.parent.mkdir(parents=True, exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f'OK|{out_path}|{len(erros)}_erros')
