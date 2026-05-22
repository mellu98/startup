import { NextRequest, NextResponse } from "next/server";
import { getPhase } from "@/lib/state";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const phase = await getPhase(id);
  if (!phase) {
    return NextResponse.json({ error: "Phase not found" }, { status: 404 });
  }
  return NextResponse.json(phase);
}
