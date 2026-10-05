import { useEffect, useRef, useId } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  sequence: { showSequenceNumbers: true, actorMargin: 60, boxTextMargin: 6 },
  securityLevel: "loose",
});

export function MermaidChart({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { svg } = await mermaid.render("mmd" + id, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (e) {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<pre class="text-xs text-red-600 whitespace-pre-wrap">${String(e)}</pre>`;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [chart, id]);
  return <div ref={ref} className="mermaid-container overflow-x-auto" />;
}
