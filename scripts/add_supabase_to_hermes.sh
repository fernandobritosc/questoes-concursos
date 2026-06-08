#!/bin/bash
# Adiciona credenciais do Supabase ao .env do Hermes
ENV_FILE="$HOME/.hermes/.env"
grep -q "SUPABASE_URL" "$ENV_FILE" 2>/dev/null && echo "SUPABASE_URL ja existe" || {
    echo "" >> "$ENV_FILE"
    echo "# Supabase para consultar questoes" >> "$ENV_FILE"
    echo "SUPABASE_URL=https://dyxtalcvjcprmhuktyfd.supabase.co" >> "$ENV_FILE"
    echo "SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8" >> "$ENV_FILE"
    echo "Credenciais Supabase adicionadas ao .env"
}
cat "$ENV_FILE" | tail -3
