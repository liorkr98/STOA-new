/**
 * Whether `enqueueOrRun` should publish, run the work now, or skip.
 *
 * Page renders pass `runInline: false` so a missing QStash account cannot
 * execute caption/transcript work inside a Server Component. That throw is
 * what production React reports as minified error #441.
 */
export function resolveJobDispatch(
  queueConfigured: boolean,
  runInline: boolean,
): "queue" | "inline" | "skip" {
  if (queueConfigured) return "queue";
  if (runInline) return "inline";
  return "skip";
}
