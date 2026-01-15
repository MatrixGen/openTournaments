export const isPending = (status) =>
  ["pending", "processing", "initiated"].includes(status);

export const isStuck = (status, createdAt) =>
  isPending(status) && new Date() - new Date(createdAt) > 5 * 60 * 1000;

export const canReconcile = (status, type) =>
  isPending(status) && type === "wallet_deposit";

export const canCancel = (status, type) =>
  isPending(status) && type === "wallet_withdrawal";
