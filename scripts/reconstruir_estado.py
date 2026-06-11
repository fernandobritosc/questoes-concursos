#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reconstrói o estado local de estatísticas offline a partir de hermes_events.jsonl.
Evita dependência de daemons/loops em background desatualizados.
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
from watcher_hermes import StatsEngine, gerar_resumo_evolucao, STATE_FILE, RESUMO_FILE, NOTIF_FILE, gerar_notificacoes

def main():
    jsonl_path = os.path.join(os.path.dirname(__file__), '..', 'hermes_events.jsonl')
    if not os.path.exists(jsonl_path):
        print(f"Erro: {jsonl_path} não encontrado!")
        sys.exit(1)
        
    stats = StatsEngine()
    
    eventos = []
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                eventos.append(json.loads(line))
            except json.JSONDecodeError:
                continue
                
    # Ingestão estática de todos os eventos
    stats.ingest(eventos)
    
    # Cálculo do novo estado
    estado = stats.calcular_estado()
    
    # Gravação dos arquivos de estado
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(estado, f, ensure_ascii=False, indent=2)
        
    notificacoes = gerar_notificacoes(stats, estado)
    with open(NOTIF_FILE, 'w', encoding='utf-8') as f:
        json.dump({'atualizado_em': estado['atualizado_em'], 'notificacoes': notificacoes}, f, ensure_ascii=False, indent=2)
        
    with open(RESUMO_FILE, 'w', encoding='utf-8') as f:
        f.write(gerar_resumo_evolucao(estado))
        
    # Também gera guias de revisão estaticamente
    try:
        from gerar_todas_revisoes import gerar_guias
        gerar_guias()
        print("Guias de revisão atualizados.")
    except Exception as e:
        print(f"Aviso ao gerar guias de revisão: {e}")
        
    print(f"Sucesso: Estado reconstruído offline com {len(eventos)} eventos.")

    # Gera revisão dos erros de hoje automaticamente
    try:
        print("\n--- Gerando revisão dos erros de hoje ---")
        import subprocess
        revisar_script = os.path.join(os.path.dirname(__file__), 'revisar_erros_hoje.py')
        result = subprocess.run(
            [sys.executable, revisar_script],
            capture_output=True, text=True, timeout=30
        )
        if result.stdout:
            for line in result.stdout.strip().split('\n'):
                print(f'  {line}')
        if result.stderr:
            print(f'  [stderr] {result.stderr.strip()[:500]}')
    except Exception as e:
        print(f"  [aviso] revisar_erros_hoje: {e}")

if __name__ == '__main__':
    main()
