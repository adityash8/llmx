-- Fresh LLMX schema. Product tables are private by default.
create table if not exists public.llmx_projects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 120), domain text not null,
 urls jsonb not null check(jsonb_array_length(urls) between 1 and 500), rules jsonb not null default '[]',
 excluded_urls jsonb not null default '[]' check(jsonb_typeof(excluded_urls)='array' and jsonb_array_length(excluded_urls)<=500),
 content text not null check(length(content)<=100000), proof text not null,
 verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id)
);
alter table public.llmx_projects enable row level security;
create policy llmx_owner_read on public.llmx_projects for select to authenticated using(user_id=auth.uid());
create policy llmx_owner_delete on public.llmx_projects for delete to authenticated using(user_id=auth.uid());
-- Verified status, generated updates and refresh are server-owned, never caller-controlled.
grant select,delete on public.llmx_projects to authenticated;
revoke insert on public.llmx_projects from anon,authenticated;
revoke update on public.llmx_projects from authenticated;
create table if not exists public.llmx_github_tokens(user_id uuid primary key references auth.users(id) on delete cascade, encrypted_token text not null);
alter table public.llmx_github_tokens enable row level security;
revoke all on public.llmx_github_tokens from anon,authenticated;
create table if not exists public.llmx_oauth_states(state_hash text primary key,user_id uuid not null references auth.users(id) on delete cascade,expires_at timestamptz not null);
alter table public.llmx_oauth_states enable row level security;
revoke all on public.llmx_oauth_states from anon,authenticated;
create table if not exists public.llmx_usage(user_id uuid primary key references auth.users(id) on delete cascade, day date not null default current_date, count integer not null default 0);
alter table public.llmx_usage enable row level security;
revoke all on public.llmx_usage from anon,authenticated;
create or replace function public.llmx_consume_usage(p_user uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare used integer;
begin
 insert into llmx_usage(user_id,day,count) values(p_user,current_date,1)
 on conflict(user_id) do update set day=current_date,count=case when llmx_usage.day=current_date then llmx_usage.count+1 else 1 end
 returning count into used;
 return used<=10;
end $$;
revoke all on function public.llmx_consume_usage(uuid) from public,anon,authenticated;
grant execute on function public.llmx_consume_usage(uuid) to service_role;
