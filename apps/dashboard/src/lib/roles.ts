export const roleRank: Record<string, number> = { viewer: 1, admin: 2, owner: 3 };

export function canSeeItem(itemMinRole: string | undefined, role: string | null | undefined) {
  if (!itemMinRole) return true;
  if (role === undefined) return true;
  if (!role) return false;
  return (roleRank[role] ?? 0) >= (roleRank[itemMinRole] ?? 99);
}
