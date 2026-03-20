import User from "../models/User.js";
import { memory } from "./memoryStore.js";

const useDb = process.env.NO_DB !== "1";

export const requireUser = async (req, res, next) => {
  try {
    const userId = req.header("x-user-id");
    if (!userId) {
      return res.status(401).json({ error: "Missing x-user-id" });
    }
    const user = useDb ? await User.findById(userId) : memory.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin = (req, res, next) => {
  const adminKey = req.header("x-admin-key");
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};
