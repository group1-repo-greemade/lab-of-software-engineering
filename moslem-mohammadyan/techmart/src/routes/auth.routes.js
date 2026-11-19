import { Router } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { readDatabase, updateDatabase, toPublicUser } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

router.get("/me", async (req, res, next) => {
  try {
    if (!req.session.userId) return res.json({ user: null });
    const database = await readDatabase();
    const user = database.users.find((item) => item.id === req.session.userId);
    if (!user) return res.json({ user: null });
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (name.length < 2 || name.length > 60) return res.status(400).json({ error: "نام باید بین ۲ تا ۶۰ نویسه باشد." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "ایمیل معتبر وارد کنید." });
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) return res.status(400).json({ error: "رمز عبور باید حداقل ۸ نویسه داشته باشد و از محدودیت طول پشتیبانی‌شده بیشتر نباشد." });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await updateDatabase((database) => {
      if (database.users.some((item) => item.email === email)) throw new Error("این ایمیل قبلاً ثبت شده است.");
      const newUser = {
        id: randomUUID(),
        name,
        email,
        passwordHash,
        role: "customer",
        createdAt: new Date().toISOString()
      };
      database.users.push(newUser);
      database.carts[newUser.id] = [];
      return newUser;
    });

    await regenerateSession(req);
    req.session.userId = user.id;
    res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    if (error.message === "این ایمیل قبلاً ثبت شده است.") return res.status(409).json({ error: error.message });
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const database = await readDatabase();
    const user = database.users.find((item) => item.email === email);
    const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!isValid) return res.status(401).json({ error: "ایمیل یا رمز عبور اشتباه است." });

    await regenerateSession(req);
    req.session.userId = user.id;
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ error: "خروج از حساب انجام نشد." });
    res.clearCookie("techmart.sid");
    res.json({ message: "از حساب کاربری خارج شدید." });
  });
});

router.get("/profile", requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

export default router;
