import katex from "katex";
import "katex/dist/katex.min.css";
import type { ReactNode } from "react";

/** Texto con fórmulas LaTeX entre $...$. Una fórmula inválida no rompe la pantalla: se muestra tal cual, en texto plano. */
export function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const re = /\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    try {
      const html = katex.renderToString(m[1], { throwOnError: true });
      nodes.push(<span key={m.index} dangerouslySetInnerHTML={{ __html: html }} />);
    } catch {
      nodes.push(m[0]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
