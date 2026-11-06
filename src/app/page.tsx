import Link from "next/link";
// "/" has no content of its own: send the reader to their language (Spanish by default).
const GO = `(function(){var l=(navigator.language||'es').toLowerCase().indexOf('en')===0?'en':'es';location.replace('/'+l+'/')})();`;

export default function Root() {
  return (
    <main className="redirect">
      <script dangerouslySetInnerHTML={{ __html: GO }} />
      <noscript><meta httpEquiv="refresh" content="0; url=/es/" /></noscript>
      <p><Link href="/es/">Español</Link> · <Link href="/en/">English</Link></p>
    </main>
  );
}
