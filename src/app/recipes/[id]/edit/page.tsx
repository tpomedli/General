import { notFound } from "next/navigation";
import { FileNotice } from "@/components/FileNotice";
import { RecipeForm } from "@/components/RecipeForm";
import { SignedOut } from "@/components/SignedOut";
import { getRecipe, RecipeBookError } from "@/lib/recipes";
import { currentViewer, ownerKey } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
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
    <section className="entry">
      <h1>Edit recipe</h1>
      <p className="lede">Change the title, author, ingredients, or directions.</p>
      <RecipeForm
        mode="edit"
        recipeId={recipe.id}
        initial={{
          title: recipe.title,
          author: recipe.author,
          ingredients: recipe.ingredients,
          directions: recipe.directions,
        }}
      />
    </section>
  );
}
