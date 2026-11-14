import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { useAsignatura } from "./hooks";
import { t } from "./i18n";
import { FreePractice } from "./pages/FreePractice";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { Placement } from "./pages/Placement";
import { Settings } from "./pages/Settings";
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
  const { id: asignaturaId, nombre, failed } = useAsignatura();
  const [route, arg] = hash.split("/");

  let page = null;
  if (route === "panal") page = <Home onSelectSubtema={(s) => go(`subtema/${s}`)} onNivel={() => go("nivel")} onPracticar={() => go("practica")} />;
  else if (failed) page = <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  else if (asignaturaId && route === "hoy") page = <Suggestions onPracticeSubtema={(s) => go(`subtema/${s}`)} onPlacement={() => go("nivel")} />;
  else if (route === "historial") page = <History />;
  else if (asignaturaId && route === "ajustes") page = <Settings asignaturaId={asignaturaId} />;
  else if (asignaturaId && route === "practica") page = <FreePractice asignaturaId={asignaturaId} onFinish={() => go("panal")} />;
  else if (asignaturaId && route === "nivel") page = <Placement asignaturaId={asignaturaId} onFinish={() => go("panal")} />;
  else if (asignaturaId && route === "subtema" && arg) page = <Subtopic asignaturaId={asignaturaId} subtemaId={arg} onBack={() => go("panal")} />;

  const sinNav = route === "nivel" || route === "practica";
  return (
    <div className="min-h-screen pb-20 font-sans sm:pb-0">
      <AppHeader asignatura={nombre} ruta={route} sinNav={sinNav} />
      {page}
    </div>
  );
}
