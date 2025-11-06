import { promises as fs } from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type StorageProvider = "fs" | "supabase";

const DEFAULT_BUCKET = process.env.SUPABASE_BUCKET || "matrix";

// Keys layout in Supabase Storage
// brands: brands/<id>.json
// presets: presets/<id>.json
// rules: rules/global.v2.json

interface IStorage {
  listBrands(): Promise<string[]>;
  getBrand(id: string): Promise<any | null>;
  upsertBrand(id: string, rawJson: string): Promise<void>;

  getPreset(id: string): Promise<any | null>;
  getGlobalRules(): Promise<any | null>;
}

class FsStorage implements IStorage {
  private root = path.join(process.cwd(), "docs");

  async listBrands(): Promise<string[]> {
    const dir = path.join(this.root, "brands");
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).map(e => e.name);
    } catch (e: any) {
      if (e?.code === "ENOENT") return [];
      throw e;
    }
  }

  async getBrand(id: string): Promise<any | null> {
    const file = path.join(this.root, "brands", id, "config.json");
    try {
      const raw = await fs.readFile(file, "utf-8");
      return JSON.parse(raw);
    } catch (e: any) {
      if (e?.code === "ENOENT") return null;
      throw e;
    }
  }

  async upsertBrand(id: string, rawJson: string): Promise<void> {
    const dir = path.join(this.root, "brands", id);
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, "config.json");
    await fs.writeFile(file, rawJson, "utf-8");
  }

  async getPreset(id: string): Promise<any | null> {
    const file = path.join(this.root, "presets", `${id}.json`);
    try {
      const raw = await fs.readFile(file, "utf-8");
      return JSON.parse(raw);
    } catch (e: any) {
      if (e?.code === "ENOENT") return null;
      throw e;
    }
  }

  async getGlobalRules(): Promise<any | null> {
    const file = path.join(this.root, "rules", "global.v2.json");
    try {
      const raw = await fs.readFile(file, "utf-8");
      return JSON.parse(raw);
    } catch (e: any) {
      if (e?.code === "ENOENT") return null;
      throw e;
    }
  }
}

class SupabaseStorage implements IStorage {
  private client: SupabaseClient;
  private bucket: string;

  constructor() {
    const url = process.env.SUPABASE_URL as string;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    }
    this.client = createClient(url, key, { auth: { persistSession: false } });
    this.bucket = DEFAULT_BUCKET;
  }

  private async ensureBucket() {
    // Create bucket if it does not exist (ignore errors if already exists)
    try {
      const { data: buckets } = await this.client.storage.listBuckets();
      const exists = (buckets || []).some((b: any) => b.name === this.bucket);
      if (!exists) {
        await this.client.storage.createBucket(this.bucket, { public: false });
      }
    } catch {}
  }

  async listBrands(): Promise<string[]> {
    await this.ensureBucket();
    // We store as brands/<id>.json — list that folder and strip .json
    const { data, error } = await this.client.storage.from(this.bucket).list("brands", { limit: 1000 });
    if (error) throw error;
    const files = (data || []).filter((it: any) => it.name.endsWith(".json"));
    return files.map((f: any) => f.name.replace(/\.json$/i, ""));
  }

  async getBrand(id: string): Promise<any | null> {
    await this.ensureBucket();
    const key = `brands/${id}.json`;
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error) {
      if ((error as any)?.name === "StorageApiError" && (error as any)?.statusCode === 404) return null;
      return null; // Treat not-found as null
    }
    const text = await data.text();
    try { return JSON.parse(text); } catch { return null; }
  }

  async upsertBrand(id: string, rawJson: string): Promise<void> {
    await this.ensureBucket();
    const key = `brands/${id}.json`;
    const { error } = await this.client.storage.from(this.bucket).upload(key, rawJson, { contentType: "application/json", upsert: true });
    if (error) throw error;
  }

  async getPreset(id: string): Promise<any | null> {
    await this.ensureBucket();
    const key = `presets/${id}.json`;
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error) return null;
    const text = await data.text();
    try { return JSON.parse(text); } catch { return null; }
  }

  async getGlobalRules(): Promise<any | null> {
    await this.ensureBucket();
    const key = `rules/global.v2.json`;
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error) return null;
    const text = await data.text();
    try { return JSON.parse(text); } catch { return null; }
  }
}

export function getStorage(): IStorage {
  const provider = (process.env.STORAGE_PROVIDER || "fs").toLowerCase() as StorageProvider;
  if (provider === "supabase") {
    return new SupabaseStorage();
  }
  return new FsStorage();
}
