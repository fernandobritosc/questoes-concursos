#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera guias de revisão consolidados para todas as questões pendentes,
agrupadas por matéria.
Salva em revisoes/<Materia>/revisao_pendentes.md.
"""

import os
import sys
import json
import re
from pathlib import Path
from collections import defaultdict

# Insere o diretório do script no path para importar _hermes_env
sys.path.insert(0, os.path.dirname(__file__))
from _hermes_env import load_config, supabase_get, ts_to_local_date

PENDENTES_FILE = os.path.join(os.path.dirname(__file__), '..', 'pendentes_revisao.json')
EVENTS_FILE = os.path.join(os.path.dirname(__file__), '..', 'hermes_events.jsonl')
REVISOES_DIR = os.path.join(os.path.dirname(__file__), '..', 'revisoes')


def calculate_pendentes_from_events():
    """Fallback: calcula as questões pendentes lendo hermes_events.jsonl de trás para frente ou sequencialmente."""
    pendentes_revisao = {}
    if not os.path.exists(EVENTS_FILE):
        return {}
    
    with open(EVENTS_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except Exception:
                continue
            
            tipo_evento = e.get('tipo')
            d = e.get('dados', {})
            qid = d.get('questao_id')
            mat = d.get('materia') or 'Sem matéria'
            ass = d.get('assunto') or 'Sem assunto'
            acertou = d.get('acertou', False)
            ts = e.get('timestamp')
            
            if tipo_evento in ('responder_questao', 'revisar_questao') and qid is not None:
                if acertou:
                    pendentes_revisao.pop(qid, None)
                else:
                    if qid not in pendentes_revisao:
                        pendentes_revisao[qid] = {
                            'primeiro_erro_em': ts or '',
                            'tentativas': 0,
                        }
                    p = pendentes_revisao[qid]
                    p.update({
                        'questao_id': qid,
                        'materia': mat,
                        'assunto': ass,
                        'banca_texto': d.get('banca_texto') or 'Sem banca',
                        'gabarito': d.get('gabarito'),
                        'ultima_tentativa_em': ts or '',
                        'ultima_marcou': d.get('alternativa_selecionada'),
                    })
                    p['tentativas'] = p.get('tentativas', 0) + 1
    return pendentes_revisao


def load_pendentes():
    """Carrega as questões pendentes de revisão."""
    if os.path.exists(PENDENTES_FILE):
        try:
            with open(PENDENTES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Dicionários salvos em JSON têm chaves convertidas para string.
                # Vamos converter chaves de string numérica de volta para int se possível
                converted = {}
                for k, v in data.items():
                    try:
                        converted[int(k)] = v
                    except ValueError:
                        converted[k] = v
                return converted
        except Exception as e:
            print(f"Aviso: Erro ao carregar {PENDENTES_FILE}: {e}. Usando fallback...", file=sys.stderr)
            
    print("Calculando questões pendentes a partir do histórico de eventos...", file=sys.stderr)
    return calculate_pendentes_from_events()


def sanitize_materia_name(materia):
    """Sanitiza o nome da matéria para ser um nome de pasta seguro no Windows."""
    clean = re.sub(r'[\\/:*?"<>|]', '_', materia)
    return clean.strip()


def normalize_materia_name(materia):
    """Corrige e normaliza nomes de matérias com problemas de acentuação/encoding."""
    materia_str = str(materia).strip()
    
    correcoes = {
        'raciocnio lgico': 'Raciocínio Lógico',
        'raciocínio lógico': 'Raciocínio Lógico',
        'racioc\u00ednio l\u00f3gico': 'Raciocínio Lógico',
        'afo': 'AFO, Direito Financeiro e Contabilidade Pública',
        'afo, direito financeiro e contabilidade pública': 'AFO, Direito Financeiro e Contabilidade Pública',
        'afo, direito financeiro e contabilidade pblica': 'AFO, Direito Financeiro e Contabilidade Pública',
        'informática': 'Informática',
        'informtica': 'Informática',
        'língua portuguesa (português)': 'Língua Portuguesa (Português)',
        'língua portuguesa (portugues)': 'Língua Portuguesa (Português)',
        'lngua portuguesa (portugus)': 'Língua Portuguesa (Português)',
        'administração geral e pública': 'Administração Geral e Pública',
        'administrao geral e pblica': 'Administração Geral e Pública',
        'legislação civil e processual civil especial': 'Legislação Civil e Processual Civil Especial',
        'legislao civil e processual civil especial': 'Legislação Civil e Processual Civil Especial'
    }
    
    key = materia_str.lower().replace('  ', ' ')
    if key in correcoes:
        return correcoes[key]
        
    materia_str = re.sub(r'racioc[n\uFFFD]+nio\s+l[o\uFFFD]+gico', 'Raciocínio Lógico', materia_str, flags=re.IGNORECASE)
    materia_str = re.sub(r'l[n\uFFFD]+ngua\s+portuguesa\s*\(portugu[s\uFFFD]+\)', 'Língua Portuguesa (Português)', materia_str, flags=re.IGNORECASE)
    materia_str = re.sub(r'administra[co\uFFFD]+o\s+geral\s+e\s+p[b\uFFFD]+blica', 'Administração Geral e Pública', materia_str, flags=re.IGNORECASE)
    materia_str = re.sub(r'legisla[co\uFFFD]+o\s+civil\s+e\s+processual\s+civil\s+especial', 'Legislação Civil e Processual Civil Especial', materia_str, flags=re.IGNORECASE)
    materia_str = re.sub(r'inform[a\uFFFD]+tica', 'Informática', materia_str, flags=re.IGNORECASE)
    materia_str = re.sub(r'afo,\s+direito\s+financeiro\s+e\s+contabilidade\s+p[b\uFFFD]+blica', 'AFO, Direito Financeiro e Contabilidade Pública', materia_str, flags=re.IGNORECASE)
    
    if materia_str.lower() == 'afo':
        return 'AFO, Direito Financeiro e Contabilidade Pública'
        
    return materia_str


def get_questoes_details(questoes_ids, config=None):
    """Busca os detalhes completos das questões no Supabase via REST."""
    if not questoes_ids:
        return {}
    
    questoes_map = {}
    # Divide em lotes de 200 para evitar URLs muito longas
    for i in range(0, len(questoes_ids), 200):
        batch = questoes_ids[i:i+200]
        ids_csv = ','.join(str(q) for q in batch)
        try:
            rows = supabase_get(f'questoes?select=*&id=in.({ids_csv})', config) or []
            for q in rows:
                questoes_map[q['id']] = q
        except Exception as e:
            print(f"Erro ao buscar detalhes das questões {batch}: {e}", file=sys.stderr)
            
    return questoes_map


def gerar_guias():
    config = load_config()
    pendentes = load_pendentes()
    
    if not pendentes:
        print("Nenhuma questão pendente de revisão encontrada.")
        return
    
    # Agrupa por matéria, filtrando matérias de teste/smoke
    materias_ignoradas = {'teste', 'smoke test', 'test', 'sem matéria'}
    grouped = defaultdict(list)
    
    for qid, p in pendentes.items():
        materia_raw = p.get('materia', '').strip()
        if not materia_raw or materia_raw.lower() in materias_ignoradas:
            continue
        materia = normalize_materia_name(materia_raw)
        grouped[materia].append(p)
        
    if not grouped:
        print("Nenhuma questão pendente de matérias reais para gerar guias.")
        return
        
    print(f"Iniciando geração de guias de revisão para {len(grouped)} matérias...")
    
    for materia, p_list in grouped.items():
        # Busca detalhes completos do banco
        ids = [p['questao_id'] for p in p_list]
        details = get_questoes_details(ids, config)
        
        sanitized_mat = sanitize_materia_name(materia)
        materia_dir = Path(REVISOES_DIR) / sanitized_mat
        materia_dir.mkdir(parents=True, exist_ok=True)
        
        lines = []
        lines.append(f"# Questões Pendentes de Revisão — {materia}")
        lines.append(f"**Total de pendentes:** {len(p_list)} questões")
        lines.append("")
        lines.append("Estes são os seus erros pendentes nesta matéria. Quando resolver uma questão no TEC Concursos e acertá-la, ela sairá desta lista automaticamente.")
        lines.append("")
        lines.append("---")
        lines.append("")
        
        # Ordena por tentativas (decrescente) ou mais antigas primeiro
        p_list_sorted = sorted(p_list, key=lambda x: (-x.get('tentativas', 1), x.get('primeiro_erro_em', '')))
        
        for p in p_list_sorted:
            qid = p['questao_id']
            q = details.get(qid, {})
            
            # Se não achou detalhes da questão no banco (por ex. não sincronizou), usa o que tem na pendência
            assunto = q.get('assunto') or p.get('assunto') or 'Sem assunto'
            banca = q.get('banca_texto') or p.get('banca_texto') or 'Sem banca'
            gabarito = q.get('gabarito') or p.get('gabarito') or '?'
            tec_id = q.get('questao_tec_id') or qid
            
            lines.append(f"### Q{qid} — {assunto}")
            lines.append("")
            lines.append(f"- **Banca:** {banca} | **Órgão:** {q.get('orgao') or '?'} | **Ano:** {q.get('ano') or '?'}")
            lines.append(f"- **Primeiro Erro:** {ts_to_local_date(p.get('primeiro_erro_em'))} | **Última Tentativa:** {ts_to_local_date(p.get('ultima_tentativa_em'))}")
            lines.append(f"- **Tentativas de Erro:** {p.get('tentativas', 1)}")
            lines.append(f"- **Sua última resposta:** `{p.get('ultima_marcou') or '?'}` | **Gabarito oficial:** `{gabarito}`")
            if tec_id:
                lines.append(f"- **Link no TEC Concursos:** [Questão TEC {tec_id}](https://www.tecconcursos.com.br/questoes/{tec_id})")
            lines.append("")
            
            # Enunciado
            lines.append("**Enunciado:**")
            lines.append("")
            lines.append(q.get('enunciado') or "_Sem enunciado disponível no banco de dados._")
            lines.append("")
            
            # Alternativas
            alts = q.get('alternativas') or {}
            if alts:
                lines.append("**Alternativas:**")
                for k in sorted(alts.keys()):
                    v = alts[k]
                    mark = ""
                    if k == p.get('ultima_marcou'):
                        mark += " <- ❌ Sua resposta"
                    if k == gabarito:
                        mark += " <- ✅ Gabarito"
                    lines.append(f"- {k}) {v}{mark}")
                lines.append("")
                
            # Resolução do Professor
            resolucao = (q.get('resolucao_professor') or '').strip()
            if resolucao:
                # Estiliza rasuras se houver
                # O MarkdownAI suporta rasura com ~~texto~~. A extensão do TEC já envia com ~~.
                lines.append("**Resolução do Professor:**")
                lines.append("")
                lines.append(resolucao)
            else:
                lines.append("**Resolução do Professor:** (sem resolução cadastrada)")
                
            lines.append("")
            lines.append("---")
            lines.append("")
            
        out_path = materia_dir / "revisao_pendentes.md"
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print(f"  Guia gerado: {out_path} ({len(p_list)} questões)")


if __name__ == '__main__':
    # Reconfigura stdout e stderr para usar UTF-8 no Windows
    if sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
    if sys.stderr.encoding.lower() != 'utf-8':
        try:
            sys.stderr.reconfigure(encoding='utf-8')
        except Exception:
            pass
            
    gerar_guias()
