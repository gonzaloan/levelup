import Link from "next/link";
export default function NotFound() {
  return (
    <main className="redirect">
      <h1>404</h1>
      <p><Link href="/es/">Volver a la guía</Link> · <Link href="/en/">Back to the guide</Link></p>
    </main>
  );
}
