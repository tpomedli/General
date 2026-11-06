import { guardMutation, json, readJson } from "@/lib/http";
import { createRecipe, parseRecipeInput } from "@/lib/recipes";
import { currentViewer, ownerKey } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  const viewer = await currentViewer(request);
  if (viewer instanceof Response) return viewer;
  const parsed = parseRecipeInput(await readJson(request));
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const recipe = await createRecipe(ownerKey(viewer), parsed.value);
  return json({ id: recipe.id }, 201);
}
