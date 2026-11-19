import { Fragment, useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { useAsignatura } from "./hooks";
import { t } from "./i18n";
import { FreePractice } from "./pages/FreePractice";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { Perfil } from "./pages/Perfil";
import { Subtopic } from "./pages/Subtopic";
import { Suggestions } from "./pages/Suggestions";

function useHash(): [string, (h: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || "panal");
  useEffect(() => {
    const on = () => setHash(window.location.hash.slice(1) || "panal");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return [hash, (h) => { window.location.hash = h; }];
}

export default function App() {
  const [hash, go] = useHash();
  const { id: asignaturaId, nombre, failed, subjects, elegir, refrescar } = useAsignatura();
  const [route, arg, arg2] = hash.split("/"); // practica/<tema o _>/<test o problemas>

  useEffect(() => { if (route === "ajustes") go("perfil"); }, [route, go]); // enlaces antiguos

  const TITULOS: Record<string, string> = { panal: "nav.panal", hoy: "nav.hoy", historial: "nav.historial", perfil: "nav.perfil" };
  useEffect(() => { // título de la pestaña: «Català · Historial · HexaPrep»
    document.title = [nombre, TITULOS[route] ? t(TITULOS[route]) : null, t("app.nombre")].filter(Boolean).join(" · ");
  }, [nombre, route]);

  let page = null;
  if (route === "panal") page = <Home onSelectSubtema={(s) => go(`subtema/${s}`)} onPracticar={() => go("practica")} onPracticarTipo={(g) => go(`practica/_/${g}`)} onPracticarTema={(tm) => go(`practica/${tm}`)} />;
  else if (failed) page = <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  else if (asignaturaId && route === "hoy") page = <Suggestions asignaturaId={asignaturaId} onPracticeSubtema={(s) => go(`subtema/${s}`)} />;
  else if (asignaturaId && route === "historial") page = <History asignaturaId={asignaturaId} />;
  else if (route === "perfil") page = <Perfil asignaturaId={asignaturaId} />;
  else if (asignaturaId && route === "practica") page = <FreePractice key={`${arg}/${arg2}`} asignaturaId={asignaturaId} temaId={arg && arg !== "_" ? arg : undefined} tipos={arg2} onFinish={() => go("panal")} />;
  else if (asignaturaId && route === "subtema" && arg) page = <Subtopic asignaturaId={asignaturaId} subtemaId={arg} onBack={() => go("panal")} />;

  const sinNav = route === "practica";
  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] font-sans sm:pb-0">
      <AppHeader asignatura={nombre} asignaturaId={asignaturaId} asignaturas={subjects} onCambiarAsignatura={(id) => { elegir(id); go("panal"); }} onAbrirSelector={refrescar} ruta={route} sinNav={sinNav} />
      <Fragment key={asignaturaId}>{page}</Fragment>
    </div>
  );
}
