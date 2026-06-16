import prisma from "@/lib/prisma";
import { exec } from "child_process";
import util from "util";
import path from "path";

const execPromise = util.promisify(exec);

/**
 * Checks if the database has 0 tenants.
 * If empty, automatically executes the prisma/seed.js script to create sfera, umelka and default accounts.
 */
export async function ensureDefaultData() {
  if (!process.env.DATABASE_URL) {
    console.warn("ensureDefaultData: DATABASE_URL is not defined. Skipping database initialization.");
    return;
  }

  try {
    const count = await prisma.tenant.count();
    if (count === 0) {
      console.log("No tenants found in DB. Auto-seeding default database...");
      const seedPath = path.join(process.cwd(), "prisma", "seed.js");
      await execPromise(`node ${seedPath}`);
      console.log("Auto-seeding completed successfully.");
    }
  } catch (error) {
    console.error("ensureDefaultData error:", error);
  }
}
