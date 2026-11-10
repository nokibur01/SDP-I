// Per-batch access rules shared by every controller.
// Convention: a NULL batch on a row means "posted for everyone" (admin-wide content).
// Batch names are compared case-insensitively and ignoring surrounding spaces.

export const normBatch = (b) => (typeof b === "string" ? b.trim().toLowerCase() : "");
export const isAdmin = (user) => user?.role === "admin";
export const isStaffRole = (user) => user?.role === "admin" || user?.role === "cr";

/**
 * WHERE fragment limiting rows to what the caller may see:
 * their own batch plus global (NULL) rows. Admins see everything.
 */
export const visibleBatchClause = (user, column) => {
  if (isAdmin(user)) return { sql: "1=1", params: [] };
  return {
    sql: `(${column} IS NULL OR LOWER(TRIM(${column})) = ?)`,
    params: [normBatch(user?.batch)],
  };
};

/**
 * WHERE fragment for moderation queues: a CR only sees their own batch's
 * submissions. Admins see everything.
 */
export const moderationClause = (user, column) => {
  if (isAdmin(user)) return { sql: "1=1", params: [] };
  return { sql: `LOWER(TRIM(${column})) = ?`, params: [normBatch(user?.batch)] };
};

/** Can this user see a row that belongs to rowBatch? */
export const canSeeBatch = (user, rowBatch) =>
  isAdmin(user) || rowBatch == null || normBatch(rowBatch) === normBatch(user?.batch);

/**
 * Can this user moderate (approve/reject/edit/delete others') content in rowBatch?
 * Admins: anything. CRs: only rows of their own batch (not global rows).
 */
export const canModerateBatch = (user, rowBatch) => {
  if (isAdmin(user)) return true;
  if (user?.role !== "cr") return false;
  return rowBatch != null && normBatch(rowBatch) === normBatch(user?.batch);
};

/**
 * Batch to stamp on newly created content.
 * Non-admins always post into their own batch. Admins may target one batch,
 * or omit it / pass "all" to post for everyone (NULL).
 */
export const batchForNewContent = (user, requested) => {
  if (isAdmin(user)) {
    const r = typeof requested === "string" ? requested.trim() : "";
    return r && r.toLowerCase() !== "all" ? r : null;
  }
  return user?.batch ? user.batch.trim() : null;
};
