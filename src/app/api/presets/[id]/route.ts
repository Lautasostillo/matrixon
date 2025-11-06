import { NextResponse, NextRequest } from "next/server";
import { getStorage } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storage = getStorage();
    const json = await storage.getPreset(params.id);
    if (!json) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
