import { NextResponse } from "next/server";
import { readState } from "@/lib/state";

export async function GET() {
  const state = await readState();
  return NextResponse.json(state.phases);
}
