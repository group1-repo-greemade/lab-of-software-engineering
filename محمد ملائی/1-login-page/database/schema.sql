create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  username text not null,
  email text not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint users_full_name_length check (char_length(full_name) between 1 and 100),
  constraint users_username_format check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  constraint users_email_length check (char_length(email) between 3 and 320)
);

create unique index if not exists users_email_unique on users (lower(email));
create unique index if not exists users_username_unique on users (lower(username));

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);

create table if not exists email_tokens (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  purpose text not null check (purpose in ('verify_email', 'reset_password')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint email_tokens_user_purpose_unique unique (user_id, purpose)
);

create index if not exists email_tokens_expires_at_idx on email_tokens(expires_at);

create table if not exists auth_rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);
