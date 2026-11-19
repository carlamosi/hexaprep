import { useState } from "react";
import { bookletUrl } from "../api";
import { t } from "../i18n";

/** Abre el booklet en su página. Si el PDF no está, avisa con un mensaje claro en lugar de romper la pantalla. */
export function BookletButton({ fuenteId, cara, pagina }: { fuenteId: string; cara: number | null; pagina: number }) {
  const [error, setError] = useState<string | null>(null);

  async function open() {
    const url = bookletUrl(fuenteId, cara);
    setError(null);
    try {
      // Se comprueba antes de abrir para poder dar un aviso claro si el PDF no está.
      const res = await fetch(url, { headers: { Range: "bytes=0-0" } });
      if (res.ok) {
        window.open(url, "_blank", "noopener");
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data && typeof data.detail === "string" ? data.detail : t("practica.booklet_falta"));
    } catch {
      setError(t("practica.booklet_falta"));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] px-4 py-2 text-[var(--lila-ink)] hover:bg-[var(--lila-soft)]"
      >
        {t("practica.booklet")} {pagina}
      </button>
      {error && (
        <p role="alert" className="w-full rounded-[11px] bg-[var(--ko-soft)] px-4 py-3 text-[var(--ko)]">
          {error}
        </p>
      )}
    </>
  );
}
