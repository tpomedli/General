"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";

type Initial = {
  title: string;
  author: string;
  ingredients: string[];
  directions: string[];
};

type Props = {
  mode: "create" | "edit";
  recipeId?: string;
  initial?: Initial;
};

const blank: Initial = { title: "", author: "", ingredients: [""], directions: [""] };

export function RecipeForm({ mode, recipeId, initial }: Props) {
  const router = useRouter();
  const baseId = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [ingredients, setIngredients] = useState(initial?.ingredients.length ? initial.ingredients : blank.ingredients);
  const [directions, setDirections] = useState(initial?.directions.length ? initial.directions : blank.directions);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [focus, setFocus] = useState<{ kind: "ingredient" | "direction"; index: number } | null>(null);

  useEffect(() => {
    if (!focus) return;
    document.getElementById(`${baseId}-${focus.kind}-${focus.index}`)?.focus();
  }, [baseId, focus, ingredients.length, directions.length]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const payload = {
      title,
      author,
      ingredients: ingredients.map((line) => line.trim()).filter(Boolean),
      directions: directions.map((line) => line.trim()).filter(Boolean),
    };
    const path = mode === "create" ? "/api/recipes" : `/api/recipes/${recipeId}`;
    try {
      const response = await fetch(path, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok || !body?.id) {
        setError(body?.error || "The recipe could not be saved.");
        setPending(false);
        return;
      }
      router.push(`/recipes/${body.id}`);
      router.refresh();
    } catch {
      setError("The recipe could not be saved.");
      setPending(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="fields">
        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            placeholder="Weeknight tomato soup"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Author</span>
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            maxLength={80}
            required
            placeholder="Your name"
            autoComplete="name"
          />
        </label>
      </div>

      <section>
        <div className="section-head">
          <h2>Ingredients</h2>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setIngredients((rows) => [...rows, ""]);
              setFocus({ kind: "ingredient", index: ingredients.length });
            }}
          >
            Add ingredient
          </button>
        </div>
        <ol className="lines">
          {ingredients.map((value, index) => (
            <li className="line" key={`ingredient-${index}`}>
              <span className="row-label">{index + 1}</span>
              <input
                id={`${baseId}-ingredient-${index}`}
                aria-label={`Ingredient ${index + 1}`}
                value={value}
                maxLength={400}
                placeholder={index === 0 ? "2 cloves garlic" : "Next ingredient"}
                onChange={(event) => {
                  const next = [...ingredients];
                  next[index] = event.target.value;
                  setIngredients(next);
                }}
              />
              <button
                className="icon-button"
                type="button"
                aria-label={`Remove ingredient ${index + 1}`}
                onClick={() => {
                  setIngredients((rows) => (rows.length === 1 ? [""] : rows.filter((_, row) => row !== index)));
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="section-head">
          <h2>Directions</h2>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setDirections((rows) => [...rows, ""]);
              setFocus({ kind: "direction", index: directions.length });
            }}
          >
            Add direction
          </button>
        </div>
        <ol className="lines">
          {directions.map((value, index) => (
            <li className="line" key={`direction-${index}`}>
              <span className="row-label">{index + 1}</span>
              <textarea
                id={`${baseId}-direction-${index}`}
                aria-label={`Direction ${index + 1}`}
                value={value}
                maxLength={400}
                rows={2}
                placeholder={index === 0 ? "Simmer until the tomatoes break down." : "Next step"}
                onChange={(event) => {
                  const next = [...directions];
                  next[index] = event.target.value;
                  setDirections(next);
                }}
              />
              <button
                className="icon-button"
                type="button"
                aria-label={`Remove direction ${index + 1}`}
                onClick={() => {
                  setDirections((rows) => (rows.length === 1 ? [""] : rows.filter((_, row) => row !== index)));
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="actions">
        <button className="primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Save recipe" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
