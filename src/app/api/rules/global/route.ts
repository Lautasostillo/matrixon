import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export async function GET() {
  try {
    const storage = getStorage();
    const json = await storage.getGlobalRules();
    if (!json) return NextResponse.json({ error: "Global rules not found" }, { status: 404 });
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
