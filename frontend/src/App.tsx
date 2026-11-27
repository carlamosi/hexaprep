import { Fragment, useEffect, useState } from "react";
import { Onboarding } from "./components/Onboarding";
import { Guardados } from "./pages/Guardados";
import { AppHeader } from "./components/AppHeader";
import { useAsignatura } from "./hooks";
import { setLang, t } from "./i18n";
import { FreePractice } from "./pages/FreePractice";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { Perfil } from "./pages/Perfil";
import { Subtopic } from "./pages/Subtopic";
import { Suggestions } from "./pages/Suggestions";
import { ErrorCarga } from "./components/ErrorCarga";
import { guardarRuta, rutaGuardada } from "./session";

function useHash(): [string, (h: string) => void] {
  // Al reabrir la app instalada se pierde el «#»: se recupera la práctica en curso (se borra al salir de ella).
  const [hash, setHash] = useState(() => {
    const h = window.location.hash.slice(1);
    if (h) return h;
    const r = rutaGuardada();
    if (r) window.location.hash = r;
    return r || "panal";
  });
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
  useEffect(() => { guardarRuta(route === "practica" || route === "subtema" ? hash : null); }, [route, hash]);

  const TITULOS: Record<string, string> = { panal: "nav.panal", hoy: "nav.hoy", historial: "nav.historial", guardados: "guardados.titulo", perfil: "nav.perfil" };
  useEffect(() => { // título de la pestaña: «Català · Historial · HexaPrep»
    document.title = [nombre, TITULOS[route] ? t(TITULOS[route]) : null, t("app.nombre")].filter(Boolean).join(" · ");
  }, [nombre, route]);

  // la práctica de una asignatura en catalán lleva la interfaz en catalán; el resto de pantallas siguen en castellano
  const idioma = subjects.find((s) => s.id === asignaturaId)?.idioma;
  setLang((route === "practica" || route === "subtema") && idioma === "ca" ? "ca" : "es");

  let page = null;
  if (route === "panal") page = <Home onSelectSubtema={(s) => go(`subtema/${s}`)} onPracticar={() => go("practica")} onPracticarTipo={(g) => go(`practica/_/${g}`)} onPracticarTema={(tm) => go(`practica/${tm}`)} />;
  else if (failed) page = <ErrorCarga />;
  else if (asignaturaId && route === "hoy") page = <Suggestions asignaturaId={asignaturaId} onPracticeSubtema={(s) => go(`subtema/${s}`)} />;
  else if (asignaturaId && route === "historial") page = <History asignaturaId={asignaturaId} />;
  else if (asignaturaId && route === "guardados") page = <Guardados asignaturaId={asignaturaId} />;
  else if (route === "perfil") page = <Perfil asignaturaId={asignaturaId} />;
  else if (asignaturaId && route === "practica") page = <FreePractice key={`${arg}/${arg2}`} asignaturaId={asignaturaId} temaId={arg && arg !== "_" ? arg : undefined} tipos={arg2} onFinish={() => go("panal")} />;
  else if (asignaturaId && route === "subtema" && arg) page = <Subtopic asignaturaId={asignaturaId} subtemaId={arg} onBack={() => go("panal")} />;

  const sinNav = route === "practica";
  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] font-sans sm:pb-0">
      <AppHeader asignatura={nombre} asignaturaId={asignaturaId} asignaturas={subjects} onCambiarAsignatura={(id) => { elegir(id); go("panal"); }} onAbrirSelector={refrescar} ruta={route === "guardados" ? "historial" : route} sinNav={sinNav} />
      <Fragment key={asignaturaId}>{page}</Fragment>
      <Onboarding />
    </div>
  );
}
