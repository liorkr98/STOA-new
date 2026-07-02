"use client";

import { usePathname } from "next/navigation";
import { StepDots } from "./step-dots";

const STEPS = ["Brand", "Price", "First report"];
const ROUTES = ["/onboarding/creator/brand", "/onboarding/creator/price", "/studio/compose"];

export function CreatorOnboardingSteps() {
  const pathname = usePathname();
  const current = Math.max(0, ROUTES.findIndex((r) => pathname.startsWith(r)));
  return <StepDots steps={STEPS} current={current} />;
}
