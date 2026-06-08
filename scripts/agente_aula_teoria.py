#!/usr/bin/env python3
"""
Agente Aula Teoria: lê um PDF de estudos, extrai o texto de páginas específicas,
resume em chunks menores para evitar limites de TPM da Groq, e compila um resumo
teórico de altíssima qualidade com blocos para TDAH e perguntas interativas de recall ativo.

Uso:
  python scripts/agente_aula_teoria.py --pdf <nome_ou_caminho.pdf> --paginas <inicio-fim> --assunto "<assunto>" --meta <N> --disciplina "<disciplina>"
"""

import os
import sys
import re
import json
import time
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


def limpar_ruidos_pdf(text):
    # Remove assinaturas recorrentes do professor
    text = re.sub(r'(?i)prof\.\s+stefan\s+fantini', '', text)
    text = re.sub(r'(?i)stefan\s+fantini', '', text)
    
    # Remove marcas de numeração de página comuns como um número isolado numa linha
    text = re.sub(r'(?m)^\s*\d+\s*$', '', text)
    
    # Substitui múltiplas quebras de linha por no máximo duas para limpar espaços vazios
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def main():
    parser = argparse.ArgumentParser(description="Gera resumos de aulas teóricas via Groq a partir de PDFs.")
    parser.add_argument("--pdf", required=True, help="Nome do arquivo ou caminho do PDF")
    parser.add_argument("--paginas", required=True, help="Páginas a resumir, ex: '5-17' ou '22'")
    parser.add_argument("--assunto", required=True, help="Assunto da tarefa de estudo")
    parser.add_argument("--meta", required=True, help="Número da meta semanal")
    parser.add_argument("--disciplina", required=True, help="Disciplina da tarefa")

    args = parser.parse_args()

    # Carrega configurações
    config = load_config()
    api_key = config.get('GROQ_API_KEY') or config.get('VITE_GROQ_API_KEY')
    if not api_key:
        print("Erro: GROQ_API_KEY não encontrada no arquivo .env.local", file=sys.stderr)
        sys.exit(1)

    # Localiza o arquivo PDF
    pdf_path = args.pdf
    if not os.path.exists(pdf_path):
        pdf_dir = os.path.join(os.path.dirname(__file__), '..', 'Pdf')
        pdf_path = os.path.join(pdf_dir, args.pdf)
        if not os.path.exists(pdf_path):
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

    # Identifica o intervalo de páginas (1-based)
    pages_to_extract = []
    if '-' in args.paginas:
        try:
            start_str, end_str = args.paginas.split('-', 1)
            start_page = int(start_str.strip())
            end_page = int(end_str.strip())
            pages_to_extract = list(range(start_page, end_page + 1))
        except ValueError:
            print(f"Erro: Formato de páginas inválido: '{args.paginas}'.", file=sys.stderr)
            sys.exit(1)
    else:
        try:
            pages_to_extract = [int(args.paginas.strip())]
        except ValueError:
            print(f"Erro: Formato de páginas inválido: '{args.paginas}'.", file=sys.stderr)
            sys.exit(1)

    print(f"Lendo PDF: {pdf_path}")
    print(f"Páginas solicitadas: {args.paginas} (total: {len(pages_to_extract)} páginas)")

    try:
        reader = PdfReader(pdf_path)
        total_pdf_pages = len(reader.pages)
    except Exception as e:
        print(f"Erro ao abrir PDF: {e}", file=sys.stderr)
        sys.exit(1)

    client = Groq(api_key=api_key)

    # Divide a extração em chunks de no máximo 4 páginas para evitar estouro de TPM (limite 12k)
    chunk_size = 4
    page_chunks = [pages_to_extract[i:i + chunk_size] for i in range(0, len(pages_to_extract), chunk_size)]
    
    summaries = []
    print(f"Iniciando processamento em {len(page_chunks)} blocos...")

    for idx, chunk in enumerate(page_chunks, 1):
        print(f"  [{idx}/{len(page_chunks)}] Lendo páginas {chunk[0]} a {chunk[-1]}...")
        chunk_text = []
        for p_num in chunk:
            if 1 <= p_num <= total_pdf_pages:
                page = reader.pages[p_num - 1]
                chunk_text.append(page.extract_text() or '')
        
        extracted_chunk_text = '\n\n'.join(chunk_text).strip()
        extracted_chunk_text = limpar_ruidos_pdf(extracted_chunk_text)
        if not extracted_chunk_text:
            print(f"  [{idx}/{len(page_chunks)}] Aviso: Sem texto legível nestas páginas. Pulando.")
            continue
            
        print(f"  [{idx}/{len(page_chunks)}] Enviando para Groq (tamanho do bloco: {len(extracted_chunk_text)} caracteres)...")

        prompt = f"""
Você é o Hermes, mentor de estudos pessoal do Fernando (aluno concurseiro experiente que tem TDAH). 
Sua missão é gerar um resumo teórico com formatação otimizada para TDAH (tópicos curtos, escaneabilidade rápida e ausência total de "parede de texto").

Gere um resumo teórico completo, detalhado e aprofundado do seguinte bloco de páginas de {args.disciplina} ({chunk[0]} a {chunk[-1]}):

Assunto Geral: {args.assunto}

Texto extraído das páginas:
---
{extracted_chunk_text}
---

Diretrizes OBRIGATÓRIAS de escrita e formatação para TDAH:
1. **Estrutura por Tópicos (Chunking)**: Divida o conteúdo em seções lógicas (### e ####). NUNCA crie parágrafos com mais de 3 linhas. Qualquer informação mais longa deve ser listada em tópicos curtos (bullet points) de no máximo 1 a 2 linhas.
2. **Leitura Guiada (Bold Reading)**: Use **negritos estratégicos** para destacar termos técnicos, prazos, competências e palavras de ação fundamentais no início de frases e itens. Isso ajuda o leitor com TDAH a focar imediatamente no essencial.
3. **Ancoragem com Emojis**: Use um emoji discreto no início de cada subtítulo ou seção conceitual importante (ex: 📈, ⚖️, 👥, ⏱️) como ponto de referência visual.
4. **Sem Metadados Inúteis**: Não inclua cabeçalhos de página, rodapés, nomes de professores ("Stefan Fantini", etc.) ou referências literais de divisão de página como "### Página X" no meio do seu resumo. O foco é a matéria limpa.
5. **Prefixos Especiais**: Quando o assunto for de alta relevância, utilize obrigatoriamente estes prefixos no início das linhas:
   - "Pegadinha: [texto]" -> Cascas de banana clássicas da banca.
   - "Dica de Prova: [texto]" -> Mnemônicos ou resumos mentais práticos.
   - "Atenção: [texto]" -> Regras essenciais e alertas importantes.
   - "Importante: [texto]" -> Definições legais e doutrinárias fundamentais.
6. **Tabelas de Síntese**: Onde houver distinções, prazos, diferenças conceituais ou classificações (como as forças de Porter ou perspectivas do BSC), resuma-os em tabelas comparativas em Markdown, evitando longos blocos de texto explicativos.
7. **Densidade de Conteúdo**: Não omita detalhes importantes ou requisitos legais, mas mastique-os visualmente conforme as regras acima.

Não adicione introduções ou considerações de chat de IA no início ou no fim. Comece diretamente com o resumo em Markdown.
"""
        
        retries = 3
        while retries > 0:
            try:
                chat_completion = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.3-70b-versatile",
                    temperature=0.2,
                )
                chunk_summary = chat_completion.choices[0].message.content or ''
                summaries.append(chunk_summary.strip())
                break
            except Exception as e:
                print(f"    Erro de API no bloco {idx} ({e}). Aguardando para tentar novamente...", file=sys.stderr)
                time.sleep(6)
                retries -= 1
        
        if retries == 0:
            print(f"Erro crítico: Não foi possível processar o bloco {idx} após várias tentativas.", file=sys.stderr)
            sys.exit(1)
            
        # Pequeno delay entre requisições para evitar rate limit de RPM
        time.sleep(2)

    # Concatena todos os chunks de resumo gerados
    combined_summaries = '\n\n'.join(summaries)

    print("Gerando seção final de Recall Ativo e Dicas Consolidadas...")
    
    # Prepara o prompt de encerramento e recall ativo a partir do resumo gerado
    # (resumo gerado é bem menor que o PDF bruto e cabe na janela Groq)
    prompt_final = f"""
Você é o Hermes, mentor de estudos do Fernando.
Com base no resumo teórico consolidado de {args.disciplina} sobre {args.assunto} apresentado abaixo:

---
{combined_summaries[:20000]}
---

Por favor, gere uma seção final em Markdown estruturada exatamente assim:

### 🎯 Questões de Recall Ativo
[Gere de 4 a 6 perguntas curtas e diretas sobre os pontos mais cobrados e importantes abordados no resumo acima. Para cada pergunta, coloque a resposta logo abaixo oculta dentro de tags HTML <details><summary>Ver resposta sugerida</summary>...</details> para o Fernando testar seus conhecimentos ativamente.]

### 💡 Roteiro de Fechamento
[Adicione um parágrafo rápido com a recomendação prática final para este assunto, iniciando a linha estritamente com o prefixo "Dica de Prova: " ou "Atenção: ".]

Não adicione notas explicativas fora das seções solicitadas.
"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt_final}],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )
        final_section = chat_completion.choices[0].message.content or ''
    except Exception as e:
        print(f"Erro ao gerar recall ativo: {e}", file=sys.stderr)
        final_section = "\n\n### 🎯 Questões de Recall Ativo\n- Tente explicar mentalmente os principais pontos estudados neste material."

    # Junta o título do arquivo, os resumos concatenados e o recall final
    final_document = f"""# Tarefa {args.meta} — {args.disciplina}
## {args.assunto}

**Páginas estudadas:** {args.paginas}  
**Material de origem:** {os.path.basename(pdf_path)}  
**Atualizado em:** {datetime.now(FUSO_BR).strftime('%d/%m/%Y %H:%M')}

---

{combined_summaries}

---

{final_section}
"""

    # Determina caminhos de saída
    disciplina_slug = slugify(args.disciplina)
    assunto_slug = slugify(args.assunto)

    out_dir = os.path.join(os.path.dirname(__file__), '..', 'estudos', disciplina_slug)
    os.makedirs(out_dir, exist_ok=True)

    file_name = f"estudo_tarefa{args.meta}_{disciplina_slug}.md"
    out_path = os.path.join(out_dir, file_name)

    try:
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(final_document.strip() + '\n')
    except Exception as e:
        print(f"Erro ao salvar arquivo markdown: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        print(f"\n🎉 Sucesso! Resumo de teoria de alta qualidade salvo em:\n  {out_path}")
    except UnicodeEncodeError:
        print(f"\n[Sucesso] Resumo de teoria de alta qualidade salvo em:\n  {out_path}")


if __name__ == '__main__':
    main()
