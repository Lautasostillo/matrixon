import { NextResponse, NextRequest } from "next/server";
import { getStorage } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const storage = getStorage();
    const json = await storage.getBrand(id);
    if (!json) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.text();
    // Optionally validate JSON
    try { JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const storage = getStorage();
    await storage.upsertBrand(id, body);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.text();
    try { JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const storage = getStorage();
    await storage.upsertBrand(id, body);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
