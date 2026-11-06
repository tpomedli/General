export type ShareableRecipe = {
  title: string;
  author: string;
  ingredients: string[];
  directions: string[];
};

export function formatRecipe(recipe: ShareableRecipe): string {
  const ingredients = recipe.ingredients.map((item) => `- ${item}`).join("\n");
  const directions = recipe.directions.map((step, index) => `${index + 1}. ${step}`).join("\n");
  return `${recipe.title}\nby ${recipe.author}\n\nIngredients\n${ingredients}\n\nDirections\n${directions}`;
}

export function mailRecipe(recipe: ShareableRecipe): string | null {
  const href = `mailto:?subject=${encodeURIComponent(recipe.title)}&body=${encodeURIComponent(formatRecipe(recipe))}`;
  return href.length < 1800 ? href : null;
}
