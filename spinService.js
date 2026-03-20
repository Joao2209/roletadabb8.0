import crypto from "crypto";
import { nanoid } from "nanoid";
import Reward from "../models/Reward.js";
import Settings from "../models/Settings.js";
import Spin from "../models/Spin.js";
import Transaction from "../models/Transaction.js";
import { memory } from "./memoryStore.js";

const useDb = process.env.NO_DB !== "1";

const randomFloat = () => {
  const buffer = crypto.randomBytes(4);
  const uint = buffer.readUInt32BE(0);
  return uint / 0xffffffff;
};

export const getSpinCost = async () => {
  if (!useDb) {
    return memory.getSpinCost();
  }
  const setting = await Settings.findOne({ key: "spin_cost" });
  return setting?.value ?? 2;
};

export const weightedPick = (rewards) => {
  const totalWeight = rewards.reduce((acc, r) => acc + r.weight, 0);
  const pick = randomFloat() * totalWeight;
  let cumulative = 0;
  for (const reward of rewards) {
    cumulative += reward.weight;
    if (pick <= cumulative) {
      return reward;
    }
  }
  return rewards[rewards.length - 1];
};

export const createSpin = async ({ user }) => {
  const spinCost = await getSpinCost();
  if (user.balance < spinCost) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  let rewards = useDb
    ? await Reward.find({ active: true }).sort({ order: 1 })
    : memory.listRewards();
  if (!rewards.length) {
    if (useDb) {
      await Reward.insertMany([
        { label: "Prêmio 1", weight: 35, type: "content", order: 1, color: "#f97316", active: true },
        { label: "Prêmio 2", weight: 25, type: "content", order: 2, color: "#22c55e", active: true },
        { label: "Prêmio 3", weight: 18, type: "access", order: 3, color: "#3b82f6", active: true },
        { label: "Prêmio 4", weight: 2, type: "special", order: 4, color: "#e11d48", active: true },
        { label: "Prêmio 5", weight: 2, type: "special", order: 5, color: "#a855f7", active: true },
        { label: "Prêmio 6", weight: 10, type: "content", order: 6, color: "#f59e0b", active: true },
        { label: "Prêmio 7", weight: 6, type: "content", order: 7, color: "#14b8a6", active: true },
        { label: "Prêmio 8", weight: 2, type: "special", order: 8, color: "#ef4444", active: true },
      ]);
      rewards = await Reward.find({ active: true }).sort({ order: 1 });
    } else {
      rewards = memory.listRewards();
    }
  }

  const reward = weightedPick(rewards);
  const rewardIndex = rewards.findIndex((r) => r.id === reward.id);
  const segments = rewards.length;
  const segmentAngle = 360 / segments;
  const offset = randomFloat() * (segmentAngle * 0.8) + segmentAngle * 0.1;
  const startAngle = rewardIndex * segmentAngle;
  const targetAngle = startAngle + offset;

  const extraSpins = 5 + Math.floor(randomFloat() * 4);
  const rotationDegrees = extraSpins * 360 + (360 - targetAngle);

  user.balance -= spinCost;
  if (useDb) {
    await user.save();
    await Transaction.create({
      userId: user.id,
      type: "debit",
      amount: spinCost,
      reason: "spin",
    });
  } else {
    memory.updateUser(user);
    memory.addTransaction({
      userId: user.id,
      type: "debit",
      amount: spinCost,
      reason: "spin",
      createdAt: new Date().toISOString(),
    });
  }

  if (reward.type === "free_spin") {
    user.balance += spinCost;
    if (useDb) {
      await user.save();
      await Transaction.create({
        userId: user.id,
        type: "credit",
        amount: spinCost,
        reason: "free_spin_refund",
      });
    } else {
      memory.updateUser(user);
      memory.addTransaction({
        userId: user.id,
        type: "credit",
        amount: spinCost,
        reason: "free_spin_refund",
        createdAt: new Date().toISOString(),
      });
    }
  }

  const spin = useDb
    ? await Spin.create({
        userId: user.id,
        rewardId: reward.id,
        rewardLabel: reward.label,
        cost: spinCost,
        resultAngle: targetAngle,
        rotationDegrees,
      })
    : {
        id: nanoid(),
        userId: user.id,
        rewardId: reward.id,
        rewardLabel: reward.label,
        cost: spinCost,
        resultAngle: targetAngle,
        rotationDegrees,
      };

  if (!useDb) {
    memory.addSpin(spin);
  }

  return { spin, reward, rewards, spinCost };
};
