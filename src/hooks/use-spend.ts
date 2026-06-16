"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { purchaseReport, subscribeToAnalyst } from "@/app/actions/wallet";
import type { SpendResult } from "@/lib/types";

export function usePurchaseReport(reportId: string) {
  const router = useRouter();
  return useMutation<SpendResult>({
    mutationFn: () => purchaseReport(reportId),
    onSuccess: (res) => {
      if (!res.error) router.refresh();
    },
  });
}

export function useSubscribe(analystId: string, handle?: string) {
  const router = useRouter();
  return useMutation<SpendResult>({
    mutationFn: () => subscribeToAnalyst(analystId, handle),
    onSuccess: (res) => {
      if (!res.error) router.refresh();
    },
  });
}
