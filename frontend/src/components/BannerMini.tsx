import { useEffect, useRef, useState, type RefObject } from "react";
import { t } from "../i18n";

/** Franja fina con el nombre y el porcentaje que aparece bajo la cabecera cuando el banner se ha ido por arriba. */
export function BannerMini({ banner, nombre, percent, onAbrir, color }: {
  banner: RefObject<HTMLElement | null>; nombre: string; percent: number; onAbrir: () => void; color: string;
}) {
  const [visible, setVisible] = useState(false);
  const [cab, setCab] = useState(0); // alto de la cabecera fija: la franja se pega justo debajo
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = banner.current;
    const alto = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    setCab(alto);
    if (!el || typeof IntersectionObserver === "undefined") return;
    // fuera de la vista por arriba (no por abajo) con la cabecera descontada
    const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting && e.boundingClientRect.bottom < alto + 1),
      { rootMargin: `-${Math.round(alto)}px 0px 0px 0px`, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [banner]);
  return (
    <div className="banner-mini" ref={ref} data-visible={visible} style={{ "--b": color, "--cab": `${cab}px` } as React.CSSProperties} aria-hidden={!visible} inert={!visible}>
      <span className="banner-mini-nombre">{nombre}</span>
      <button type="button" className="banner-mini-pct" tabIndex={visible ? 0 : -1} aria-label={`${t("panal.verPanal")} ${nombre}, ${percent} %`} onClick={onAbrir}>
        {percent}<small>&nbsp;%</small>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}
