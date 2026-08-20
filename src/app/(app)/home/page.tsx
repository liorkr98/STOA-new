import type { Metadata } from "next";
import { Suspense } from "react";
import { TodayPage } from "@/components/today/today-page";
import { TodayNewsSlot } from "@/components/today/today-news-slot";
import { getSessionUserId } from "@/lib/db/auth";
import { buildTodayPage } from "@/lib/today/build-today-page";

export const metadata: Metadata = {
  title: "Today",
  description: "Stoa's daily briefing: the lead, what is trending, and the calls the market just graded.",
};

/**
 * Today is Stoa's daily newspaper. Signed-in readers get their desk and lists;
 * signed-out readers get the platform-wide issue, so Verdicts is a real,
 * server-rendered, indexable page for someone who has never heard of Stoa.
 */
export default async function HomePage() {
  const userId = await getSessionUserId();
  const data = await buildTodayPage(userId);
  return (
    <TodayPage
      data={data}
      news={
        <Suspense fallback={null}>
          <TodayNewsSlot />
        </Suspense>
      }
    />
  );
}
