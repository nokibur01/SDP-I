-- =========================================================================
-- BATCHHUB MIGRATION 05: PER-BATCH CONTENT SCOPING
-- =========================================================================
-- Tasks, events and resources become visible only to the batch they belong to.
-- batch IS NULL means "posted for everyone" (used for admin-wide content).
-- Notices keep using their existing target_audience column ('all' or a batch).

ALTER TABLE tasks     ADD COLUMN IF NOT EXISTS batch VARCHAR(50) NULL;
ALTER TABLE events    ADD COLUMN IF NOT EXISTS batch VARCHAR(50) NULL;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS batch VARCHAR(50) NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_batch     ON tasks (batch);
CREATE INDEX IF NOT EXISTS idx_events_batch    ON events (batch);
CREATE INDEX IF NOT EXISTS idx_materials_batch ON materials (batch);

-- Backfill existing rows from their creator's batch. Admin-created rows stay
-- NULL (global), as do rows whose creator no longer exists.
UPDATE tasks t     JOIN users u ON t.created_by  = u.id SET t.batch = u.batch WHERE t.batch IS NULL AND u.role <> 'admin';
UPDATE events e    JOIN users u ON e.created_by  = u.id SET e.batch = u.batch WHERE e.batch IS NULL AND u.role <> 'admin';
UPDATE materials m JOIN users u ON m.uploaded_by = u.id SET m.batch = u.batch WHERE m.batch IS NULL AND u.role <> 'admin';

-- Announcements a CR posted to "all" were meant for their own cohort.
UPDATE notices n JOIN users u ON n.created_by = u.id
   SET n.target_audience = u.batch
 WHERE (n.target_audience IS NULL OR LOWER(n.target_audience) = 'all')
   AND u.role = 'cr' AND u.batch IS NOT NULL;
