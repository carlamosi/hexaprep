import { useState } from "react";
import { t } from "../i18n";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

function mesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Calendario de días estudiados. Solo marca los días con práctica: sin rachas ni presión. */
export function Calendar({ dias, mes }: { dias: string[]; mes?: string }) {
  const [cursor, setCursor] = useState(mes ?? mesActual());
  const [y, m] = cursor.split("-").map(Number);
  const estudiados = new Set(dias);
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // semana que empieza en lunes
  const total = new Date(y, m, 0).getDate();

  function mover(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <section className="rounded-[16px] border border-[var(--rule)] bg-white p-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => mover(-1)} className="rounded-[11px] border border-[var(--rule-2)] px-3 py-1">
          <span className="sr-only">{t("cal.anterior")}</span>
          <span aria-hidden="true">‹</span>
        </button>
        <h2 className="font-semibold">{`${MESES[m - 1]} de ${y}`}</h2>
        <button type="button" onClick={() => mover(1)} className="rounded-[11px] border border-[var(--rule-2)] px-3 py-1">
          <span className="sr-only">{t("cal.siguiente")}</span>
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div aria-hidden="true" className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-[var(--ink-3)]">
        {SEMANA.map((d) => <span key={d}>{d}</span>)}
      </div>
      <ol className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: offset }, (_, i) => <li key={`v${i}`} aria-hidden="true" />)}
        {Array.from({ length: total }, (_, i) => {
          const dia = i + 1;
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const hecho = estudiados.has(iso);
          return (
            <li
              key={iso}
              aria-label={`${dia} de ${MESES[m - 1]}${hecho ? `, ${t("cal.estudiado")}` : ""}`}
              className={`flex aspect-square items-center justify-center rounded-[8px] text-sm tabular-nums ${
                hecho ? "bg-[var(--lila)] font-semibold text-white" : "text-[var(--ink-3)]"
              }`}
            >
              {dia}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
