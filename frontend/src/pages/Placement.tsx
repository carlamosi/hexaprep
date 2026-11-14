import { useEffect, useRef, useState } from "react";
import { api, type MapResponse } from "../api";
import { HexMap } from "../components/HexMap";
import { Practice } from "../components/Practice";
import { t } from "../i18n";
import { clearSession, openSession } from "../session";

const TOTAL = 15;
const KEY = (asignaturaId: string) => `hexaprep.sesion.nivel.${asignaturaId}`;
type Client = Pick<typeof api, "createSession" | "nextQuestion" | "answer" | "reportQuestion" | "getMap"> & Partial<Pick<typeof api, "getSession">>;

/** Test de nivel: 15 preguntas sin feedback entre ellas; al terminar muestra el panal actualizado. */
export function Placement({ asignaturaId, client = api, onFinish }: { asignaturaId: string; client?: Client; onFinish: () => void }) {
  const [sid, setSid] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [answered, setAnswered] = useState(0);
  const [map, setMap] = useState<MapResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    openSession(KEY(asignaturaId), client, () => client.createSession("nivel", { asignatura_id: asignaturaId }))
      .then((o) => { setSid(o.sid); setAviso(o.aviso); setAnswered(o.answered); })
      .catch(() => setFailed(true));
  }, [asignaturaId, client]);

  async function finish() {
    clearSession(KEY(asignaturaId));
    try {
      setMap(await client.getMap(asignaturaId));
    } catch {
      setFailed(true);
    }
  }

  if (failed) return <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  if (map) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold">{t("nivel.resultado")}</h1>
        <HexMap hexes={map.hexes} subtemas={map.subtemas} onSelect={() => undefined} />
        <button type="button" onClick={onFinish} className="mt-6 rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-white shadow-[3px_3px_0_var(--lila)]">
          {t("nivel.ir_panal")}
        </button>
      </section>
    );
  }
  if (!sid) return <p role="status" className="px-4 py-8 text-[var(--ink-3)]">{t("app.cargando")}</p>;
  return (
    <section className="px-4 py-6">
      {aviso && <p role="status" className="mx-auto mb-4 max-w-3xl rounded-[11px] bg-[var(--lila-soft)] px-4 py-3">{aviso}</p>}
      <Practice sesionId={sid} client={client} sinFeedback total={TOTAL} initialAnswered={answered} onDone={() => void finish()} />
    </section>
  );
}
