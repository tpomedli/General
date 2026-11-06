import { guardMutation, json, readJson } from "@/lib/http";
import { deleteRecipe, parseRecipeInput, updateRecipe } from "@/lib/recipes";
import { currentViewer, ownerKey } from "@/lib/viewer";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  const viewer = await currentViewer(request);
  if (viewer instanceof Response) return viewer;
  const parsed = parseRecipeInput(await readJson(request));
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { id } = await context.params;
  const recipe = await updateRecipe(ownerKey(viewer), id, parsed.value);
  if (!recipe) return json({ error: "That recipe is not in your book." }, 404);
  return json({ id: recipe.id });
}

export async function DELETE(request: Request, context: Context) {
  const blocked = guardMutation(request);
  if (blocked) return blocked;
  const viewer = await currentViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id } = await context.params;
  const removed = await deleteRecipe(ownerKey(viewer), id);
  if (!removed) return json({ error: "That recipe is not in your book." }, 404);
  return new Response(null, { status: 204, headers: { "cache-control": "private, no-store" } });
}
