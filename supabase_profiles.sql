-- Tabela separada pra quem entra via Google (não mexe na tabela "usuarios" já existente).
-- "id" é o mesmo id que o Supabase Auth já gera pro usuário (auth.users.id) — é assim que
-- ligamos "quem logou" com "a linha de perfil dele" sem duplicar autenticação.
create table public.profiles (
  id uuid references auth.users(id) primary key,
  nome text,
  email text,
  cargo text not null default 'user',
  criado_em timestamptz not null default now()
);

-- RLS (Row Level Security): sem isso, qualquer pessoa com a chave pública
-- conseguiria ler ou escrever na tabela inteira. Com RLS ligado, cada regra
-- abaixo decide exatamente o que é permitido.
alter table public.profiles enable row level security;

-- Cada usuário só pode LER a própria linha de perfil (não a de outros usuários).
create policy "usuario_ve_proprio_perfil"
on public.profiles for select
using (auth.uid() = id);

-- Cada usuário só pode CRIAR a própria linha de perfil (na primeira vez que loga).
create policy "usuario_cria_proprio_perfil"
on public.profiles for insert
with check (auth.uid() = id);

-- Propositalmente NÃO existe policy de update: ninguém pode se autopromover a
-- admin editando o próprio "cargo" pelo navegador. Pra promover alguém a admin,
-- você edita a linha manualmente pela interface do Supabase (Table Editor).
