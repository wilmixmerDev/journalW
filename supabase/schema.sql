-- Journal W — schema base. Ejecutar en un proyecto de Supabase nuevo.

create extension if not exists "pgcrypto";

-- Los grants son independientes de las políticas RLS de abajo; sin ellos da "permission denied" aunque RLS lo permita.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  journal_type text not null default 'live' check (journal_type in ('live', 'backtest')),
  status text not null default 'closed' check (status in ('open', 'closed')),

  instrument text not null,
  market text not null,
  direction text not null check (direction in ('long', 'short')),

  entry_price numeric,
  stop_price numeric,
  take_profit_price numeric,

  risk_percent numeric not null,
  result_type text check (result_type in ('tp', 'sl', 'be')),
  quality text check (quality in ('a_plus', 'a', 'b', 'c', 'd')),

  setup text,
  timeframe text,
  emotion_before text,
  emotion_after text,
  tags text[] not null default '{}',

  entered_at timestamptz not null default now(),
  exited_at timestamptz,

  strategy text,
  session text,
  screenshots jsonb not null default '[]', -- [{ url, category: 'before'|'during'|'after' }]

  pnl numeric, -- porcentaje de la cuenta ganado/perdido, no dinero
  r_multiple numeric,
  discipline_checklist text[] not null default '{}',
  discipline_score numeric not null default 0,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trades_user_id_idx on public.trades (user_id);
create index if not exists trades_user_journal_idx on public.trades (user_id, journal_type);
create index if not exists trades_entered_at_idx on public.trades (entered_at desc);

grant select, insert, update, delete on public.trades to anon, authenticated, service_role;

create table if not exists public.trade_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  journal_type text not null check (journal_type in ('live', 'backtest')),
  kind text not null check (kind in ('setup', 'strategy', 'tag', 'timeframe')),
  parent text not null default '', -- for kind='setup', the strategy this setup belongs to
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, journal_type, kind, parent, name)
);

grant select, insert, update, delete on public.trade_options to anon, authenticated, service_role;

create index if not exists trade_options_lookup_idx on public.trade_options (user_id, journal_type, kind);

alter table public.trade_options enable row level security;

drop policy if exists "trade_options_select_own" on public.trade_options;
create policy "trade_options_select_own" on public.trade_options
  for select using (auth.uid() = user_id);

drop policy if exists "trade_options_insert_own" on public.trade_options;
create policy "trade_options_insert_own" on public.trade_options
  for insert with check (auth.uid() = user_id);

-- Favoritos de autorrelleno: combinaciones frecuentes (mercado, instrumento, estrategia...) que el
-- usuario guarda con nombre para rellenar el formulario de nueva operación de un toque.
create table if not exists public.trade_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  journal_type text not null check (journal_type in ('live', 'backtest')),
  name text not null,
  market text,
  instrument text,
  strategy text,
  setup text,
  timeframe text,
  session text,
  discipline_checklist text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, journal_type, name)
);

grant select, insert, update, delete on public.trade_presets to anon, authenticated, service_role;

create index if not exists trade_presets_lookup_idx on public.trade_presets (user_id, journal_type);

alter table public.trade_presets enable row level security;

drop policy if exists "trade_presets_select_own" on public.trade_presets;
create policy "trade_presets_select_own" on public.trade_presets
  for select using (auth.uid() = user_id);

drop policy if exists "trade_presets_insert_own" on public.trade_presets;
create policy "trade_presets_insert_own" on public.trade_presets
  for insert with check (auth.uid() = user_id);

drop policy if exists "trade_presets_update_own" on public.trade_presets;
create policy "trade_presets_update_own" on public.trade_presets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "trade_presets_delete_own" on public.trade_presets;
create policy "trade_presets_delete_own" on public.trade_presets
  for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

alter table public.trades enable row level security;

drop policy if exists "trades_select_own" on public.trades;
create policy "trades_select_own" on public.trades
  for select using (auth.uid() = user_id);

drop policy if exists "trades_insert_own" on public.trades;
create policy "trades_insert_own" on public.trades
  for insert with check (auth.uid() = user_id);

drop policy if exists "trades_update_own" on public.trades;
create policy "trades_update_own" on public.trades
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "trades_delete_own" on public.trades;
create policy "trades_delete_own" on public.trades
  for delete using (auth.uid() = user_id);

-- Roles de usuario (normal vs admin). Una fila por usuario, creada automáticamente al registrarse.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  -- Si es true, este usuario no está obligado a configurar 2FA. Solo lo administra un admin.
  mfa_exempt boolean not null default false,
  -- Datos de onboarding, recolectados una vez tras el registro (info personal + de trading).
  first_name text,
  last_name text,
  phone text,
  country text,
  birth_date date,
  experience_level text check (experience_level in ('principiante', 'intermedio', 'avanzado', 'profesional')),
  markets text[] not null default '{}',
  initial_capital numeric,
  timezone text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotente para bases donde la tabla ya existía antes de agregar estas columnas.
alter table public.profiles add column if not exists mfa_exempt boolean not null default false;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists experience_level text check (experience_level in ('principiante', 'intermedio', 'avanzado', 'profesional'));
alter table public.profiles add column if not exists markets text[] not null default '{}';
alter table public.profiles add column if not exists initial_capital numeric;
alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
-- Verificación obligatoria de 2FA por correo (el TOTP queda como factor opcional adicional).
alter table public.profiles add column if not exists email_mfa_verified_at timestamptz;

grant select, insert, update on public.profiles to anon, authenticated, service_role;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Sin política de update para usuarios normales: role/mfa_exempt los administra solo un admin.
drop policy if exists "profiles_update_own" on public.profiles;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea automáticamente una fila de perfil cada vez que se registra un usuario nuevo.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bucket de storage para las capturas de gráficos de las operaciones.
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', true)
on conflict (id) do nothing;

drop policy if exists "trade_screenshots_read" on storage.objects;
create policy "trade_screenshots_read" on storage.objects
  for select using (bucket_id = 'trade-screenshots');

drop policy if exists "trade_screenshots_write_own" on storage.objects;
create policy "trade_screenshots_write_own" on storage.objects
  for insert with check (
    bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "trade_screenshots_delete_own" on storage.objects;
create policy "trade_screenshots_delete_own" on storage.objects
  for delete using (
    bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Códigos de un solo uso para el 2FA por correo (registro, login, cambios sensibles en Configuración).
-- Sin políticas RLS a propósito: solo el service_role (que salta RLS) debe tocar esta tabla.
create table if not exists public.mfa_email_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  purpose text not null check (purpose in ('enroll', 'login', 'security')),
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mfa_email_codes_user_purpose_idx on public.mfa_email_codes (user_id, purpose, created_at desc);

alter table public.mfa_email_codes enable row level security;
revoke all on public.mfa_email_codes from anon, authenticated;
grant select, insert, update, delete on public.mfa_email_codes to service_role;

-- Marca "ya verificó su 2FA en esta sesión", equivalente casero al AAL2 nativo de Supabase.
create table if not exists public.mfa_email_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists mfa_email_sessions_token_idx on public.mfa_email_sessions (token_hash);
create index if not exists mfa_email_sessions_user_idx on public.mfa_email_sessions (user_id);

alter table public.mfa_email_sessions enable row level security;
revoke all on public.mfa_email_sessions from anon, authenticated;
grant select, insert, update, delete on public.mfa_email_sessions to service_role;
