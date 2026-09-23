export const roles = Object.freeze({
  guest: Object.freeze({
    label: "訪客",
    description: "只能瀏覽整週活動",
    permissions: Object.freeze(["week:view"]),
  }),
  admin: Object.freeze({
    label: "系統管理員",
    description: "可查看及維護全部資料",
    permissions: Object.freeze(["*"]),
  }),
});

export function createGuestUser() {
  return Object.freeze({
    username: "guest",
    displayName: "訪客",
    role: "guest",
    roleLabel: roles.guest.label,
    roleDescription: roles.guest.description,
    permissions: roles.guest.permissions,
  });
}

export function createSessionUser(account) {
  const role = roles[account?.role] ? account.role : "guest";
  const profile = roles[role];
  return Object.freeze({
    username: account?.username || "guest",
    displayName: account?.displayName || profile.label,
    role,
    roleLabel: profile.label,
    roleDescription: profile.description,
    permissions: profile.permissions,
  });
}

export function canAccessView(user, viewName) {
  return user?.role === "admin" || viewName === "week";
}
