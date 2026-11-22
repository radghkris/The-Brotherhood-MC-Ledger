export type EntryRow = {
  id: number;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  voided: number;
};

export const signed = (e: Pick<EntryRow, 'type' | 'amount'>) => (e.type === 'deposit' ? e.amount : -e.amount);

/** Adds `balance` (after this entry) to each row. Rows must be in date, id order. Voided rows don't move the balance. */
export function withRunningBalance<T extends EntryRow>(rows: T[]): (T & { balance: number })[] {
  let bal = 0;
  return rows.map((r) => {
    if (!r.voided) bal += signed(r);
    return { ...r, balance: bal };
  });
}

export function currentBalance(rows: EntryRow[]): number {
  return rows.reduce((b, r) => (r.voided ? b : b + signed(r)), 0);
}

const DANGEROUS = /^[=+\-@\t\r]/;
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (DANGEROUS.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
