import { useEffect, useState } from "react";
import { api, type QuestionContent } from "../../api";
import { t } from "../../i18n";
import { RichText } from "../RichText";

const LETRAS = ["a", "b", "c", "d"];

/** La pregunta con su respuesta correcta y su explicación, y nada de lo que respondiste. */
export function Respuesta({ preguntaId, cargar = api.getQuestion }: { preguntaId: string; cargar?: (id: string) => Promise<QuestionContent> }) {
  const [q, setQ] = useState<QuestionContent | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    cargar(preguntaId).then((c) => vivo && setQ(c)).catch(() => vivo && setError(true));
    return () => { vivo = false; };
  }, [preguntaId, cargar]);
  if (error) return <p role="alert" className="hp-note">{t("app.error")}</p>;
  if (!q) return <p role="status" className="hp-note">{t("app.cargando")}</p>;
  const correcta = q.campos?.length
    ? q.campos.map((c) => `${c.etiqueta ? `${c.etiqueta}: ` : ""}${c.validas.join(" o ")}`).join("; ")
    : q.solucion != null ? [q.solucion].flat().map((v) => String(v).replace(".", ",")).join("; ")
    : q.opciones[LETRAS.indexOf(q.correcta)]?.texto ?? "";
  return (
    <div className="hp-answer">
      {q.contexto && <p className="hp-note"><RichText text={q.contexto} /></p>}
      <p><RichText text={q.enunciado} /></p>
      <p className="hp-answer-ok"><span>{t("hist.respuestaCorrecta")}</span> <b><RichText text={correcta} /></b></p>
      {q.explicacion && <p className="hp-note"><RichText text={q.explicacion} /></p>}
    </div>
  );
}
