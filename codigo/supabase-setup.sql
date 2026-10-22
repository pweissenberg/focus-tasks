-- Focus Tasks: database setup for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run more than once.

-- People (name + photo shown on shared tasks)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text,
  avatar_url text,
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: signed-in people can read" on public.profiles;
create policy "profiles: signed-in people can read" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Each person's own data (tasks, tags, projects, notes, timer sessions...), one row per part
create table if not exists public.user_state (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  data jsonb,
  rev text,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);
alter table public.user_state enable row level security;
drop policy if exists "user_state: own rows only" on public.user_state;
create policy "user_state: own rows only" on public.user_state
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tasks shared between people
create table if not exists public.shared_tasks (
  id text primary key,
  owner uuid,
  members uuid[] not null default '{}',
  invited text[] not null default '{}',   -- lower-case emails of people who have not signed in yet
  passed_by uuid,
  name text not null default '',
  note text default '',
  due text default '',
  done boolean default false,
  done_at text,
  created_at text,
  updated_by uuid,
  updated_at timestamptz default now()
);
alter table public.shared_tasks enable row level security;

create or replace function public.can_see_shared(m uuid[], inv text[], passer uuid)
returns boolean language sql stable as $$
  select auth.uid() = any(m)
      or lower(coalesce(auth.jwt() ->> 'email', '')) = any(inv)
      or passer = auth.uid()
$$;

drop policy if exists "shared: read" on public.shared_tasks;
create policy "shared: read" on public.shared_tasks
  for select to authenticated using (public.can_see_shared(members, invited, passed_by));
drop policy if exists "shared: create" on public.shared_tasks;
create policy "shared: create" on public.shared_tasks
  for insert to authenticated with check (auth.uid() = any(members) or passed_by = auth.uid());
drop policy if exists "shared: edit" on public.shared_tasks;
create policy "shared: edit" on public.shared_tasks
  for update to authenticated using (public.can_see_shared(members, invited, passed_by)) with check (true);
drop policy if exists "shared: delete" on public.shared_tasks;
create policy "shared: delete" on public.shared_tasks
  for delete to authenticated using (auth.uid() = any(members) or passed_by = auth.uid());

-- Tasks in a shared project carry the project and their parent task
alter table public.shared_tasks add column if not exists project_id text;
alter table public.shared_tasks add column if not exists parent_id text;

-- Projects shared with other people (name, color, Notes, Free canvas); members see it in their sidebar
create table if not exists public.shared_projects (
  id text primary key,
  owner uuid,
  members uuid[] not null default '{}',
  invited text[] not null default '{}',   -- lower-case emails of people who have not signed in yet
  name text not null default '',
  color text,
  notes_list jsonb default '[]',
  canvas jsonb default '[]',
  strokes jsonb default '[]',
  rev text,
  updated_by uuid,
  updated_at timestamptz default now()
);
alter table public.shared_projects enable row level security;
drop policy if exists "projects: read" on public.shared_projects;
create policy "projects: read" on public.shared_projects
  for select to authenticated using (public.can_see_shared(members, invited, null));
drop policy if exists "projects: create" on public.shared_projects;
create policy "projects: create" on public.shared_projects
  for insert to authenticated with check (auth.uid() = any(members));
drop policy if exists "projects: edit" on public.shared_projects;
create policy "projects: edit" on public.shared_projects
  for update to authenticated using (public.can_see_shared(members, invited, null)) with check (true);
drop policy if exists "projects: delete" on public.shared_projects;
create policy "projects: delete" on public.shared_projects
  for delete to authenticated using (auth.uid() = any(members));

-- Live updates
do $$ begin
  alter publication supabase_realtime add table public.shared_tasks;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.shared_projects;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.user_state;
exception when duplicate_object then null; end $$;

-- Profile photos
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars: upload own" on storage.objects;
create policy "avatars: upload own" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars: replace own" on storage.objects;
create policy "avatars: replace own" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- project extras (v25): deadline, archive, files and links, activity log; task owner and board column in shared projects
alter table public.shared_projects add column if not exists due text default '';
alter table public.shared_projects add column if not exists archived boolean default false;
alter table public.shared_projects add column if not exists files jsonb default '[]';
alter table public.shared_projects add column if not exists activity jsonb default '[]';
alter table public.shared_tasks add column if not exists assignee uuid;
alter table public.shared_tasks add column if not exists doing boolean default false;

-- project plus (v26): sections, board columns, permissions, comments (one jsonb), and the task's section, board column and timeline start
alter table public.shared_projects add column if not exists extra jsonb default '{}';
alter table public.shared_tasks add column if not exists section text default '';
alter table public.shared_tasks add column if not exists col text default '';
alter table public.shared_tasks add column if not exists start text default '';
alter table public.shared_tasks add column if not exists est integer;
alter table public.shared_tasks add column if not exists micro jsonb default '[]';
alter table public.shared_tasks add column if not exists wait_for text default '';
alter table public.shared_tasks add column if not exists wait_since text;
alter table public.shared_tasks add column if not exists wait_who text default '';
alter table public.shared_tasks add column if not exists wait_what text default '';
alter table public.shared_tasks add column if not exists wait_uids jsonb default '[]';
alter table public.shared_tasks add column if not exists wait_by uuid;
alter table public.shared_tasks add column if not exists wait_done jsonb default '[]';
alter table public.shared_tasks add column if not exists wait_show boolean default true;
alter table public.shared_tasks add column if not exists defer text default '';
alter table public.shared_tasks add column if not exists glow text;
alter table public.shared_tasks add column if not exists sent_by uuid;
alter table public.shared_tasks add column if not exists sent_to jsonb default '[]';
alter table public.shared_tasks add column if not exists log jsonb default '[]';
alter table public.shared_tasks add column if not exists comments jsonb default '{}';

-- task dependencies (v62): the tasks a task waits for
alter table public.shared_tasks add column if not exists waits jsonb default '[]';

-- org chart (v64): who reports to whom. Filled from the company's employee data by an admin (service role); people can only read it.
create table if not exists public.org (
  user_id uuid primary key references auth.users on delete cascade,
  manager_id uuid references auth.users on delete set null
);
alter table public.org enable row level security;
drop policy if exists "org: everyone signed in reads" on public.org;
create policy "org: everyone signed in reads" on public.org for select to authenticated using (true);
-- true when `boss` is the manager of `who`, directly or further up the chain
create or replace function public.manages(boss uuid, who uuid) returns boolean
language sql stable security definer set search_path = public as $$
  with recursive up(id, depth) as (
    select manager_id, 1 from public.org where user_id = who
    union all
    select o.manager_id, up.depth + 1 from public.org o join up on o.user_id = up.id where up.depth < 20
  ) select exists (select 1 from up where id = boss)
$$;
-- managers read (never write) the tasks, tags and projects of the people under them
drop policy if exists "user_state: managers read their team" on public.user_state;
create policy "user_state: managers read their team" on public.user_state
  for select to authenticated using (key in ('tasks','tags','projects') and public.manages(auth.uid(), user_id));
