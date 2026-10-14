-- Correct the already-applied LLMX schema without changing existing project rows.
drop policy if exists llmx_owner_insert on public.llmx_projects;
revoke insert on public.llmx_projects from anon,authenticated;
