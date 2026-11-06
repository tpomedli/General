import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

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
const MAX_PER_OWNER = 300;
const MAX_BYTES = 2_000_000;
const DATA_FILE = path.join(process.cwd(), "data", "recipes.json");

type RecipeRecord = Record<string, unknown>;

type Store = { recipes: RecipeRecord[] };

const globalForStore = globalThis as typeof globalThis & { recipeBookQueue?: Promise<void> };

export class RecipeBookError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RecipeBookError";
    this.status = status;
  }
}

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

export function listRecipes(ownerKey: string): Promise<Recipe[]> {
  return enqueue(async () => {
    const store = await readStore();
    return store.recipes
      .map((record) => toRecipe(record, ownerKey))
      .filter((recipe): recipe is Recipe => recipe !== null)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  });
}

export function getRecipe(ownerKey: string, id: string): Promise<Recipe | null> {
  return enqueue(async () => {
    if (!isId(id)) return null;
    const store = await readStore();
    const record = store.recipes.find((item) => item.id === id && item.ownerKey === ownerKey);
    return record ? toRecipe(record, ownerKey) : null;
  });
}

export function createRecipe(ownerKey: string, input: RecipeInput): Promise<Recipe> {
  return enqueue(async () => {
    const store = await readStore();
    const owned = store.recipes.filter((record) => record.ownerKey === ownerKey).length;
    if (owned >= MAX_PER_OWNER) {
      throw new RecipeBookError("The book is full.", 400);
    }
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: randomUUID(),
      title: input.title,
      author: input.author,
      ingredients: input.ingredients,
      directions: input.directions,
      createdAt: now,
      updatedAt: now,
    };
    store.recipes.push({ ...recipe, ownerKey });
    await writeStore(store);
    return recipe;
  });
}

export function updateRecipe(ownerKey: string, id: string, input: RecipeInput): Promise<Recipe | null> {
  return enqueue(async () => {
    if (!isId(id)) return null;
    const store = await readStore();
    const record = store.recipes.find((item) => item.id === id && item.ownerKey === ownerKey);
    if (!record) return null;
    const updatedAt = new Date().toISOString();
    record.title = input.title;
    record.author = input.author;
    record.ingredients = input.ingredients;
    record.directions = input.directions;
    record.updatedAt = updatedAt;
    await writeStore(store);
    return toRecipe(record, ownerKey);
  });
}

export function deleteRecipe(ownerKey: string, id: string): Promise<boolean> {
  return enqueue(async () => {
    if (!isId(id)) return false;
    const store = await readStore();
    const index = store.recipes.findIndex((item) => item.id === id && item.ownerKey === ownerKey);
    if (index < 0) return false;
    store.recipes.splice(index, 1);
    await writeStore(store);
    return true;
  });
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const previous = globalForStore.recipeBookQueue ?? Promise.resolve();
  const run = previous.then(task, task);
  globalForStore.recipeBookQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readStore(): Promise<Store> {
  let raw: string;
  try {
    const info = await stat(DATA_FILE);
    if (info.size > MAX_BYTES) {
      throw new RecipeBookError("data/recipes.json is too large.", 400);
    }
    raw = await readFile(DATA_FILE, "utf8");
  } catch (error) {
    if (isNotFound(error)) return { recipes: [] };
    if (error instanceof RecipeBookError) throw error;
    throw new RecipeBookError("data/recipes.json could not be read.", 500);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { recipes?: unknown }).recipes)) {
      throw new Error("shape");
    }
    const recipes = (parsed as { recipes: unknown[] }).recipes.filter(
      (item): item is RecipeRecord => typeof item === "object" && item !== null && !Array.isArray(item),
    );
    return { recipes };
  } catch {
    throw new RecipeBookError("data/recipes.json is not valid JSON with a recipes array.", 500);
  }
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = path.join(path.dirname(DATA_FILE), `.recipes-${process.pid}.tmp`);
  const body = JSON.stringify({ recipes: store.recipes }, null, 2) + "\n";
  if (Buffer.byteLength(body) > MAX_BYTES) {
    throw new RecipeBookError("That recipe would make data/recipes.json too large.", 400);
  }
  await writeFile(tmp, body, "utf8");
  await rename(tmp, DATA_FILE);
}

function toRecipe(record: RecipeRecord, ownerKey: string): Recipe | null {
  if (record.ownerKey !== ownerKey) return null;
  if (typeof record.id !== "string" || !isId(record.id)) return null;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const author = typeof record.author === "string" ? record.author.trim() : "";
  const ingredients = asStringList(record.ingredients);
  const directions = asStringList(record.directions);
  if (title === "" || author === "" || !ingredients || !directions) return null;
  if (ingredients.length === 0 || directions.length === 0) return null;
  return {
    id: record.id,
    title,
    author,
    ingredients,
    directions,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
}

function asStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const line = item.trim();
    if (line === "") continue;
    items.push(line);
  }
  return items;
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

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}
