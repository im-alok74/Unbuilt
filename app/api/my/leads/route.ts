import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { listBusinessRows } from "@/lib/rows";

export const dynamic = "force-dynamic";

/** The signed-in user's own assigned leads (reps see nothing else). */
export async function GET() {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const businesses = await listBusinessRows({ assignedTo: s.userId });
  return NextResponse.json({ businesses });
}
