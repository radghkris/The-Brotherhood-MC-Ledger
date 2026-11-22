import type { Db } from './db.js';

export function logAudit(
  db: Db,
  e: { userId: number | null; action: string; entity: string; entityId?: number; before?: unknown; after?: unknown },
): void {
  db.prepare(
    'INSERT INTO audit_log (user_id, action, entity, entity_id, before_json, after_json) VALUES (?,?,?,?,?,?)',
  ).run(
    e.userId,
    e.action,
    e.entity,
    e.entityId ?? null,
    e.before === undefined ? null : JSON.stringify(e.before),
    e.after === undefined ? null : JSON.stringify(e.after),
  );
}
