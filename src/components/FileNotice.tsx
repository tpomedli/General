export function FileNotice({ message }: { message: string }) {
  return (
    <section className="empty">
      <h1>The recipe file could not be read</h1>
      <p>{message}</p>
    </section>
  );
}
