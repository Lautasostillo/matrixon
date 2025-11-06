import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const storage = getStorage();
    const json = await storage.getBrand(id);
    if (!json) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.text();
    try { JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const storage = getStorage();
    await storage.upsertBrand(id, body);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
