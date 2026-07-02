import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMoatSnapshots } from "@/lib/db/moat";

export const dynamic = "force-dynamic";

/**
 * Returns the two most recent MOAT snapshots for odometer animation
 * (previous → current). See docs/MOTION.md A.3.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "creator id required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "creator not found" }, { status: 404 });
  }

  const snapshots = await getMoatSnapshots(id);
  return NextResponse.json(snapshots, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
