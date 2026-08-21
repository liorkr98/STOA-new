import { notFound } from "next/navigation";

/**
 * /dev/* are local design scratchpads (component previews, editor test rigs).
 * They pull the heaviest chunks in the app (650kB+ each) and must never be
 * reachable in production -- this gate 404s them in any production build
 * while keeping them available under `next dev`.
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
