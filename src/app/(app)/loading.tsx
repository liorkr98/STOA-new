import { HatchLoader } from "@/components/ui/hatch-loader";

export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-busy>
      <HatchLoader size={28} stroke={4} speed={3.5} />
    </div>
  );
}
