-- Casa Habitada: base de datos para Supabase.
-- Pegá todo esto en Supabase > SQL Editor > New query y tocá "Run".

-- ---------- Casas ----------
create table public.casas (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  direccion text,
  dueno_nombre text,
  dueno_telefono text,
  plan text,
  mascotas text,
  notas text,              -- notas internas: el dueño NO las ve
  foto text,               -- foto de portada de la casa
  checklist jsonb not null default '[]',
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  creada timestamptz not null default now()
);

-- ---------- Visitas ----------
create table public.visitas (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  casa_id uuid not null references public.casas on delete cascade,
  tipo text not null default 'completa' check (tipo in ('completa', 'mascotas')),
  inicio timestamptz not null,
  fin timestamptz not null,
  items jsonb not null default '[]',
  fotos jsonb not null default '[]',
  notas text,
  creada timestamptz not null default now()
);
create index on public.visitas (casa_id, inicio desc);

-- ---------- Seguridad: cada usuaria ve y edita solo lo suyo ----------
alter table public.casas enable row level security;
alter table public.visitas enable row level security;

-- Permisos explícitos (los proyectos nuevos de Supabase no siempre los dan solos).
-- Las visitantes anónimas no tocan las tablas: el dueño lee solo a través de informe_publico.
grant select, insert, update, delete on public.casas, public.visitas to authenticated;
revoke all on public.casas, public.visitas from anon;

create policy "mis casas" on public.casas
  for all to authenticated
  using (usuario = auth.uid()) with check (usuario = auth.uid());

create policy "mis visitas" on public.visitas
  for all to authenticated
  using (usuario = auth.uid())
  with check (
    usuario = auth.uid()
    and exists (select 1 from public.casas c where c.id = casa_id and c.usuario = auth.uid())
  );

-- ---------- Informe público (lo que ve el dueño con su link) ----------
-- Devuelve solo nombre y dirección de la casa + sus visitas. Nada de notas internas ni teléfonos.
create or replace function public.informe_publico(p_token text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select case when c.id is null then null else json_build_object(
    'casa', json_build_object('nombre', c.nombre, 'direccion', c.direccion, 'foto', c.foto),
    'visitas', coalesce((
      select json_agg(json_build_object(
        'id', v.id, 'tipo', v.tipo, 'inicio', v.inicio, 'fin', v.fin,
        'items', v.items, 'fotos', v.fotos, 'notas', v.notas
      ) order by v.inicio desc)
      from public.visitas v where v.casa_id = c.id
    ), '[]'::json)
  ) end
  from (select 1) x
  left join public.casas c on c.token = p_token and length(p_token) >= 20;
$$;

revoke all on function public.informe_publico(text) from public;
grant execute on function public.informe_publico(text) to anon, authenticated;

-- ---------- Fotos ----------
-- Bucket público: cada foto tiene un nombre aleatorio imposible de adivinar.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
on conflict (id) do nothing;

create policy "subir mis fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "borrar mis fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
