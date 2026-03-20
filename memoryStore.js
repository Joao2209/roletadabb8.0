import { nanoid } from "nanoid";

const state = {
  users: new Map(),
  rewards: [],
  spins: [],
  transactions: [],
  payments: new Map(),
  settings: new Map(),
};

const now = () => new Date().toISOString();

const defaultRewards = () => [
  { id: "r1", label: "Prêmio 1", weight: 35, type: "content", order: 1, color: "#f97316", active: true },
  { id: "r2", label: "Prêmio 2", weight: 25, type: "content", order: 2, color: "#22c55e", active: true },
  { id: "r3", label: "Prêmio 3", weight: 18, type: "access", order: 3, color: "#3b82f6", active: true },
  { id: "r4", label: "Prêmio 4", weight: 2, type: "special", order: 4, color: "#e11d48", active: true },
  { id: "r5", label: "Prêmio 5", weight: 2, type: "special", order: 5, color: "#a855f7", active: true },
  { id: "r6", label: "Prêmio 6", weight: 10, type: "content", order: 6, color: "#f59e0b", active: true },
  { id: "r7", label: "Prêmio 7", weight: 6, type: "content", order: 7, color: "#14b8a6", active: true },
  { id: "r8", label: "Prêmio 8", weight: 2, type: "special", order: 8, color: "#ef4444", active: true },
];

const ensureRewards = () => {
  if (!state.rewards.length) {
    state.rewards = defaultRewards();
  }
};

const ensureSpinCost = () => {
  if (!state.settings.has("spin_cost")) {
    state.settings.set("spin_cost", 2);
  }
};

export const memory = {
  ensureRewards,
  ensureSpinCost,
  createUser: ({ name, email }) => {
    const id = nanoid();
    const user = { id, _id: id, name: name || "Guest", email, balance: 0, isAdmin: false, createdAt: now(), updatedAt: now() };
    state.users.set(id, user);
    return user;
  },
  getUser: (id) => state.users.get(id),
  updateUser: (user) => {
    user.updatedAt = now();
    state.users.set(user.id, user);
    return user;
  },
  listRewards: () => {
    ensureRewards();
    return state.rewards.filter((r) => r.active).sort((a, b) => a.order - b.order);
  },
  getSpinCost: () => {
    ensureSpinCost();
    return state.settings.get("spin_cost");
  },
  setSpinCost: (value) => {
    state.settings.set("spin_cost", value);
  },
  addSpin: (spin) => {
    state.spins.unshift(spin);
  },
  addTransaction: (tx) => {
    state.transactions.unshift(tx);
  },
  listTransactions: (userId) =>
    userId ? state.transactions.filter((t) => t.userId === userId).slice(0, 50) : state.transactions,
  listSpins: (userId) => (userId ? state.spins.filter((s) => s.userId === userId).slice(0, 50) : state.spins),
  savePayment: (payment) => {
    state.payments.set(payment.providerId, payment);
  },
  getPaymentByProviderId: (providerId) => state.payments.get(providerId),
};
