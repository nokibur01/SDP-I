// Test helper: resolve real account ids for privileged roles.
// The API now re-checks each token's user against the database on every request,
// so tests must sign tokens for accounts that genuinely hold the role they claim.
import db from "../src/config/db.js";

export async function resolveRoleIds() {
  const [rows] = await db.query(
    "SELECT role, MIN(id) AS id FROM users WHERE role IN ('cr', 'admin') GROUP BY role"
  );
  const ids = Object.fromEntries(rows.map((r) => [r.role, r.id]));
  if (!ids.cr || !ids.admin) {
    throw new Error(
      "Tests need at least one 'cr' and one 'admin' user in the database. Run `npm run seed:demo` first."
    );
  }
  return { CR_ID: ids.cr, ADMIN_ID: ids.admin };
}
