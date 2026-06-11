"""
Script único para o Hermes: consulta erros de hoje no Supabase,
separa por matéria, gera arquivos de revisão individuais em
revisoes/<Materia>/erros_<data>.md

Uso:
    python3 scripts/revisar_erros_hoje.py

NÃO requer código Python inline pelo Hermes.
"""
import os
import sys
import json
from datetime import datetime, timedelta, timezone
from collections import defaultdict

try:
    from zoneinfo import ZoneInfo
    FUSO_BR = ZoneInfo("America/Sao_Paulo")
except ImportError:
    FUSO_BR = timezone(-timedelta(hours=3), "BRT")

sys.path.insert(0, os.path.dirname(__file__))
from _hermes_env import load_config, supabase_get

REVISOES_DIR = os.path.join(os.path.dirname(__file__), '..', 'revisoes')
CONTROLE_FILE = os.path.join(os.path.dirname(__file__), '..', 'controle_revisoes.md')
import re as _re


def sanitize_folder_name(nome):
    """Substitui caracteres inválidos para nome de pasta."""
    return nome.replace('/', '_').replace('\\', '_').replace(':', '_').replace('*', '_').replace('?', '_').replace('"', '_').replace('<', '_').replace('>', '_').replace('|', '_').strip()


def get_today_errors(config):
    """Busca todas as resoluções de hoje no Supabase e retorna só as erradas."""
    agora = datetime.now(FUSO_BR)
    today_start = agora.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    today_end = today_start + timedelta(days=1)

    rows = supabase_get(
        f'historico_resolucoes?select=*'
        f'&data_resolucao=gte.{today_start.isoformat()}'
        f'&data_resolucao=lt.{today_end.isoformat()}'
        f'&order=id.asc'
        f'&limit=500',
        config,
    )
    if not rows:
        return []

    # Filtra só erros e pega a última tentativa de cada questao_id
    errors = [r for r in rows if r.get('acertou') is False]
    seen = set()
    unique_errors = []
    for e in reversed(errors):
        qid = e.get('questao_id')
        if qid and qid not in seen:
            seen.add(qid)
            unique_errors.append(e)
    return unique_errors


def get_questions_details(ids, config):
    """Busca detalhes das questões (enunciado, alternativas, matéria, etc)."""
    if not ids:
        return {}
    result = {}
    for i in range(0, len(ids), 100):
        batch = ids[i:i+100]
        ids_csv = ','.join(str(q) for q in batch)
        rows = supabase_get(
            f'questoes?select=id,questao_tec_id,materia,assunto,enunciado,alternativas,gabarito,resolucao_professor'
            f'&id=in.({ids_csv})'
            f'&limit=100',
            config,
        ) or []
        for q in rows:
            result[q['id']] = q
    return result


def generate_review_file(materia, errors_with_details, hoje_str):
    """Gera o conteúdo do arquivo de revisão para uma matéria."""
    folder = sanitize_folder_name(materia)
    dir_path = os.path.join(REVISOES_DIR, folder)
    os.makedirs(dir_path, exist_ok=True)

    filename = f'erros_{hoje_str}.md'
    filepath = os.path.join(dir_path, filename)

    lines = [
        f'# Revisão de Erros — {hoje_str}',
        f'## {materia}',
        '',
        f'**Total de erros:** {len(errors_with_details)}',
        '',
        '---',
        '',
    ]

    for i, item in enumerate(errors_with_details, 1):
        q = item.get('questao', {})
        assunto = q.get('assunto') or item.get('assunto', '?')
        gabarito = q.get('gabarito') or item.get('gabarito', '?')
        marcada = item.get('alternativa', '?')
        resolucao = q.get('resolucao_professor') or ''
        tec_id = q.get('questao_tec_id') or item.get('questao_tec_id', '?')
        qid = q.get('id') or item.get('questao_id', '?')

        lines.append(f'### {i}. {assunto}')
        lines.append(f'- **ID:** {qid}')
        lines.append(f'- **TEC ID:** {tec_id}')
        lines.append(f'- **Gabarito:** {gabarito}')
        lines.append(f'- **Marcou:** {marcada}')
        if resolucao:
            lines.append(f'- **Resolução:** {resolucao.strip()[:200]}')
        lines.append('')

    lines.extend([
        '---',
        '',
        '## Checklist',
        '',
    ])
    for i in range(1, len(errors_with_details) + 1):
        lines.append(f'- [ ] ERRO {i}/{len(errors_with_details)} revisado')

    lines.extend([
        '',
        '**Quando terminar, envie "feito" que eu marco no controle.**',
        '',
    ])

    content = '\n'.join(lines)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    rel_path = os.path.relpath(filepath, os.path.join(os.path.dirname(__file__), '..')).replace('\\', '/')
    return rel_path, content


def cleanup_bad_files(hoje_str):
    """Remove arquivos de revisão soltos na raiz de revisoes/ e também
    arquivos revisao_erros_*.md na raiz do projeto."""
    PROJ_ROOT = os.path.join(os.path.dirname(__file__), '..')
    # Limpa soltos em revisoes/
    for fname in os.listdir(REVISOES_DIR):
        fpath = os.path.join(REVISOES_DIR, fname)
        if os.path.isfile(fpath) and fname.endswith('.md'):
            os.remove(fpath)
            print(f'  [cleanup] removido {fname}')
    # Limpa revisao_erros_*.md na raiz do projeto
    for fname in os.listdir(PROJ_ROOT):
        if fname.startswith('revisao_erros_') and fname.endswith('.md'):
            fpath = os.path.join(PROJ_ROOT, fname)
            os.remove(fpath)
            print(f'  [cleanup] removido {fname} (raiz do projeto)')


def update_controle(materia_entries, hoje_str):
    """Recria a tabela de Resumo Diario no controle_revisoes.md."""
    if not os.path.exists(CONTROLE_FILE):
        return

    with open(CONTROLE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove QUALQUER linha que seja entrada antiga da tabela (começa com | YYYY-MM-DD)
    lines = content.split('\n')
    clean_lines = [l for l in lines if not _re.match(r'^\|\s*\d{4}-\d{2}-\d{2}\s*\|', l.strip())]
    content = '\n'.join(clean_lines)

    # Encontra a seção de Resumo Diário e recria a tabela
    sep_line = '|------|----------|-------|------------------|----------------|--------------|'

    # Remove linhas de tabela antigas entre |---|---|---| e ---
    lines = content.split('\n')
    new_lines = []
    in_table = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('|--') and 'Data' not in line:
            in_table = True
            new_lines.append(line)
            continue
        if in_table:
            if stripped.startswith('---'):
                in_table = False
                new_lines.append(line)
                continue
            if stripped.startswith('|'):
                continue
            else:
                in_table = False
                new_lines.append(line)
                continue
        new_lines.append(line)
    content = '\n'.join(new_lines)

    # Gera novas linhas
    new_rows = []
    for materia, qtd, erros, rel_path in materia_entries:
        new_rows.append(f'| {hoje_str} | {materia} | {qtd} questões | {erros} erros | `{rel_path}` | ❌ PENDENTE | — |')

    if new_rows:
        sep_pattern = '\n' + sep_line + '\n'
        sep_pos = content.find(sep_pattern)
        if sep_pos >= 0:
            insert_at = sep_pos + len(sep_pattern)
            content = content[:insert_at] + '\n'.join(new_rows) + '\n' + content[insert_at:]
        else:
            content += '\n' + sep_line + '\n' + '\n'.join(new_rows) + '\n'

    with open(CONTROLE_FILE, 'w', encoding='utf-8') as f:
        f.write(content)


def main():
    config = load_config()
    hoje_br = datetime.now(FUSO_BR)
    hoje_str = hoje_br.strftime('%Y-%m-%d')

    # Cleanup: remove arquivos soltos na raiz de revisoes/
    cleanup_bad_files(hoje_str)

    print(f'[Supabase] Consultando erros de {hoje_str} no Supabase...')
    errors = get_today_errors(config)

    if not errors:
        print('[OK] Nenhum erro encontrado hoje.')
        return

    ids = [e['questao_id'] for e in errors if e.get('questao_id')]
    questions = get_questions_details(ids, config)

    # Monta lista com detalhes
    for e in errors:
        q = questions.get(e.get('questao_id'), {})
        e['questao'] = q

    # Agrupa por matéria
    by_materia = defaultdict(list)
    for e in errors:
        mat = e['questao'].get('materia') or 'Sem matéria'
        by_materia[mat].append(e)

    total_erros = len(errors)
    print(f'\nTotal de erros hoje: {total_erros}')
    print(f'Materias: {len(by_materia)}')

    materia_entries = []
    for materia, items in sorted(by_materia.items()):
        rel_path, content = generate_review_file(materia, items, hoje_str)
        print(f'  [OK] {materia}: {len(items)} erro(s) -> {rel_path}')
        materia_entries.append((materia, len(items), len(items), rel_path))

    # Atualiza controle_revisoes.md
    update_controle(materia_entries, hoje_str)
    print(f'\ncontrole_revisoes.md atualizado com {len(materia_entries)} entrada(s).')

    print(f'\nRevisao concluida. Arquivos em revisoes/<Materia>/erros_{hoje_str}.md')


if __name__ == '__main__':
    main()
