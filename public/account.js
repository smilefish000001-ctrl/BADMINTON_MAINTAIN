export const roles = Object.freeze({
  admin: Object.freeze({
    label: "管理員",
    description: "最高權限",
    permissions: Object.freeze(["*"]),
  }),
  organizer: Object.freeze({
    label: "揪團管理員",
    description: "可維護固定團與活動",
    permissions: Object.freeze(["groups:manage", "activities:manage", "activities:join"]),
  }),
  user: Object.freeze({
    label: "一般使用者",
    description: "可查看及參加活動",
    permissions: Object.freeze(["activities:join"]),
  }),
});

export const currentAccount = Object.freeze({
  username: "0000",
  displayName: "系統管理員",
  role: "admin",
});

export function getCurrentUser() {
  return Object.freeze({
    ...currentAccount,
    roleLabel: roles[currentAccount.role].label,
    roleDescription: roles[currentAccount.role].description,
    permissions: roles[currentAccount.role].permissions,
  });
}
