import Link from "next/link";
import { SignedOut } from "@/components/SignedOut";
import { listRecipes } from "@/lib/recipes";
import { currentViewer, ownerKey } from "@/lib/viewer";

export const dynamic = "force-dynamic";

function preview(ingredients: string[]): string {
  if (ingredients.length === 0) return "No ingredients yet";
  const shown = ingredients.slice(0, 3).join(" · ");
  const extra = ingredients.length - 3;
  return extra > 0 ? `${shown} · and ${extra} more` : shown;
}

export default async function HomePage() {
  const viewer = await currentViewer();
  if (viewer instanceof Response) return <SignedOut />;
  const recipes = await listRecipes(ownerKey(viewer));

  if (recipes.length === 0) {
    return (
      <section className="empty">
        <h1>The book is open</h1>
        <p>Nothing is written in it yet. Use the plus in the top right to add a title, an author, ingredients, and directions.</p>
      </section>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recipes</h1>
          <p className="lede">
            {recipes.length === 1 ? "1 recipe in the book" : `${recipes.length} recipes in the book`}
          </p>
        </div>
      </div>
      <div className="grid">
        {recipes.map((recipe) => (
          <Link className="card" href={`/recipes/${recipe.id}`} key={recipe.id}>
            <div>
              <h2>{recipe.title}</h2>
              <p className="byline">by {recipe.author}</p>
            </div>
            <p className="preview">{preview(recipe.ingredients)}</p>
            <p className="meta">
              {recipe.ingredients.length} {recipe.ingredients.length === 1 ? "ingredient" : "ingredients"}
              {" · "}
              {recipe.directions.length} {recipe.directions.length === 1 ? "step" : "steps"}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
