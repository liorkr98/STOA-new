// Node test runs only: a component's `import "./x.css"` loads as an empty
// module. The browser build handles CSS; Node cannot. Use with
// `node --import ./scripts/test-ignore-css.mjs --import tsx --test ...`.
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(
      "export async function load(url, context, next) { if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true }; return next(url, context); }",
    ),
);
