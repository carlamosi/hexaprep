import { useEffect, useRef, type ReactNode } from "react";
import { t } from "../i18n";

/** Hoja sobre la pantalla: sube desde abajo en móvil y es un diálogo centrado en escritorio. Escape, el fondo o «Cerrar» la cierran,
 * el foco empieza en «Cerrar» y no sale de la hoja con el tabulador, y la página de detrás no se desplaza. */
export function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  const cerrar = useRef<HTMLButtonElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    cerrar.current?.focus();
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCerrar(); }
      if (e.key !== "Tab") return;
      const f = [...(hoja.current?.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea") ?? [])].filter((x) => !x.hasAttribute("disabled"));
      if (!f.length) return;
      const [a, z] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("keydown", tecla); document.body.style.overflow = previo; };
  }, [onCerrar]);
  return (
    <div className="hoja-fondo" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div ref={hoja} className="hoja" role="dialog" aria-modal="true" aria-labelledby="hoja-t">
        <span className="hoja-asa" aria-hidden="true" />
        <header className="hoja-cab">
          <h2 id="hoja-t">{titulo}</h2>
          <button ref={cerrar} type="button" className="hoja-x" aria-label={t("hoy.cerrar")} onClick={onCerrar}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
