import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/RecipeForm";
import { SignedOut } from "@/components/SignedOut";
import { getRecipe } from "@/lib/recipes";
import { currentViewer, ownerKey } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await currentViewer();
  if (viewer instanceof Response) return <SignedOut />;
  const { id } = await params;
  const recipe = await getRecipe(ownerKey(viewer), id);
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
