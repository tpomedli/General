"use client";

import { useEffect, useId, useRef, useState } from "react";
import { recipeFileName, recipeHtml, type ShareableRecipe } from "@/lib/recipe-html";

export function ShareRecipe({ recipe }: { recipe: ShareableRecipe }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const html = recipeHtml(recipe);
  const filename = recipeFileName(recipe.title);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function shareFile() {
    setNotice("");
    const file = new File([html], filename, { type: "text/html" });
    try {
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: recipe.title });
        setNotice("Shared the HTML file.");
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(`Saved ${filename}`);
  }

  return (
    <>
      <button className="ghost" type="button" onClick={() => { setNotice(""); setOpen(true); }}>
        Share
      </button>
      {open ? (
        <div className="share-backdrop" onClick={() => setOpen(false)}>
          <div
            className="share-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            ref={dialogRef}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="share-head">
              <h2 id={titleId}>Send this recipe</h2>
              <button className="ghost" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <p className="lede">An HTML file, with artwork for the dish.</p>
            <iframe className="share-frame" title={`${recipe.title} HTML file`} sandbox="" srcDoc={html} />
            <div className="actions">
              <button className="primary" type="button" onClick={shareFile}>
                Share HTML file
              </button>
            </div>
            {notice ? <p className="share-notice">{notice}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
