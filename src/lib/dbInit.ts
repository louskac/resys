/**
 * Checks if the database has 0 tenants.
 * If empty, automatically executes the prisma/seed.js script to create sfera, umelka and default accounts.
 */
export async function ensureDefaultData() {
  // Automatic seeding on startup/request has been disabled to allow a completely fresh database state.
  // If you ever need to seed the database again, you can run: npx prisma db seed
  return;
}
