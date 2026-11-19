import { randomUUID } from "node:crypto";
import { updateDatabase, readDatabase } from "../data/store.js";

const allowedTransitions = {
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: []
};

export async function createOrder(userId, payload) {
  const address = String(payload.address || "").trim();
  const phone = String(payload.phone || "").trim();
  const paymentMethod = payload.paymentMethod;

  if (address.length < 10) throw new Error("آدرس باید حداقل ۱۰ نویسه داشته باشد.");
  if (!/^09\d{9}$/.test(phone)) throw new Error("شماره همراه باید با 09 شروع شود و ۱۱ رقم داشته باشد.");
  if (!["cod", "demo"].includes(paymentMethod)) throw new Error("روش پرداخت انتخاب‌شده معتبر نیست.");

  return updateDatabase((database) => {
    const cart = database.carts[userId] || [];
    if (cart.length === 0) throw new Error("سبد خرید شما خالی است.");

    const orderItems = cart.map((cartItem) => {
      const product = database.products.find((item) => item.id === cartItem.productId);
      if (!product) throw new Error("یکی از محصولات سبد خرید دیگر موجود نیست.");
      if (product.stock < cartItem.quantity) throw new Error(`موجودی ${product.name} کافی نیست.`);
      return {
        productId: product.id,
        name: product.name,
        emoji: product.emoji,
        unitPrice: product.price,
        quantity: cartItem.quantity,
        lineTotal: product.price * cartItem.quantity
      };
    });

    const total = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const user = database.users.find((item) => item.id === userId);
    if (!user) throw new Error("حساب کاربری پیدا نشد.");

    for (const item of orderItems) {
      const product = database.products.find((entry) => entry.id === item.productId);
      product.stock -= item.quantity;
      product.updatedAt = new Date().toISOString();
    }

    const order = {
      id: randomUUID(),
      code: `TM-${Date.now().toString().slice(-8)}-${randomUUID().slice(0, 4).toUpperCase()}`,
      userId,
      customerName: user.name,
      customerEmail: user.email,
      phone,
      address,
      paymentMethod,
      paymentStatus: paymentMethod === "demo" ? "paid_demo" : "pending",
      status: "confirmed",
      items: orderItems,
      total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    database.orders.unshift(order);
    database.carts[userId] = [];
    return order;
  });
}

export async function getUserOrders(userId) {
  const database = await readDatabase();
  return database.orders.filter((order) => order.userId === userId);
}

export async function getAllOrders() {
  const database = await readDatabase();
  return database.orders;
}

export async function changeOrderStatus(orderId, nextStatus) {
  const allowedStatuses = Object.keys(allowedTransitions);
  if (!allowedStatuses.includes(nextStatus)) throw new Error("وضعیت سفارش معتبر نیست.");

  return updateDatabase((database) => {
    const order = database.orders.find((item) => item.id === orderId);
    if (!order) throw new Error("سفارش پیدا نشد.");
    if (!allowedTransitions[order.status]?.includes(nextStatus)) {
      throw new Error(`تغییر وضعیت از «${order.status}» به «${nextStatus}» مجاز نیست.`);
    }
    if (nextStatus === "cancelled") {
      for (const item of order.items) {
        const product = database.products.find((entry) => entry.id === item.productId);
        if (product) {
          product.stock += item.quantity;
          product.updatedAt = new Date().toISOString();
        }
      }
    }

    order.status = nextStatus;
    order.updatedAt = new Date().toISOString();
    return order;
  });
}
