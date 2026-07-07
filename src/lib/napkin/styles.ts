/** Built-in Napkin visual styles suited for equity research (formal / monochrome). */
export const NAPKIN_STYLES = [
  {
    id: "CSQQ4VB1DGPP4V31CDNJTVKFBXK6JV3C",
    label: "Elegant Outline",
    group: "Formal",
  },
  {
    id: "CSQQ4VB1DGPPTVVEDXHPGWKFDNJJTSKCC5T0",
    label: "Corporate Clean",
    group: "Formal",
  },
  {
    id: "CSQQ4VB1DGPQ6TBECXP6ABB3DXP6YWG",
    label: "Monochrome Pro",
    group: "Formal",
  },
  {
    id: "DNQPWVV3D1S6YVB55NK6RRBM",
    label: "Minimal Contrast",
    group: "Monochrome",
  },
  {
    id: "CDQPRVVJCSTPRBBCD5Q6AWR",
    label: "Vibrant Strokes",
    group: "Colorful",
  },
] as const;

export const NAPKIN_DEFAULT_STYLE_ID = NAPKIN_STYLES[0].id;

export const NAPKIN_VISUAL_TYPES = [
  { value: "", label: "Auto (best match)" },
  { value: "flowchart", label: "Flowchart" },
  { value: "timeline", label: "Timeline" },
  { value: "mindmap", label: "Mind map" },
  { value: "comparison", label: "Comparison" },
  { value: "process", label: "Process" },
  { value: "chart", label: "Chart / data" },
] as const;

export const NAPKIN_DEFAULT_STYLE = NAPKIN_DEFAULT_STYLE_ID;
