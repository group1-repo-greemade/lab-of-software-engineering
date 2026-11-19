import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(__dirname, "../../data");
const databaseFile = path.join(dataDirectory, "store.json");

let writeQueue = Promise.resolve();

const initialProducts = [
  { id: "p-1001", name: "هدفون بی‌سیم AirBeat", category: "صوتی", description: "هدفون سبک با صدای شفاف، اتصال پایدار و شارژدهی مناسب برای استفاده روزمره.", price: 2450000, stock: 18, emoji: "🎧", featured: true },
  { id: "p-1002", name: "ساعت هوشمند Nova S", category: "گجت هوشمند", description: "نمایش اعلان‌ها، پایش فعالیت روزانه و طراحی مینیمال با بند قابل تعویض.", price: 3890000, stock: 12, emoji: "⌚", featured: true },
  { id: "p-1003", name: "کیبورد مکانیکال K2", category: "لوازم جانبی", description: "کیبورد جمع‌وجور مناسب کار و بازی با کلیدهای خوش‌ساخت و نور پس‌زمینه.", price: 3150000, stock: 9, emoji: "⌨️", featured: true },
  { id: "p-1004", name: "ماوس بی‌سیم Ergo", category: "لوازم جانبی", description: "ماوس خوش‌دست با حسگر دقیق و طراحی ارگونومیک برای استفاده طولانی.", price: 1290000, stock: 25, emoji: "🖱️", featured: false },
  { id: "p-1005", name: "اسپیکر قابل حمل Boom", category: "صوتی", description: "اسپیکر قابل حمل با صدای قدرتمند، بدنه مقاوم و باتری بادوام.", price: 1980000, stock: 14, emoji: "🔊", featured: false },
  { id: "p-1006", name: "پایه نگهدارنده لپ‌تاپ", category: "لوازم جانبی", description: "پایه آلومینیومی قابل تنظیم برای ایجاد زاویه دید بهتر و نظم میز کار.", price: 870000, stock: 30, emoji: "💻", featured: false },
  { id: "p-1007", name: "چراغ هوشمند Luma", category: "گجت هوشمند", description: "چراغ رومیزی با شدت نور قابل تنظیم و حالت‌های روشنایی متنوع.", price: 1560000, stock: 20, emoji: "💡", featured: false },
  { id: "p-1008", name: "پاوربانک ۲۰۰۰۰", category: "موبایل", description: "ظرفیت مناسب برای شارژ روزانه دستگاه‌های همراه با دو خروجی کاربردی.", price: 1760000, stock: 16, emoji: "🔋", featured: true },
  { id: "p-1009", name: "قاب محافظ تبلت", category: "موبایل", description: "قاب محافظ سبک با پوشش مناسب لبه‌ها و امکان قرارگیری در چند زاویه.", price: 690000, stock: 40, emoji: "📱", featured: false }
];

function makeInitialDatabase(adminPasswordHash) {
  const now = new Date().toISOString();
  return {
    users: [
      {
        id: randomUUID(),
        name: "مدیر فروشگاه",
        email: "admin@techmart.local",
        passwordHash: adminPasswordHash,
        role: "admin",
        createdAt: now
      }
    ],
    products: initialProducts.map((product) => ({ ...product, createdAt: now, updatedAt: now })),
    carts: {},
    orders: []
  };
}

export async function initializeDatabase() {
  await fs.mkdir(dataDirectory, { recursive: true });
  try {
    await fs.access(databaseFile);
    const existing = await readDatabase();
    if (!Array.isArray(existing.users) || !Array.isArray(existing.products)) {
      throw new Error("ساختار فایل داده معتبر نیست. فایل data/store.json را بررسی کنید.");
    }
    return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const adminPasswordHash = await bcrypt.hash("Admin123!", 12);
  const initialDatabase = makeInitialDatabase(adminPasswordHash);
  await fs.writeFile(databaseFile, JSON.stringify(initialDatabase, null, 2), "utf8");
}

export async function readDatabase() {
  const raw = await fs.readFile(databaseFile, "utf8");
  return JSON.parse(raw);
}

export function updateDatabase(mutator) {
  const task = writeQueue.then(async () => {
    const database = await readDatabase();
    const result = await mutator(database);
    const temporaryFile = `${databaseFile}.tmp`;
    await fs.writeFile(temporaryFile, JSON.stringify(database, null, 2), "utf8");
    await fs.rename(temporaryFile, databaseFile);
    return result;
  });
  writeQueue = task.catch(() => undefined);
  return task;
}

export function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}
