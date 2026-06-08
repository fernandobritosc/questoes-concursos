#!/usr/bin/env python3
"""
Agente Meta Parser: lê o PDF de metas da LS Concursos, extrai o texto
e estrutura como o arquivo JSON de estado do Hermes (Hermes_state.json) usando Groq.

Uso:
  python scripts/agente_meta_parser.py --pdf <caminho_ou_nome.pdf>
"""

import os
import sys
import re
import json
import argparse
from pypdf import PdfReader
from groq import Groq
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from _hermes_env import load_config, FUSO_BR


def slugify(text):
    text = text.lower()
    text = re.sub(r'[áàâãä]', 'a', text)
    text = re.sub(r'[éèêë]', 'e', text)
    text = re.sub(r'[íìîï]', 'i', text)
    text = re.sub(r'[óòôõö]', 'o', text)
    text = re.sub(r'[úùûü]', 'u', text)
    text = re.sub(r'[ç]', 'c', text)
    text = re.sub(r'[^a-z0-9_]', '_', text)
    text = re.sub(r'_+', '_', text)
    return text.strip('_')


def main():
    parser = argparse.ArgumentParser(description="Parser da meta de estudos da LS Concursos via Groq.")
    parser.add_argument("--pdf", required=True, help="Nome do arquivo ou caminho do PDF da Meta")
    args = parser.parse_args()

    # Carrega configurações
    config = load_config()
    api_key = config.get('GROQ_API_KEY') or config.get('VITE_GROQ_API_KEY')
    if not api_key:
        print("Erro: GROQ_API_KEY não encontrada no arquivo .env.local", file=sys.stderr)
        sys.exit(1)

    pdf_path = args.pdf
    if not os.path.exists(pdf_path):
        # Fallback para metas_LS/
        meta_dir = os.path.join(os.path.dirname(__file__), '..', 'metas_LS')
        pdf_path = os.path.join(meta_dir, args.pdf)
        if not os.path.exists(pdf_path):
            # Tenta busca recursiva em metas_LS/ ou Pdf/
            found = False
            for parent in ('metas_LS', 'Pdf'):
                search_dir = os.path.join(os.path.dirname(__file__), '..', parent)
                if os.path.exists(search_dir):
                    for root, _, files in os.walk(search_dir):
                        if args.pdf in files:
                            pdf_path = os.path.join(root, args.pdf)
                            found = True
                            break
                        elif f"{args.pdf}.pdf" in files:
                            pdf_path = os.path.join(root, f"{args.pdf}.pdf")
                            found = True
                            break
                if found:
                    break
            if not found:
                print(f"Erro: Arquivo PDF '{args.pdf}' não encontrado.", file=sys.stderr)
                sys.exit(1)

    print(f"Lendo PDF da Meta: {pdf_path}")
    try:
        reader = PdfReader(pdf_path)
        text_content = []
        for i, page in enumerate(reader.pages):
            text_content.append(f"--- Página {i+1} ---\n" + (page.extract_text() or ''))
        
        full_extracted_text = '\n\n'.join(text_content).strip()
        if not full_extracted_text:
            print("Erro: Nenhum texto pôde ser extraído do PDF.", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Erro ao ler PDF: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Texto extraído: {len(full_extracted_text)} caracteres. Enviando ao Groq API...")

    prompt = f"""
Você é o Hermes, mentor de estudos pessoal do Fernando.
O seu objetivo é processar o texto completo da Meta de Estudos Semanal enviada e estruturá-la de forma limpa como um arquivo JSON de estado do Hermes.

Formato JSON exigido:
{{
  "atualizado_em": "{datetime.now(FUSO_BR).isoformat()}",
  "meta_ativa": {{
    "numero": 22, // Identifique o número da meta
    "programa": "Nome/Edital/Objetivo da Meta (Ex: Pré Edital regular para TRTs)",
    "data_referencia": "{datetime.now(FUSO_BR).strftime('%d/%m/%Y')}",
    "perfil_aluno": "experiente",
    "total_tarefas": 10, // Total de tarefas identificadas
    "tarefas_concluidas": 0
  }},
  "tarefas": [
    {{
      "numero": 1, // Número da tarefa
      "disciplina": "Nome da Disciplina (Ex: Direito Constitucional)",
      "disciplina_slug": "direito_constitucional", // Nome da disciplina normalizado como slug
      "tipo": "hibrido", // Classifique em: "teoria_pura" (só leitura), "hibrido" (leitura + caderno tec), "revisao" (revisão de meta anterior), "questoes" (só questões)
      "status": "pendente",
      "assunto": "Assunto principal detalhado da tarefa",
      "subassuntos": ["Subassunto 1", "Subassunto 2"], // Mapeie os subassuntos indicados
      "material": "Material indicado, curso, professor ou anotações",
      "atividades_iniciante": [
        // Se houver indicação de leitura teórica (páginas) ou questões de PDF para iniciante
        {{
          "tipo": "teoria",
          "descricao": "Aula X - páginas Y a Z",
          "paginas": [Y, Z]
        }}
      ],
      "atividades_experiente": [
        // Se houver links e cadernos do TEC Concursos sugeridos
        {{
          "tipo": "questoes_tec",
          "caderno": "Nome do Caderno no TEC Concursos",
          "link": "URL do link do caderno no TEC Concursos (Ex: https://www.tecconcursos.com.br/s/...)",
          "total_questoes": 30, // Quantidade sugerida se especificada
          "tempo_minutos": 60 // Tempo sugerido em minutos
        }}
      ],
      "concluido_em": null
    }}
  ],
  "progresso": {{
    "teoria_pura_pendentes": [4, 5], // Lista dos números de tarefas que são teoria_pura
    "hibrido_pendentes": [1, 3, 8], // Lista dos números de tarefas que são hibridas
    "revisao_pendentes": [2, 9], // Lista dos números de tarefas que são revisao
    "questoes_pendentes": [10], // Lista dos números de tarefas que são questoes
    "concluidas": []
  }},
  "pdfs_na_pasta": [],
  "ultima_sessao": null
}}

Por favor, analise as páginas textuais da meta e extraia com precisão e riqueza de detalhes todas as tarefas listadas:
---
{full_extracted_text}
---

Retorne ESTRITAMENTE o JSON bruto e válido. Não adicione delimitadores markdown como ```json ou comentários extras.
"""

    try:
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        json_response = chat_completion.choices[0].message.content or ''
    except Exception as e:
        print(f"Erro na Groq API: {e}", file=sys.stderr)
        sys.exit(1)

    # Valida o JSON retornado
    try:
        parsed_json = json.loads(json_response)
    except json.JSONDecodeError as e:
        print("Erro: A IA não retornou um JSON válido.", file=sys.stderr)
        print(json_response, file=sys.stderr)
        sys.exit(1)

    # Caminho do arquivo de estado
    out_paths = [
        os.path.join(os.path.dirname(__file__), 'Hermes_state.json'),
        os.path.join(os.path.dirname(__file__), '..', 'hermes_state.json')
    ]

    success = False
    for path in out_paths:
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(parsed_json, f, ensure_ascii=False, indent=4)
            print(f"Estado salvo com sucesso em: {path}")
            success = True
        except Exception as e:
            print(f"Erro ao salvar em {path}: {e}", file=sys.stderr)

    if not success:
        sys.exit(1)


if __name__ == '__main__':
    main()
