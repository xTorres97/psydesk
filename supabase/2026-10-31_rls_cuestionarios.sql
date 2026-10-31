-- PsyDesk · Cerrar acceso anónimo a los envíos de tests
-- El cuestionario público ahora pasa por /api/cuestionario/[token] (service role),
-- así que el rol anon ya no necesita leer ni escribir estas tablas.

-- 1) Ver las políticas actuales (informativo)
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('test_submissions', 'custom_test_submissions')
order by tablename, policyname;

-- 2) Borrar las políticas que dejan pasar a anon/public sin chequear auth.uid()
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('test_submissions', 'custom_test_submissions')
      and (roles && array['anon', 'public']::name[])
      and coalesce(qual, '') not ilike '%auth.uid()%'
      and coalesce(with_check, '') not ilike '%auth.uid()%'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    raise notice 'Política eliminada: %.%', r.tablename, r.policyname;
  end loop;
end $$;

-- 3) Asegurar RLS activo y una política de dueño para el profesional
alter table public.test_submissions        enable row level security;
alter table public.custom_test_submissions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='test_submissions' and policyname='owner_all') then
    create policy owner_all on public.test_submissions for all to authenticated
      using (psychologist_id = auth.uid()) with check (psychologist_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='custom_test_submissions' and policyname='owner_all') then
    create policy owner_all on public.custom_test_submissions for all to authenticated
      using (psychologist_id = auth.uid()) with check (psychologist_id = auth.uid());
  end if;
end $$;

-- 4) Comprobar cómo quedó
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename in ('test_submissions', 'custom_test_submissions')
order by tablename, policyname;
