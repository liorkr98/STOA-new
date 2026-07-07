/** Built-in Napkin visual styles — formal defaults plus colorful options like the Napkin app. */
export const NAPKIN_STYLES = [
  // Colorful
  {
    id: "CDQPRVVJCSTPRBBCD5Q6AWR",
    label: "Vibrant Strokes",
    group: "Colorful",
  },
  {
    id: "CDQPRVVJCSTPRBBKDXK78",
    label: "Glowful Breeze",
    group: "Colorful",
  },
  {
    id: "CDQPRVVJCSTPRBB6DHGQ8",
    label: "Bold Canvas",
    group: "Colorful",
  },
  {
    id: "CDQPRVVJCSTPRBB6D5P6RSB4",
    label: "Radiant Blocks",
    group: "Colorful",
  },
  {
    id: "CDQPRVVJCSTPRBB7E9GP8TB5DST0",
    label: "Pragmatic Shades",
    group: "Colorful",
  },
  {
    id: "CDGQ6XB1DGPPCTBCDHJP8",
    label: "Lively Layers",
    group: "Colorful",
  },
  // Hand-drawn
  {
    id: "D1GPWS1DCDQPRVVJCSTPR",
    label: "Artistic Flair",
    group: "Hand-drawn",
  },
  {
    id: "D1GPWS1DDHMPWSBK",
    label: "Sketch Notes",
    group: "Hand-drawn",
  },
  // Formal
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
  // Monochrome
  {
    id: "DNQPWVV3D1S6YVB55NK6RRBM",
    label: "Minimal Contrast",
    group: "Monochrome",
  },
  {
    id: "CXS62Y9DCSQP6XBK",
    label: "Silver Beam",
    group: "Monochrome",
  },
] as const;

/** Default for chart annotation flow — colorful like Napkin's chart visuals. */
export const NAPKIN_CHART_STYLE_ID = NAPKIN_STYLES[0].id;

export const NAPKIN_DEFAULT_STYLE_ID = NAPKIN_STYLES[8].id;

export const NAPKIN_VISUAL_TYPES = [
  { value: "", label: "Auto (best match)" },
  { value: "chart", label: "Chart / price levels" },
  { value: "flowchart", label: "Flowchart" },
  { value: "timeline", label: "Timeline" },
  { value: "mindmap", label: "Mind map" },
  { value: "comparison", label: "Comparison" },
  { value: "process", label: "Process" },
] as const;

export const NAPKIN_VARIATION_COUNT = 4;

export const NAPKIN_DEFAULT_STYLE = NAPKIN_DEFAULT_STYLE_ID;
