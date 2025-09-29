-- Script para adicionar funcionalidade de arquivamento de tarefas
-- Execute este script no SQL Editor do Lovable Cloud

-- 1. Adicionar campos de arquivamento na tabela tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2. Criar índice para melhor performance em queries de tarefas arquivadas
CREATE INDEX IF NOT EXISTS idx_tasks_is_archived ON public.tasks(is_archived);
CREATE INDEX IF NOT EXISTS idx_tasks_company_archived ON public.tasks(company_id, is_archived);

-- 3. Habilitar realtime para a tabela tasks (se ainda não estiver habilitado)
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- 4. Criar função para arquivar tarefa automaticamente ao concluir
CREATE OR REPLACE FUNCTION public.archive_completed_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se a tarefa foi marcada como completed e não estava antes
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.is_archived = true;
    NEW.archived_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Criar trigger para executar a função
DROP TRIGGER IF EXISTS archive_on_complete ON public.tasks;
CREATE TRIGGER archive_on_complete
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_completed_task();
