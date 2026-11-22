import { describe, it, expect } from 'vitest';
import { currentBalance, csvCell, withRunningBalance } from '../src/ledger.js';

const e = (id: number, type: 'deposit' | 'withdrawal', amount: number, voided = 0) => ({
  id, date: '2026-01-01', type, amount, voided,
});

describe('running balance', () => {
  it('accumulates and skips voided', () => {
    const rows = withRunningBalance([e(1, 'deposit', 100), e(2, 'withdrawal', 30), e(3, 'deposit', 999, 1), e(4, 'deposit', 5)]);
    expect(rows.map((r) => r.balance)).toEqual([100, 70, 70, 75]);
    expect(currentBalance(rows)).toBe(75);
  });
  it('starts at zero', () => expect(currentBalance([])).toBe(0));
});

describe('csvCell', () => {
  it('quotes and escapes', () => expect(csvCell('a,"b"')).toBe('"a,""b"""'));
  it('neutralizes formulas', () => expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)"));
  it('handles null', () => expect(csvCell(null)).toBe(''));
});
