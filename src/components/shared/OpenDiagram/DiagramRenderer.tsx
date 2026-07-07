"use client";

import { useEffect, useRef, useState } from "react";
import rough from "roughjs";
import { DIAGRAMS, type Diagram } from "@/lib/diagram/diagrams";
import COLORS from "@/lib/diagram/colors";
import type { DiagramId, DiagramTheme } from "@/lib/diagram/schema";

type RoughStyle = "hachure" | "solid" | "zigzag" | "cross-hatch" | "dots" | "dashed" | "zigzag-line";

function hexToRgba(hex: string, opacity: number) {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function fillColor(theme: DiagramTheme, fill: number) {
  if (fill === 100) return "#000000";
  if (fill === 101) return "#ffffff";
  return COLORS[theme][fill] as string;
}

export function DiagramRenderer({
  diagramId,
  isRough = false,
  width = "100%",
  roughStyle = "hachure",
  theme = "default",
  className,
}: {
  diagramId: DiagramId;
  isRough?: boolean;
  width?: number | string;
  roughStyle?: RoughStyle;
  theme?: DiagramTheme;
  className?: string;
}) {
  const [viewBox, setViewBox] = useState("0 0 960 540");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const group = groupRef.current;
    const svg = svgRef.current;
    if (!group || !svg) return;

    while (group.firstChild) group.removeChild(group.firstChild);

    const shapes = DIAGRAMS[diagramId] ?? DIAGRAMS.stacked;
    if (isRough) {
      const rc = rough.svg(svg);
      for (const { path, options } of shapes) {
        const color = fillColor(theme, options.fill);
        if (options.noRough) {
          const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathEl.setAttribute("d", path);
          pathEl.setAttribute("fill", color);
          pathEl.setAttribute("stroke", color);
          group.appendChild(pathEl);
        } else if (options.fillOpacity) {
          const fill = hexToRgba(color, Number(options.fillOpacity));
          group.appendChild(rc.path(path, { ...options, fill, stroke: fill, fillStyle: roughStyle }));
        } else {
          group.appendChild(
            rc.path(path, { ...options, fill: color, stroke: color, fillStyle: roughStyle }),
          );
        }
      }
    } else {
      shapes.forEach(({ path, options }: Diagram, index) => {
        const color = fillColor(theme, options.fill);
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", path);
        pathEl.setAttribute("fill", color);
        pathEl.setAttribute("stroke", color);
        group.appendChild(pathEl);
      });
    }

    const bbox = group.getBBox();
    const padding = 10;
    setViewBox(
      `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + 2 * padding} ${bbox.height + 2 * padding}`,
    );
  }, [diagramId, isRough, roughStyle, theme]);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      width={width}
      fill="none"
      className={className}
      role="img"
      aria-hidden
    >
      <g ref={groupRef} />
    </svg>
  );
}
