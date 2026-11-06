import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteRecipe } from "@/components/DeleteRecipe";
import { FileNotice } from "@/components/FileNotice";
import { ShareRecipe } from "@/components/ShareRecipe";
import { SignedOut } from "@/components/SignedOut";
import { getRecipe, RecipeBookError } from "@/lib/recipes";
import { currentViewer, ownerKey } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await currentViewer();
  if (viewer instanceof Response) return <SignedOut />;
  const { id } = await params;
  let recipe;
  try {
    recipe = await getRecipe(ownerKey(viewer), id);
  } catch (error) {
    if (error instanceof RecipeBookError) return <FileNotice message={error.message} />;
    throw error;
  }
  if (!recipe) notFound();

  return (
    <article className="detail">
      <h1>{recipe.title}</h1>
      <p className="byline">by {recipe.author}</p>
      <div className="toolbar">
        <ShareRecipe
          recipe={{
            title: recipe.title,
            author: recipe.author,
            ingredients: recipe.ingredients,
            directions: recipe.directions,
          }}
        />
        <Link className="ghost" href={`/recipes/${recipe.id}/edit`}>
          Edit
        </Link>
        <DeleteRecipe id={recipe.id} />
      </div>
      <div className="spread">
        <section>
          <h2>Ingredients</h2>
          <ul className="ingredients">
            {recipe.ingredients.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Directions</h2>
          <ol className="steps">
            {recipe.directions.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}
