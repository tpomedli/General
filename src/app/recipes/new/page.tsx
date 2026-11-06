import { RecipeForm } from "@/components/RecipeForm";
import { SignedOut } from "@/components/SignedOut";
import { currentViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const viewer = await currentViewer();
  if (viewer instanceof Response) return <SignedOut />;

  return (
    <section className="entry">
      <h1>New recipe</h1>
      <p className="lede">Write the title, who it is by, then add each ingredient and direction.</p>
      <RecipeForm mode="create" />
    </section>
  );
}
