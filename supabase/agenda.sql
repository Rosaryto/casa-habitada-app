-- Casa Habitada: Agenda (bloques de horarios programados).
-- SOLO para una base que ya tiene "casas" y "visitas" (tu caso).
-- Pegá todo esto en Supabase > SQL Editor > New query y tocá "Run".

-- ---------- Agenda: bloques de horarios programados ----------
create table public.programaciones (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  casa_id uuid not null references public.casas on delete cascade,
  inicio timestamptz not null,
  fin timestamptz not null,
  creada timestamptz not null default now(),
  check (fin > inicio)
);
create index on public.programaciones (inicio);

-- ---------- Seguridad ----------
alter table public.programaciones enable row level security;

grant select, insert, update, delete on public.programaciones to authenticated;
revoke all on public.programaciones from anon;

create policy "mis programaciones" on public.programaciones
  for all to authenticated
  using (usuario = auth.uid())
  with check (
    usuario = auth.uid()
    and exists (select 1 from public.casas c where c.id = casa_id and c.usuario = auth.uid())
  );
