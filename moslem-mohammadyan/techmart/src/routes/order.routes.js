import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createOrder, getUserOrders } from "../services/order.service.js";

const router = Router();
router.use(requireAuth);

router.post("/", async (req, res, next) => {
  try {
    const order = await createOrder(req.user.id, req.body);
    res.status(201).json({ order });
  } catch (error) {
    const clientErrors = [
      "آدرس باید حداقل ۱۰ نویسه داشته باشد.",
      "شماره همراه باید با 09 شروع شود و ۱۱ رقم داشته باشد.",
      "روش پرداخت انتخاب‌شده معتبر نیست.",
      "سبد خرید شما خالی است.",
      "حساب کاربری پیدا نشد."
    ];
    if (clientErrors.includes(error.message) || error.message.startsWith("موجودی") || error.message.startsWith("یکی از محصولات")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try { res.json({ orders: await getUserOrders(req.user.id) }); } catch (error) { next(error); }
});

export default router;
