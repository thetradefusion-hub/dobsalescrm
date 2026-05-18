/**
 * Apply supabase/migrations/*.sql in numeric order via direct Postgres.
 * Requires SUPABASE_DB_PASSWORD or DATABASE_URL in .env.local
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found");
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return env;
}

function projectRefFromUrl(url) {
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!m) throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL");
  return m[1];
}

/** Prefer pooler (IPv4); direct db.* host is often IPv6-only and fails on some networks. */
async function createPgClient(env, supabaseUrl) {
  const ssl = { rejectUnauthorized: false };
  const base = { database: "postgres", ssl, connectionTimeoutMillis: 15000 };

  if (env.DATABASE_URL) {
    return new pg.Client({ ...base, connectionString: env.DATABASE_URL });
  }

  const password = env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error(
      "Missing SUPABASE_DB_PASSWORD (or DATABASE_URL) in .env.local.\n" +
        "Get it from Supabase Dashboard → Project Settings → Database → Database password."
    );
    process.exit(1);
  }

  const ref = projectRefFromUrl(supabaseUrl);

  if (env.SUPABASE_DB_HOST) {
    const user = env.SUPABASE_DB_USER || `postgres.${ref}`;
    return new pg.Client({
      ...base,
      host: env.SUPABASE_DB_HOST,
      port: Number(env.SUPABASE_DB_PORT || 5432),
      user,
      password,
    });
  }

  const region = env.SUPABASE_DB_REGION || "ap-northeast-2";
  const poolerPrefix = env.SUPABASE_DB_POOLER || "aws-1";
  const poolerHost = `${poolerPrefix}-${region}.pooler.supabase.com`;

  return new pg.Client({
    ...base,
    host: poolerHost,
    port: 5432,
    user: `postgres.${ref}`,
    password,
  });
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing in .env.local");

  const migrationsDir = path.join(root, "supabase", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    throw new Error("No migration files found");
  }

  const client = await createPgClient(env, url);

  console.log(`Connecting to Supabase Postgres (${files.length} migrations)…`);
  await client.connect();

  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      process.stdout.write(`  → ${file} … `);
      await client.query(sql);
      console.log("OK");
    }
    console.log("\nAll migrations applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\nMigration failed:", err.message);
  process.exit(1);
});
