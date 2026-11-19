import { Router } from "express";
import { randomUUID } from "node:crypto";
import { readDatabase, updateDatabase } from "../data/store.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { changeOrderStatus, getAllOrders } from "../services/order.service.js";

const router = Router();
router.use(requireAuth, requireAdmin);

function validateProduct(body) {
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const description = String(body.description || "").trim();
  const price = Number(body.price);
  const stock = Number(body.stock);
  const emoji = String(body.emoji || "📦").trim().slice(0, 8);
  if (name.length < 2 || name.length > 100) throw new Error("نام محصول باید بین ۲ تا ۱۰۰ نویسه باشد.");
  if (!category || category.length > 40) throw new Error("دسته‌بندی محصول معتبر نیست.");
  if (!description || description.length > 500) throw new Error("توضیحات محصول معتبر نیست.");
  if (!Number.isInteger(price) || price < 1) throw new Error("قیمت باید عدد صحیح و بزرگ‌تر از صفر باشد.");
  if (!Number.isInteger(stock) || stock < 0) throw new Error("موجودی باید عدد صحیح و صفر یا بیشتر باشد.");
  return { name, category, description, price, stock, emoji };
}

router.get("/summary", async (req, res, next) => {
  try {
    const database = await readDatabase();
    res.json({
      totalProducts: database.products.length,
      totalCustomers: database.users.filter((user) => user.role === "customer").length,
      totalOrders: database.orders.length,
      revenue: database.orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0)
    });
  } catch (error) { next(error); }
});

router.get("/orders", async (req, res, next) => {
  try { res.json({ orders: await getAllOrders() }); } catch (error) { next(error); }
});

router.patch("/orders/:orderId/status", async (req, res, next) => {
  try {
    const order = await changeOrderStatus(req.params.orderId, String(req.body.status || ""));
    res.json({ order });
  } catch (error) {
    if (error.message === "وضعیت سفارش معتبر نیست." || error.message === "سفارش پیدا نشد." || error.message.startsWith("تغییر وضعیت")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post("/products", async (req, res, next) => {
  try {
    const productData = validateProduct(req.body);
    const product = await updateDatabase((database) => {
      const newProduct = { id: randomUUID(), ...productData, featured: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      database.products.push(newProduct);
      return newProduct;
    });
    res.status(201).json({ product });
  } catch (error) {
    if (error.message.startsWith("نام محصول") || error.message.startsWith("دسته‌بندی") || error.message.startsWith("توضیحات") || error.message.startsWith("قیمت") || error.message.startsWith("موجودی")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.patch("/products/:productId", async (req, res, next) => {
  try {
    const productData = validateProduct(req.body);
    const product = await updateDatabase((database) => {
      const existing = database.products.find((item) => item.id === req.params.productId);
      if (!existing) throw new Error("محصول پیدا نشد.");
      Object.assign(existing, productData, { updatedAt: new Date().toISOString() });
      return existing;
    });
    res.json({ product });
  } catch (error) {
    if (error.message === "محصول پیدا نشد." || error.message.startsWith("نام محصول") || error.message.startsWith("دسته‌بندی") || error.message.startsWith("توضیحات") || error.message.startsWith("قیمت") || error.message.startsWith("موجودی")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.delete("/products/:productId", async (req, res, next) => {
  try {
    const removed = await updateDatabase((database) => {
      const index = database.products.findIndex((item) => item.id === req.params.productId);
      if (index === -1) return false;
      database.products.splice(index, 1);
      return true;
    });
    if (!removed) return res.status(404).json({ error: "محصول پیدا نشد." });
    res.json({ message: "محصول حذف شد." });
  } catch (error) { next(error); }
});

export default router;
