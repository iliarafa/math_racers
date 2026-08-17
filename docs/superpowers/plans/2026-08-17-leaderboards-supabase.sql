create table if not exists fp_leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  player_name text not null,
  circuit_id varchar(20) not null,
  circuit_name varchar(50) not null,
  operation varchar(20) not null,
  score integer not null,
  total_time integer not null,
  mistakes integer not null,
  accuracy integer not null,
  difficulty_achieved varchar(20) not null,
  created_at timestamptz default now()
);

create unique index if not exists fp_leaderboard_player_circuit_op
  on fp_leaderboard (player_id, circuit_id, operation);

alter table fp_leaderboard enable row level security;

create policy "fp_leaderboard_select" on fp_leaderboard for select using (true);
create policy "fp_leaderboard_insert" on fp_leaderboard for insert with check (true);
create policy "fp_leaderboard_update" on fp_leaderboard for update using (true);

create table if not exists gp_weekend_leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  player_name text not null,
  circuit_id varchar(20) not null,
  circuit_name varchar(50) not null,
  operation varchar(20) not null,
  score integer not null,
  total_time integer not null,
  mistakes integer not null,
  accuracy integer not null,
  difficulty_achieved varchar(20) not null,
  pole_position boolean not null default false,
  created_at timestamptz default now()
);

create unique index if not exists gp_weekend_player_circuit_op
  on gp_weekend_leaderboard (player_id, circuit_id, operation);

alter table gp_weekend_leaderboard enable row level security;

create policy "gp_weekend_select" on gp_weekend_leaderboard for select using (true);
create policy "gp_weekend_insert" on gp_weekend_leaderboard for insert with check (true);
create policy "gp_weekend_update" on gp_weekend_leaderboard for update using (true);
