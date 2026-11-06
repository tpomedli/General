import { randomUUID } from "node:crypto";
import { sql, transaction } from "./db";

export type Recipe = {
  id: string;
  title: string;
  author: string;
  ingredients: string[];
  directions: string[];
  createdAt: string;
  updatedAt: string;
};

export type RecipeInput = {
  title: string;
  author: string;
  ingredients: string[];
  directions: string[];
};

const TITLE_MAX = 120;
const AUTHOR_MAX = 80;
const ITEM_MAX = 400;
const LIST_MAX = 40;

type RecipeRow = {
  id: string;
  title: string;
  author: string;
  created_at: Date | string;
  updated_at: Date | string;
  ingredients: unknown;
  directions: unknown;
};

export function parseRecipeInput(body: unknown): { ok: true; value: RecipeInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Enter a recipe." };
  }
  const record = body as Record<string, unknown>;
  const title = cleanLine(record.title, TITLE_MAX);
  const author = cleanLine(record.author, AUTHOR_MAX);
  const ingredients = cleanList(record.ingredients);
  const directions = cleanList(record.directions);
  if (title === "") return { ok: false, error: "Add a title." };
  if (author === "") return { ok: false, error: "Add an author." };
  if (ingredients === null) return { ok: false, error: "Ingredients need to be a list." };
  if (directions === null) return { ok: false, error: "Directions need to be a list." };
  if (ingredients.length === 0) return { ok: false, error: "Add at least one ingredient." };
  if (directions.length === 0) return { ok: false, error: "Add at least one direction." };
  if (ingredients.length > LIST_MAX || directions.length > LIST_MAX) {
    return { ok: false, error: `Keep each list to ${LIST_MAX} lines.` };
  }
  return { ok: true, value: { title, author, ingredients, directions } };
}

export async function listRecipes(ownerKey: string): Promise<Recipe[]> {
  const rows = await sql<RecipeRow>(
    `select r.id, r.title, r.author, r.created_at, r.updated_at,
        coalesce(
          (select json_agg(i.body order by i.position) from recipe_ingredients i where i.recipe_id = r.id),
          '[]'::json
        ) as ingredients,
        coalesce(
          (select json_agg(s.body order by s.position) from recipe_steps s where s.recipe_id = r.id),
          '[]'::json
        ) as directions
     from recipes r
     where r.owner_key = $1
     order by r.created_at desc`,
    [ownerKey],
  );
  return rows.map(toRecipe);
}

export async function getRecipe(ownerKey: string, id: string): Promise<Recipe | null> {
  if (!isId(id)) return null;
  const rows = await sql<RecipeRow>(
    `select r.id, r.title, r.author, r.created_at, r.updated_at,
        coalesce(
          (select json_agg(i.body order by i.position) from recipe_ingredients i where i.recipe_id = r.id),
          '[]'::json
        ) as ingredients,
        coalesce(
          (select json_agg(s.body order by s.position) from recipe_steps s where s.recipe_id = r.id),
          '[]'::json
        ) as directions
     from recipes r
     where r.owner_key = $1 and r.id = $2`,
    [ownerKey, id],
  );
  return rows[0] ? toRecipe(rows[0]) : null;
}

export async function createRecipe(ownerKey: string, input: RecipeInput): Promise<Recipe> {
  const id = randomUUID();
  await writeRecipe(ownerKey, id, input, true);
  const recipe = await getRecipe(ownerKey, id);
  if (!recipe) throw new Error("Recipe was not saved.");
  return recipe;
}

export async function updateRecipe(ownerKey: string, id: string, input: RecipeInput): Promise<Recipe | null> {
  if (!isId(id)) return null;
  const existing = await getRecipe(ownerKey, id);
  if (!existing) return null;
  await writeRecipe(ownerKey, id, input, false);
  return getRecipe(ownerKey, id);
}

export async function deleteRecipe(ownerKey: string, id: string): Promise<boolean> {
  if (!isId(id)) return false;
  const rows = await sql<{ id: string }>(
    "delete from recipes where id = $1 and owner_key = $2 returning id",
    [id, ownerKey],
  );
  return rows.length > 0;
}

async function writeRecipe(ownerKey: string, id: string, input: RecipeInput, creating: boolean): Promise<void> {
  await transaction(async (query) => {
    if (creating) {
      await query(
        "insert into recipes (id, owner_key, title, author) values ($1, $2, $3, $4)",
        [id, ownerKey, input.title, input.author],
      );
    } else {
      const updated = await query<{ id: string }>(
        "update recipes set title = $3, author = $4, updated_at = now() where id = $1 and owner_key = $2 returning id",
        [id, ownerKey, input.title, input.author],
      );
      if (updated.length === 0) return;
      await query("delete from recipe_ingredients where recipe_id = $1", [id]);
      await query("delete from recipe_steps where recipe_id = $1", [id]);
    }
    for (let index = 0; index < input.ingredients.length; index += 1) {
      await query(
        "insert into recipe_ingredients (id, recipe_id, position, body) values ($1, $2, $3, $4)",
        [randomUUID(), id, index, input.ingredients[index]],
      );
    }
    for (let index = 0; index < input.directions.length; index += 1) {
      await query(
        "insert into recipe_steps (id, recipe_id, position, body) values ($1, $2, $3, $4)",
        [randomUUID(), id, index, input.directions[index]],
      );
    }
  });
}

function toRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    ingredients: asStrings(row.ingredients),
    directions: asStrings(row.directions),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function asStrings(value: unknown): string[] {
  const list = typeof value === "string" ? parseJson(value) : value;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is string => typeof item === "string");
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function cleanLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const line = item.trim().replace(/[ \t]+/g, " ").replace(/\n+/g, " ");
    if (line === "") continue;
    items.push(line.slice(0, ITEM_MAX));
  }
  return items;
}

function isId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
