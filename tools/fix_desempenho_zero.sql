-- Corrige desempenho=0 para NULL (tarefas sem nota)
UPDATE tarefas_meta SET desempenho = NULL WHERE desempenho = 0;
