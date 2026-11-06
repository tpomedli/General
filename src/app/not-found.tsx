import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty">
      <h1>That page is not in the book</h1>
      <p>
        <Link href="/">Back to all recipes</Link>
      </p>
    </section>
  );
}
