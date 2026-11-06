"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatRecipe, mailRecipe, type ShareableRecipe } from "@/lib/recipe-text";

export function ShareRecipe({ recipe }: { recipe: ShareableRecipe }) {
  const text = formatRecipe(recipe);
  const emailHref = mailRecipe(recipe);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function share() {
    setCopied(false);
    setNotice("");
    const payload: ShareData = { title: recipe.title, text };
    if (typeof navigator.share === "function") {
      const allowed = typeof navigator.canShare !== "function" || navigator.canShare(payload);
      if (allowed) {
        try {
          await navigator.share(payload);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
    }
    setOpen(true);
  }

  async function copy() {
    setNotice("");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setNotice("Copied. Paste it into a message.");
    } catch {
      setCopied(false);
      setNotice("Select the recipe below and copy it.");
    }
  }

  return (
    <>
      <button className="ghost" type="button" onClick={share}>
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
            <p className="lede">Copy it into a message, or email it.</p>
            <textarea readOnly value={text} aria-label="Recipe text" />
            <div className="actions">
              <button className="primary" type="button" onClick={copy}>
                {copied ? "Copied" : "Copy recipe"}
              </button>
              {emailHref ? (
                <a className="ghost" href={emailHref}>
                  Email
                </a>
              ) : null}
            </div>
            {notice ? <p className="share-notice">{notice}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
