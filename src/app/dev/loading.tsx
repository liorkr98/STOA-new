import { HatchLoader } from "@/components/ui/hatch-loader";

/** Mirrors src/app/(private)/loading.tsx, so a dev fixture refreshes the way a real page does. */
export default function DevLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-busy>
      <HatchLoader size={28} stroke={4} speed={3.5} />
    </div>
  );
}
