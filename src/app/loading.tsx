import { HatchLoader } from "@/components/ui/hatch-loader";

/**
 * Route-level loading state: a centered hatch spinner (ldrs) in the ink token.
 * Applies to any route without its own loading file.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-busy>
      <HatchLoader size={28} stroke={4} speed={3.5} />
    </div>
  );
}
