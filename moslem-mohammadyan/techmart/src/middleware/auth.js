import { readDatabase } from "../data/store.js";

export async function requireAuth(req, res, next) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "برای انجام این کار ابتدا وارد حساب کاربری شوید." });
    }

    const database = await readDatabase();
    const user = database.users.find((item) => item.id === req.session.userId);
    if (!user) {
      req.session.destroy(() => undefined);
      return res.status(401).json({ error: "نشست کاربری معتبر نیست. دوباره وارد شوید." });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "دسترسی به این بخش فقط برای مدیر فروشگاه مجاز است." });
  }
  next();
}
