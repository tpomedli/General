"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar() {
  const path = usePathname();
  const editing = path.match(/^\/recipes\/([^/]+)\/edit$/);
  const writing = path === "/recipes/new" || editing !== null;
  const closeHref = editing ? `/recipes/${editing[1]}` : "/";

  return (
    <header className="topbar">
      <Link className="mark" href="/">
        Recipe Book
      </Link>
      {writing ? (
        <Link className="close-link" href={closeHref}>
          Close
        </Link>
      ) : (
        <Link className="plus" href="/recipes/new" aria-label="Add recipe">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
          </svg>
        </Link>
      )}
    </header>
  );
}
