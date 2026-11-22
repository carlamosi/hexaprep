import { useEffect, useRef, useState } from "react";
import type { MapResponse } from "../api";
import { t } from "../i18n";

type Hex = MapResponse["hexes"][number];
const plano = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Conceptos cuyo nombre, subtema o tema contienen el texto (sin acentos ni mayúsculas). */
export function buscar(hexes: Hex[], texto: string): Hex[] {
  const q = plano(texto.trim());
  if (!q) return [];
  return hexes.filter((h) => plano(`${h.nombre} ${h.subtema} ${h.tema}`).includes(q)).slice(0, 12);
}

const ANCHO = 352; // 22rem, el ancho máximo del cuadro

/** Lupa discreta: abre un cuadro de búsqueda y lleva al subtema del resultado elegido. */
export function Buscador({ hexes, onElegir }: { hexes: Hex[]; onElegir: (subtemaId: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [alinea, setAlinea] = useState("left-0");
  const caja = useRef<HTMLInputElement>(null);
  useEffect(() => { if (abierto) caja.current?.focus(); }, [abierto]);
  const res = buscar(hexes, texto);
  return (
    <div className="relative">
      <button type="button" aria-label={t("buscar.lupa")} aria-expanded={abierto}
        onClick={(e) => {
          // el cuadro crece hacia donde hay sitio (la lupa suele estar pegada al borde izquierdo)
          const r = e.currentTarget.getBoundingClientRect();
          const ancho = Math.min(ANCHO, window.innerWidth - 32);
          setAlinea(r.left + ancho > window.innerWidth - 8 ? "right-0" : "left-0");
          setAbierto((a) => !a);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] text-[var(--ink-2)]">
        <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      {abierto && (
        <div className={`absolute ${alinea} z-20 mt-2 w-[min(calc(100vw-2rem),22rem)] rounded-[14px] border border-[var(--ink)] bg-[var(--card)] p-3 shadow-[4px_4px_0_var(--lila)] pop-in ${alinea === "left-0" ? "origen-izq" : "origen-der"}`}
          onKeyDown={(e) => { if (e.key === "Escape") setAbierto(false); }}>
          <input ref={caja} type="search" role="searchbox" aria-label={t("buscar.etiqueta")} placeholder={t("buscar.etiqueta")} value={texto}
            onChange={(e) => setTexto(e.target.value)} autoComplete="off" className="w-full rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] px-3 py-2 text-base" />
          {texto.trim() !== "" && (
            <ul className="mt-2 max-h-72 overflow-auto">
              {res.length === 0 && <li className="px-2 py-2 text-sm text-[var(--ink-3)]">{t("buscar.nada")}</li>}
              {res.map((h) => (
                <li key={h.concepto_id}>
                  <button type="button" onClick={() => { setAbierto(false); setTexto(""); onElegir(h.subtema_id); }} className="block min-h-11 w-full rounded-[8px] px-2 py-1.5 text-left hover:bg-[var(--lila-soft)]">
                    <span className="block text-sm font-medium">{h.nombre}</span>
                    <span className="block text-xs text-[var(--ink-3)]">{h.tema} · {h.subtema}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
