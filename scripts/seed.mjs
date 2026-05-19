/**
 * Seed script. Run with:
 *   npm run seed
 *
 * Idempotent — re-running is safe. Creates a test user, promotes them to
 * app-admin, and inserts a few sample projects. Override credentials with
 * ADMIN_EMAIL / ADMIN_PASSWORD env vars. Defaults are test-only.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local. Never deploy the
 * service-role key to the browser.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill them in.",
  );
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "test@webuildtrades.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Rainbow12345*";
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME ?? "Test Admin";

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function tableMissing(error) {
  return (
    error &&
    (error.code === "PGRST205" ||
      /Could not find the table/i.test(error.message ?? ""))
  );
}

async function ensureUser() {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email === ADMIN_EMAIL);
  if (existing) {
    console.log(`✓ User exists: ${ADMIN_EMAIL} (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: ADMIN_FULL_NAME },
  });
  if (error) throw error;

  console.log(`✓ Created user: ${ADMIN_EMAIL} (${data.user.id})`);
  return data.user.id;
}

async function ensureAdminProfile(userId) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: ADMIN_FULL_NAME,
      role: "admin",
    },
    { onConflict: "id" },
  );

  if (tableMissing(error)) {
    console.warn(
      "\n! Skipping profile upsert: the migration hasn't been applied yet.",
    );
    console.warn(
      "  Run supabase/migrations/0001_init.sql and 0002_team_tasks.sql,",
    );
    console.warn("  then run `npm run seed` again.\n");
    return false;
  }

  if (error) throw error;

  console.log(`✓ Profile upserted with role=admin`);
  return true;
}

async function seedProjects(ownerId) {
  const sample = [
    {
      owner_id: ownerId,
      name: "Acme rebrand site",
      client: "Acme Ltd",
      status: "in_progress",
      priority: "high",
      progress: 68,
      deadline: "2026-06-12",
    },
    {
      owner_id: ownerId,
      name: "Northwind lead funnel",
      client: "Northwind",
      status: "review",
      priority: "medium",
      progress: 92,
      deadline: "2026-05-28",
    },
    {
      owner_id: ownerId,
      name: "Origin Energy SEO",
      client: "Origin Energy",
      status: "planning",
      priority: "medium",
      progress: 12,
      deadline: "2026-07-30",
    },
    {
      owner_id: ownerId,
      name: "TBS Cohort 3 launch site",
      client: "Internal — TBS",
      status: "in_progress",
      priority: "high",
      progress: 45,
      deadline: "2026-06-01",
    },
    {
      owner_id: ownerId,
      name: "Pulse landing rewrite",
      client: "Pulse",
      status: "blocked",
      priority: "low",
      progress: 30,
      deadline: "2026-08-15",
    },
  ];

  const { data: existing, error: readError } = await supabase
    .from("projects")
    .select("name")
    .eq("owner_id", ownerId);

  if (tableMissing(readError)) {
    console.warn(
      "\n! Skipping projects: the migration hasn't been applied yet.\n",
    );
    return;
  }
  if (readError) throw readError;

  const have = new Set(existing.map((r) => r.name));
  const toInsert = sample.filter((p) => !have.has(p.name));

  if (toInsert.length === 0) {
    console.log("✓ Sample projects already present, nothing to insert.");
    return;
  }

  const { error: insertError } = await supabase
    .from("projects")
    .insert(toInsert);

  if (insertError) throw insertError;

  console.log(`✓ Inserted ${toInsert.length} sample projects.`);
}

const userId = await ensureUser();
const hasProfiles = await ensureAdminProfile(userId);
if (hasProfiles) {
  await seedProjects(userId);
}

console.log("\nDone.");
