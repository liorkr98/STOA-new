/**
 * JSX typing for the one ldrs web component we use, <l-hatch> (see
 * src/components/ui/hatch-loader.tsx). ldrs ships types by augmenting
 * react/jsx-runtime, but that file isn't auto-included under this project's
 * setup, so we declare the single element we render -- matching the automatic
 * JSX runtime Next uses.
 */
import "react";
import "react/jsx-runtime";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "l-hatch": {
        size?: number | string;
        stroke?: number | string;
        speed?: number | string;
        color?: number | string;
      };
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "l-hatch": {
        size?: number | string;
        stroke?: number | string;
        speed?: number | string;
        color?: number | string;
      };
    }
  }
}
