import { t } from "./i18n";

const NAV = ["panal", "hoy", "historial", "ajustes"] as const;

export default function App() {
  return (
    <div className="min-h-screen font-sans">
      <nav aria-label={t("nav.principal")} className="flex gap-4 border-b border-rule px-4 py-3">
        {NAV.map((k) => (
          <a key={k} href={`#${k}`} className="text-ink-2 hover:text-lila-ink">
            {t(`nav.${k}`)}
          </a>
        ))}
      </nav>
      <main className="px-4 py-8">
        <h1 className="text-3xl font-semibold">{t("app.nombre")}</h1>
      </main>
    </div>
  );
}
