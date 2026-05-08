import { db } from './db';

const orderTables = {
  cases: 'cases',
  testimonials: 'testimonials',
} as const;

export type AdminOrderTarget = keyof typeof orderTables;

export function parseAdminOrderIds(body: { ids?: unknown } | null) {
  return Array.isArray(body?.ids) ? body.ids.map(Number).filter(Number.isInteger) : [];
}

export function saveAdminOrder(target: AdminOrderTarget, ids: number[]) {
  const table = orderTables[target];

  const updateOrder = db.transaction((orderedIds: number[]) => {
    const update = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
    const maxOrder = orderedIds.length - 1;

    orderedIds.forEach((id, index) => {
      update.run(maxOrder - index, id);
    });
  });

  updateOrder(ids);
}
