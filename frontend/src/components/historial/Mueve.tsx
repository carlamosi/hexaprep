import { UMBRAL_CAMBIO, type Pendiente } from "./datos";

/** Qué temas suben o se estancan: antes y hoy sobre un eje de 0 a 100 %. Cada fila abre la historia del tema. */
export function Mueve({ ps, onAbrir }: { ps: Pendiente[]; onAbrir: (id: string, abridor: HTMLElement) => void }) {
  return (
    <ul className="hp-mv-l">
      {ps.map((p) => {
        const clase = p.delta >= UMBRAL_CAMBIO ? "sube" : p.delta <= -UMBRAL_CAMBIO ? "baja" : "quieto";
        const dice = clase === "sube" ? `sube ${p.delta} puntos` : clase === "baja" ? `baja ${-p.delta} puntos` : "se estanca";
        return (
          <li key={p.id}>
            <button type="button" className={`hp-mv ${clase}`} onClick={(e) => onAbrir(p.id, e.currentTarget)}
              aria-label={`${p.nombre}, de ${p.antes} a ${p.ahora} %, ${dice}. Ver su historia`}>
              <span className="hp-mv-nom" aria-hidden="true">{p.nombre}</span>
              <span className="hp-mv-pista" aria-hidden="true">
                <i className="hp-mv-eje" />
                <i className="hp-mv-seg" style={{ left: `${Math.min(p.antes, p.ahora)}%`, width: `${Math.abs(p.delta)}%` }} />
                <i className="hp-mv-a" style={{ left: `${p.antes}%` }} />
                <i className="hp-mv-h" style={{ left: `${p.ahora}%` }} />
              </span>
              <span className="hp-mv-num" aria-hidden="true">{p.antes} → {p.ahora} %</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
