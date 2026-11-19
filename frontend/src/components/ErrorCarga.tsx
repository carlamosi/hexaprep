import { t } from "../i18n";

/** Pantalla de error al cargar: centrada, con salida clara (reintentar) y sin texto suelto. */
export function ErrorCarga({ onReintentar = () => window.location.reload() }: { onReintentar?: () => void }) {
  return (
    <main className="wrap">
      <div role="alert" className="error-carga">
        <span className="error-carga-hex" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <path d="M32 21v16" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="32" cy="45" r="2.3" fill="currentColor" />
          </svg>
        </span>
        <h1>{t("error.titulo")}</h1>
        <p>{t("error.detalle")}</p>
        <button type="button" onClick={onReintentar}>{t("error.reintentar")}</button>
      </div>
    </main>
  );
}
