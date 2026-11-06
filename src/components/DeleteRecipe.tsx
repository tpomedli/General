"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteRecipe({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "The recipe could not be deleted.");
        setPending(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("The recipe could not be deleted.");
      setPending(false);
    }
  }

  return (
    <div className="actions">
      {confirming ? (
        <>
          <button className="danger" type="button" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Delete this recipe"}
          </button>
          <button className="ghost" type="button" onClick={() => setConfirming(false)} disabled={pending}>
            Cancel
          </button>
        </>
      ) : (
        <button className="ghost" type="button" onClick={() => setConfirming(true)}>
          Delete
        </button>
      )}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
