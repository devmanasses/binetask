-- Script para adicionar suporte a múltiplas empresas por usuário
-- Execute este script no SQL Editor do Lovable Cloud

-- 1. Criar tabela de junção para relacionamento muitos-para-muitos
CREATE TABLE IF NOT EXISTS public.user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas para user_companies
CREATE POLICY "Users can view their own company associations"
  ON public.user_companies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all company associations"
  ON public.user_companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can insert company associations"
  ON public.user_companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can delete company associations"
  ON public.user_companies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- 4. Adicionar políticas de exclusão para companies e profiles
CREATE POLICY "Admins can delete companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.user_type = 'admin'
    )
  );
