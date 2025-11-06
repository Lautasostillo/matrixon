#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "matrix";
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Ensure bucket exists
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = (buckets || []).some((b) => b.name === bucket);
    if (!exists) {
      await supabase.storage.createBucket(bucket, { public: false });
      console.log(`Created bucket ${bucket}`);
    }
  } catch (e) {
    console.warn("Bucket check/create failed (continuing):", e?.message || e);
  }

  const root = path.join(process.cwd(), "docs");

  // Upload presets
  const presetsDir = path.join(root, "presets");
  try {
    const entries = await fs.readdir(presetsDir);
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      const filePath = path.join(presetsDir, name);
      const content = await fs.readFile(filePath);
      const keyPath = `presets/${name}`;
      const { error } = await supabase.storage.from(bucket).upload(keyPath, content, {
        contentType: "application/json",
        upsert: true,
      });
      if (error) throw error;
      console.log("Uploaded preset:", keyPath);
    }
  } catch (e) {
    console.warn("Skipping presets seed:", e?.message || e);
  }

  // Upload global rules
  const rulesFile = path.join(root, "rules", "global.v2.json");
  try {
    const content = await fs.readFile(rulesFile);
    const { error } = await supabase.storage.from(bucket).upload("rules/global.v2.json", content, {
      contentType: "application/json",
      upsert: true,
    });
    if (error) throw error;
    console.log("Uploaded rules: rules/global.v2.json");
  } catch (e) {
    console.warn("Skipping rules seed:", e?.message || e);
  }

  // Optionally seed demo brands as files (flatten brand configs to brands/<id>.json)
  const brandsDir = path.join(root, "brands");
  try {
    const brandEntries = await fs.readdir(brandsDir, { withFileTypes: true });
    for (const ent of brandEntries) {
      if (!ent.isDirectory()) continue;
      const id = ent.name;
      const cfgPath = path.join(brandsDir, id, "config.json");
      try {
        const content = await fs.readFile(cfgPath);
        const keyPath = `brands/${id}.json`;
        const { error } = await supabase.storage.from(bucket).upload(keyPath, content, {
          contentType: "application/json",
          upsert: true,
        });
        if (error) throw error;
        console.log("Uploaded brand:", keyPath);
      } catch {}
    }
  } catch (e) {
    console.warn("Skipping brands seed:", e?.message || e);
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
