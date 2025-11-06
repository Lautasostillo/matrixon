import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export async function GET() {
  try {
    const storage = getStorage();
    const brands = await storage.listBrands();
    return NextResponse.json({ brands });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
