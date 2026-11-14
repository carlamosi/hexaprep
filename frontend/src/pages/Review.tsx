import { BookletButton } from "../components/BookletButton";
import { t } from "../i18n";

export interface Fallo {
  pregunta_id: string;
  enunciado: string;
  trampa: string | null;
  fuente_id: string | null;
  fuente_pagina: number | null;
  fuente_cara: number | null;
}

/** Repaso de fallos tipo autopsia: los fallos agrupados por tipo de confusión (la trampa elegida), con enlace al booklet. */
export function Review({ fallos }: { fallos: Fallo[] }) {
  if (fallos.length === 0) {
    return <p className="px-4 py-8">{t("review.sin_fallos")}</p>;
  }
  const groups = new Map<string, Fallo[]>();
  for (const f of fallos) {
    const key = f.trampa ?? "";
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("review.titulo")}</h1>
      <div className="mt-6 space-y-5">
        {ordered.map(([trampa, items], gi) => {
          const pages = new Map<string, Fallo>();
          for (const f of items) if (f.fuente_id && f.fuente_pagina) pages.set(`${f.fuente_id}:${f.fuente_pagina}`, f);
          const labelId = `fallo-grupo-${gi}`;
          return (
            <div key={trampa} role="group" aria-labelledby={labelId} className="rounded-[16px] border border-[var(--rule)] bg-white p-5">
              <h2 id={labelId} className="text-lg font-semibold">{trampa || t("review.otros")}</h2>
              <p className="text-sm text-[var(--ink-3)]">
                {items.length} {items.length === 1 ? t("review.fallo") : t("review.fallos")}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--ink-2)]">
                {items.map((f) => (
                  <li key={f.pregunta_id}>{f.enunciado}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                {[...pages.values()].map((f) => (
                  <BookletButton key={`${f.fuente_id}:${f.fuente_pagina}`} fuenteId={f.fuente_id!} cara={f.fuente_cara} pagina={f.fuente_pagina!} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
