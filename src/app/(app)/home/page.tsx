import type { Metadata } from "next";
import { Suspense } from "react";
import { TodayPage } from "@/components/today/today-page";
import { TodayNewsSlot } from "@/components/today/today-news-slot";
import { getSessionUserId } from "@/lib/db/auth";
import { buildTodayPage } from "@/lib/today/build-today-page";

export const metadata: Metadata = {
  title: "Today",
  description:
    "Stoa's daily page: the lead, what is worth your next minute and what is worth reading.",
};

/**
 * Today is Stoa's daily page. Signed-in readers get the faces they follow,
 * their own clips and desk, and their lists; signed-out readers get the part
 * everyone shares, so Today is a real, server-rendered, indexable page for
 * someone who has never heard of Stoa.
 */
export default async function HomePage() {
  const userId = await getSessionUserId();
  const data = await buildTodayPage(userId);
  return (
    <div className="mx-auto w-full max-w-[var(--w-wide)]">
      <TodayPage
        data={data}
        news={
          <Suspense fallback={null}>
            <TodayNewsSlot variant="today" />
          </Suspense>
        }
      />
    </div>
  );
}
