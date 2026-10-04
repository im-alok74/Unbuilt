import { requireSession, STAFF } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { getBusinessRow } from "@/lib/rows";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const _auth = await requireSession(STAFF);
  if (_auth instanceof NextResponse) return _auth;
  const { id } = await params;
  const row = await getBusinessRow(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ business: row });
}
