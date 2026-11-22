import type { Analytics } from "../../api";
import { olvidoProximo } from "./datos";

/** Lo que recordarás de cada tema dentro de 7 días si no repasas; la parte rayada es lo que perderías. */
export function Repasar({ olvido }: { olvido: Analytics["olvido"] }) {
  const xs = olvidoProximo(olvido);
  return (
    <>
      <ul className="hp-rp-l">
        {xs.map((x) => (
          <li key={x.id}>
            <div className="hp-rp-cab"><b>{x.nombre}</b><span>{x.ahora} % hoy, {x.d7} % en 7 días</span></div>
            <div className="hp-rp-barra" aria-hidden="true">
              <i className="hp-rp-queda" style={{ width: `${x.d7}%` }} />
              <i className="hp-rp-pierde" style={{ left: `${x.d7}%`, width: `${Math.max(0, x.ahora - x.d7)}%` }} />
              <i className="hp-rp-umbral" style={{ left: `${olvido.umbral}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="hp-nota-chica">La línea negra marca el {olvido.umbral} %.</p>
      <a className="hp-cta" href="#hoy">Repasar hoy</a>
    </>
  );
}
