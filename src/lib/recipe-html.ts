import { recipeArtwork } from "./recipe-art";

export type ShareableRecipe = {
  title: string;
  author: string;
  ingredients: string[];
  directions: string[];
};

export function recipeFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "recipe"}.html`;
}

export function recipeHtml(recipe: ShareableRecipe): string {
  const title = escapeHtml(recipe.title);
  const author = escapeHtml(recipe.author);
  const ingredients = recipe.ingredients.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const directions = recipe.directions.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #efe4d2;
    color: #241c15;
    font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
  }
  main {
    max-width: 720px;
    margin: 28px auto;
    background: #fffaf3;
    border: 1px solid #e3d4c0;
    border-radius: 28px;
    overflow: hidden;
  }
  figure { margin: 0; }
  figure svg { display: block; width: 100%; height: auto; }
  .sheet { padding: 28px 32px 40px; }
  h1 {
    margin: 0;
    font-size: clamp(2.2rem, 5vw, 3.4rem);
    font-weight: 560;
    letter-spacing: -0.03em;
    line-height: 1.05;
  }
  .by { margin: 8px 0 0; font-style: italic; color: #6f6256; }
  h2 {
    margin: 28px 0 0;
    font-family: "Avenir Next", "Segoe UI", sans-serif;
    font-size: 0.78rem;
    font-weight: 650;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6f6256;
  }
  ul, ol { margin: 8px 0 0; padding: 0 0 0 1.2rem; }
  li { padding: 8px 0; border-top: 1px solid #e3d4c0; }
  ol li::marker { color: #b6402c; font-weight: 650; }
</style>
</head>
<body>
<main>
  <figure>${recipeArtwork(recipe.title)}</figure>
  <div class="sheet">
    <h1>${title}</h1>
    <p class="by">by ${author}</p>
    <h2>Ingredients</h2>
    <ul>${ingredients}</ul>
    <h2>Directions</h2>
    <ol>${directions}</ol>
  </div>
</main>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
