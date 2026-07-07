"use client";

import COLORS from "@/lib/diagram/colors";
import type { BulletPoint, DiagramTheme } from "@/lib/diagram/schema";

function LabelBlock({
  point,
  color,
  align,
}: {
  point: BulletPoint;
  color: string;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <h3 className="text-sm font-semibold" style={{ color }}>
        {point.title}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{point.content}</p>
    </div>
  );
}

export function OpenDiagramFrame({
  bulletPoints,
  children,
  theme = "default",
}: {
  bulletPoints: BulletPoint[];
  children: React.ReactNode;
  theme?: DiagramTheme;
}) {
  const palette = COLORS[theme];

  return (
    <div className="flex flex-row items-center justify-between gap-3 p-2 sm:gap-4">
      <div className="flex w-[30%] flex-col gap-6 sm:gap-8">
        {bulletPoints.slice(0, 2).map((point, index) => (
          <LabelBlock
            key={point.title}
            point={point}
            color={palette[index % palette.length]}
            align="right"
          />
        ))}
      </div>
      <div className="flex w-[40%] shrink-0 justify-center">{children}</div>
      <div className="flex w-[30%] flex-col gap-6 sm:gap-8">
        {bulletPoints.slice(2).map((point, index) => (
          <LabelBlock
            key={point.title}
            point={point}
            color={palette[(index + 2) % palette.length]}
            align="left"
          />
        ))}
      </div>
    </div>
  );
}
