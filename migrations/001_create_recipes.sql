create table if not exists recipes (
  id text primary key,
  owner_key text not null,
  title text not null,
  author text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_owner_created_idx
  on recipes (owner_key, created_at desc);

create table if not exists recipe_ingredients (
  id text primary key,
  recipe_id text not null references recipes (id) on delete cascade,
  position integer not null,
  body text not null
);

create index if not exists recipe_ingredients_recipe_idx
  on recipe_ingredients (recipe_id, position);

create table if not exists recipe_steps (
  id text primary key,
  recipe_id text not null references recipes (id) on delete cascade,
  position integer not null,
  body text not null
);

create index if not exists recipe_steps_recipe_idx
  on recipe_steps (recipe_id, position);
