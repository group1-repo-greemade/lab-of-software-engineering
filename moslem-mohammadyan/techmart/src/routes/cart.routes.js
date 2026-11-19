import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { addCartItem, getCart, removeCartItem, setCartItemQuantity } from "../services/cart.service.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try { res.json(await getCart(req.user.id)); } catch (error) { next(error); }
});

router.post("/items", async (req, res, next) => {
  try {
    const productId = String(req.body.productId || "");
    const quantity = Number(req.body.quantity ?? 1);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: "اطلاعات محصول یا تعداد معتبر نیست." });
    }
    res.status(201).json(await addCartItem(req.user.id, productId, quantity));
  } catch (error) {
    if (["محصول موردنظر پیدا نشد.", "موجودی محصول برای این تعداد کافی نیست.", "تعداد انتخاب‌شده بیشتر از موجودی محصول است."].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.patch("/items/:productId", async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) return res.status(400).json({ error: "تعداد معتبر نیست." });
    res.json(await setCartItemQuantity(req.user.id, req.params.productId, quantity));
  } catch (error) {
    if (error.message.includes("سبد خرید") || error.message.includes("موجودی")) return res.status(400).json({ error: error.message });
    next(error);
  }
});

router.delete("/items/:productId", async (req, res, next) => {
  try { res.json(await removeCartItem(req.user.id, req.params.productId)); } catch (error) { next(error); }
});

export default router;
