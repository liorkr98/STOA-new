import { ANALYST_COLORS, analystColor } from "../src/lib/design/analyst-color";

/**
 * The raster behind the demo clips: the same image `PlaceholderThumb` draws in
 * the browser, rendered to pixels so ffmpeg can encode it.
 *
 * It is deliberately a re-implementation of one component rather than a new
 * design. `src/components/ui/placeholder-thumb.tsx` is the reference; the
 * gradient angle, the mix ratio, the figure geometry and the 20% opacity are
 * all copied from it, so an analyst's clip and an analyst's placeholder are the
 * same picture. If that component's look changes, this has to change with it.
 *
 * No text, no initials, no photography. A two-tone wash and one abstract figure.
 */

/**
 * Portrait, because the Feed's stage is portrait. The clip stands in for a
 * phone-shot analyst video, and a landscape file letterboxes into black bars
 * top and bottom on the one surface that plays it.
 */
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** `--paper` in light mode (src/app/globals.css). The figure and the gradient's
 * light end are both mixed toward it, which is what keeps the wash warm. */
const PAPER: RGB = [0xfa, 0xf8, 0xf4];

/** From `PlaceholderThumb`: linear-gradient(158deg, ...), figure at 20%. */
const GRADIENT_ANGLE_DEG = 158;
const LIGHT_END_MIX = 0.55;
const FIGURE_OPACITY = 0.2;

/**
 * The gradient drifts along its own axis by this fraction of its length and
 * back, once per loop. Nothing moves geometrically -- the figure is bolted to
 * the frame -- so this is the whole of the motion: light shifting across a
 * static shape. Small enough to read as ambient rather than as an effect, and
 * cheap enough that a frame costs one lookup per pixel.
 */
const DRIFT = 0.055;

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** `color-mix(in srgb, color WEIGHT%, paper)`: a plain component mix, no gamma. */
function mixToPaper(color: RGB, weight: number): RGB {
  return [
    color[0] * weight + PAPER[0] * (1 - weight),
    color[1] * weight + PAPER[1] * (1 - weight),
    color[2] * weight + PAPER[2] * (1 - weight),
  ];
}

/**
 * Position of every pixel along the CSS gradient line, 0 at the light end and
 * 1 at the base tone.
 *
 * CSS measures the angle clockwise from "to top", so the direction vector in
 * screen coordinates (y pointing down) is (sin a, -cos a), and the line is long
 * enough that the gradient's ends land on the box's corners.
 */
function gradientMap(): Float32Array {
  const a = (GRADIENT_ANGLE_DEG * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const length = Math.abs(WIDTH * dx) + Math.abs(HEIGHT * dy);
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const map = new Float32Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const t = ((x + 0.5 - cx) * dx + (y + 0.5 - cy) * dy) / length + 0.5;
      map[y * WIDTH + x] = t;
    }
  }
  return map;
}

/**
 * The figure, as per-pixel coverage in 0..1.
 *
 * `PlaceholderThumb` draws it in a 100x100 viewBox with
 * preserveAspectRatio="xMidYMax meet", so on a 16:9 frame the drawing is scaled
 * to the height, centred horizontally, and pinned to the bottom edge. The
 * shoulders therefore always meet the bottom of the frame, which is the point
 * of that alignment.
 *
 * Sampled 3x3 per pixel: the edges are curved and a hard test leaves them
 * visibly stepped at the size a feed tile actually renders.
 */
function figureCoverage(): Float32Array {
  // `PlaceholderThumb` uses preserveAspectRatio="xMidYMax meet", which fits the
  // drawing inside the box. On a 9:16 frame that leaves the figure sitting in
  // the bottom half with the head two thirds of the way down, which does not
  // read as someone framed on camera. The clip covers instead: same drawing,
  // same bottom anchor, scaled to the taller side so the shoulders run past
  // both edges the way a real portrait shot does. It is the one place the clip
  // and the component deliberately differ, and only because the frame is tall.
  const scale = Math.max(WIDTH / 100, HEIGHT / 100);
  const offsetX = (WIDTH - 100 * scale) / 2;
  const offsetY = HEIGHT - 100 * scale;

  // circle cx=50 cy=38 r=14, in frame pixels
  const headX = offsetX + 50 * scale;
  const headY = offsetY + 38 * scale;
  const headR = 14 * scale;
  const headR2 = headR * headR;

  const shoulders = shoulderPolygon(scale, offsetX, offsetY);

  const cov = new Float32Array(WIDTH * HEIGHT);
  const SUB = 3;
  const step = 1 / SUB;
  const weight = 1 / (SUB * SUB);

  // The figure never reaches the top of the frame; skipping the empty band
  // above the head is most of the work avoided.
  const yStart = Math.max(0, Math.floor(headY - headR) - 2);

  for (let y = yStart; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      let hits = 0;
      for (let sy = 0; sy < SUB; sy++) {
        const py = y + (sy + 0.5) * step;
        for (let sx = 0; sx < SUB; sx++) {
          const px = x + (sx + 0.5) * step;
          const ddx = px - headX;
          const ddy = py - headY;
          if (ddx * ddx + ddy * ddy <= headR2 || pointInPolygon(px, py, shoulders)) hits++;
        }
      }
      if (hits > 0) cov[y * WIDTH + x] = hits * weight;
    }
  }
  return cov;
}

/**
 * `M14 100c0-21 16-33 36-33s36 12 36 33z` flattened to a polygon.
 *
 * Two cubics (the second is the smooth form, so its first control point is the
 * previous one reflected through the join) and then the closing run along the
 * bottom edge.
 */
function shoulderPolygon(scale: number, offsetX: number, offsetY: number): Float64Array {
  const pts: number[] = [];
  const push = (u: number, v: number) => {
    pts.push(offsetX + u * scale, offsetY + v * scale);
  };

  const SEGMENTS = 96;
  const cubic = (
    p0: [number, number],
    c1: [number, number],
    c2: [number, number],
    p1: [number, number],
    includeStart: boolean,
  ) => {
    for (let i = includeStart ? 0 : 1; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const m = 1 - t;
      const u = m * m * m * p0[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * p1[0];
      const v = m * m * m * p0[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * p1[1];
      push(u, v);
    }
  };

  cubic([14, 100], [14, 79], [30, 67], [50, 67], true);
  // s 36 12 36 33 -> first control is (30,67) reflected through (50,67).
  cubic([50, 67], [70, 67], [86, 79], [86, 100], false);
  push(14, 100);

  return Float64Array.from(pts);
}

/** Crossing number, on a flat [x0,y0,x1,y1,...] buffer. */
function pointInPolygon(x: number, y: number, poly: Float64Array): boolean {
  let inside = false;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2];
    const yi = poly[i * 2 + 1];
    const xj = poly[j * 2];
    const yj = poly[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * 4x4 ordered dither, in 1/16ths of a code value.
 *
 * A 1280px-wide two-tone wash crosses far fewer than 256 levels, so quantising
 * it straight to 8 bits lays visible bands across the frame, and h.264 then
 * sharpens them rather than hiding them. A fixed pattern is the right kind of
 * noise here: it breaks the bands, and because it does not change between
 * frames it costs the encoder essentially nothing.
 */
const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((v) => (v + 0.5) / 16 - 0.5);

/**
 * Everything that does not depend on the analyst's colour, computed once and
 * shared by every clip: the gradient position of each pixel and the figure's
 * coverage. Only the two end tones change per colour, so a frame is a lookup
 * and a blend rather than a re-render.
 */
export interface FrameGeometry {
  gradient: Float32Array;
  coverage: Float32Array;
}

export function buildGeometry(): FrameGeometry {
  return { gradient: gradientMap(), coverage: figureCoverage() };
}

const LUT_STEPS = 2048;

/** A renderer bound to one analyst colour. Reused across that colour's frames. */
export function createRenderer(geo: FrameGeometry, colorHex: string) {
  const base = hexToRgb(colorHex);
  const light = mixToPaper(base, LIGHT_END_MIX);

  // Gradient ramp, pre-blended with the figure at both alphas we ever need:
  // clear (the wash) and the figure's 20% paper. Two lookups, no per-pixel mix.
  const clear = new Float32Array(LUT_STEPS * 3);
  const figure = new Float32Array(LUT_STEPS * 3);
  for (let i = 0; i < LUT_STEPS; i++) {
    const t = i / (LUT_STEPS - 1);
    for (let c = 0; c < 3; c++) {
      const v = light[c] + (base[c] - light[c]) * t;
      clear[i * 3 + c] = v;
      figure[i * 3 + c] = v * (1 - FIGURE_OPACITY) + PAPER[c] * FIGURE_OPACITY;
    }
  }

  const frame = Buffer.allocUnsafe(WIDTH * HEIGHT * 3);

  /** `phase` in 0..1 walks the drift through one full cycle. */
  return function render(phase: number): Buffer {
    const shift = DRIFT * Math.sin(phase * 2 * Math.PI);
    let o = 0;
    for (let y = 0; y < HEIGHT; y++) {
      const dRow = (y & 3) * 4;
      for (let x = 0; x < WIDTH; x++) {
        const i = y * WIDTH + x;
        let t = geo.gradient[i] + shift;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const li = ((t * (LUT_STEPS - 1)) | 0) * 3;
        const cov = geo.coverage[i];
        const d = BAYER[dRow + (x & 3)];

        for (let c = 0; c < 3; c++) {
          const v =
            cov === 0
              ? clear[li + c]
              : clear[li + c] + (figure[li + c] - clear[li + c]) * cov;
          const q = (v + d + 0.5) | 0;
          frame[o++] = q < 0 ? 0 : q > 255 ? 255 : q;
        }
      }
    }
    return frame;
  };
}

export { ANALYST_COLORS, analystColor };
