export type Role = 'admin' | 'officer' | 'member';
const rank: Record<Role, number> = { member: 1, officer: 2, admin: 3 };
export function roleAtLeast(role: Role, min: Role): boolean {
  return rank[role] >= rank[min];
}
