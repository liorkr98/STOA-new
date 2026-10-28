/**
 * The Interest Cart animals, copied path for path from the app's only
 * drawing of them (src/components/interest-cart/animals.tsx), in the light
 * body colours: the card is always paper. `npm run test:contrast` in the app
 * checks these colours against that file and the tint backgrounds below
 * against the 3:1 rule (docs/DESIGN_LANGUAGE.md 1.3).
 */
export const ANIMAL = {
  bull: "#3E9D6F",
  bullMuzzle: "#3E976E",
  bear: "#E86060",
  bearMuzzle: "#C45557",
  bearFeatures: "#141719",
} as const;

/** The approved tints the extension's bull and bear buttons sit on. */
export const ANIMAL_TINT = { bull: "#F1F8F5", bear: "#FDF4F4" } as const;

export function bullSvg(size = 18): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" aria-hidden="true" focusable="false"><path d="M 6.99 7.99 C 4.99 17.99 10.99 22.99 17.99 20.99" stroke="${ANIMAL.bull}" stroke-width="4" stroke-linecap="round"/><path d="M 41.00 7.99 C 43.00 17.99 37.00 22.99 30.00 20.99" stroke="${ANIMAL.bull}" stroke-width="4" stroke-linecap="round"/><ellipse cx="11" cy="24" rx="5" ry="3" fill="${ANIMAL.bull}"/><ellipse cx="37" cy="24" rx="5" ry="3" fill="${ANIMAL.bull}"/><path d="M 14 18 L 34 18 C 36.5 28 34 38 30.25 41 L 17.75 41 C 14 38 11.5 28 14 18 Z" fill="${ANIMAL.bull}"/><ellipse cx="24" cy="36.2" rx="5.6" ry="3.8" fill="${ANIMAL.bullMuzzle}"/></svg>`;
}

export function bearSvg(size = 18): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" focusable="false"><circle cx="13" cy="14.8" r="6" fill="${ANIMAL.bear}"/><circle cx="35" cy="14.8" r="6" fill="${ANIMAL.bear}"/><circle cx="24" cy="27.8" r="15" fill="${ANIMAL.bear}"/><ellipse cx="24" cy="34" rx="6.2" ry="4.8" fill="${ANIMAL.bearMuzzle}"/><circle cx="18" cy="24.8" r="2" fill="${ANIMAL.bearFeatures}"/><circle cx="30" cy="24.8" r="2" fill="${ANIMAL.bearFeatures}"/><ellipse cx="24" cy="31.35" rx="2.5" ry="2.05" fill="${ANIMAL.bearFeatures}"/></svg>`;
}
