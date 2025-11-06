import { NextResponse, NextRequest } from "next/server";
import { getStorage } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const storage = getStorage();
    const json = await storage.getPreset(id);
    if (!json) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
