create table public.profiles (
  id uuid references auth.users(id) primary key,
  nome text,
  email text,
  cargo text not null default 'user',
  criado_em timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "usuario_ve_proprio_perfil"
on public.profiles for select
using (auth.uid() = id);

create policy "usuario_cria_proprio_perfil"
on public.profiles for insert
with check (auth.uid() = id);