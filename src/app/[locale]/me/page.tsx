import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { m } from "@/lib/i18n";
import { allConcepts } from "@/lib/content";
import { MeBackup, MeStats } from "@/components/Me";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountRow } from "@/components/Account";
import { Offline } from "@/components/Offline";
import { Icon } from "@/components/Icon";

// Tú: progress, your interview date, settings and the Library: everything that isn't "do the next
// thing" lives here, one tap away from every screen (docs/specs/simplify.md).
type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return locale === "es"
    ? pageMeta(locale, "/me/", "Tú", "Tu progreso, tu fecha de entrevista, tu cuenta y la biblioteca completa.")
    : pageMeta(locale, "/me/", "You", "Your progress, your interview date, your account and the full library.");
}

export default async function Me({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  return (
    <main className="page me-page">
      <header className="page-head plain"><div><h1>{es ? "Tú" : "You"}</h1></div></header>
      <MeStats locale={locale} total={allConcepts().length} />
      <Link className="me-card me-link" href={`/${locale}/library/`}>
        <span className="hub-label">📚 {es ? "Biblioteca" : "Library"}</span>
        <strong>{es ? "Todos los temas, mapa, cheatsheet, preguntas y labs" : "Every topic, map, cheatsheet, questions and labs"}</strong>
        <Icon name="right" size={16} />
      </Link>
      <section className="me-card me-settings">
        <span className="hub-label">⚙️ {es ? "Ajustes" : "Settings"}</span>
        <div className="me-row"><span>{es ? "Tema" : "Theme"}</span><ThemeToggle label={m("theme", locale)} /></div>
        <AccountRow locale={locale} label={es ? "Cuenta y sincronización" : "Account and sync"} />
        <Offline locale={locale} />
        <MeBackup locale={locale} />
      </section>
      <p className="me-pro"><Link href={`/${locale}/pro/`}>levelup Pro ({es ? "lista de espera" : "waitlist"}) →</Link></p>
    </main>
  );
}
