import { readDatabase, updateDatabase } from "../data/store.js";

function buildCart(database, userId) {
  const savedItems = database.carts[userId] || [];
  const items = savedItems
    .map((saved) => {
      const product = database.products.find((item) => item.id === saved.productId);
      if (!product) return null;
      return {
        product: { ...product },
        quantity: saved.quantity,
        lineTotal: product.price * saved.quantity
      };
    })
    .filter(Boolean);

  return {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    total: items.reduce((total, item) => total + item.lineTotal, 0)
  };
}

export async function getCart(userId) {
  const database = await readDatabase();
  return buildCart(database, userId);
}

export async function addCartItem(userId, productId, quantity = 1) {
  return updateDatabase((database) => {
    const product = database.products.find((item) => item.id === productId);
    if (!product) throw new Error("محصول موردنظر پیدا نشد.");
    if (product.stock < quantity) throw new Error("موجودی محصول برای این تعداد کافی نیست.");

    const cart = database.carts[userId] || [];
    const existing = cart.find((item) => item.productId === productId);
    const nextQuantity = (existing?.quantity || 0) + quantity;
    if (nextQuantity > product.stock) throw new Error("تعداد انتخاب‌شده بیشتر از موجودی محصول است.");

    if (existing) existing.quantity = nextQuantity;
    else cart.push({ productId, quantity });
    database.carts[userId] = cart;
    return buildCart(database, userId);
  });
}

export async function setCartItemQuantity(userId, productId, quantity) {
  return updateDatabase((database) => {
    const cart = database.carts[userId] || [];
    const item = cart.find((entry) => entry.productId === productId);
    const product = database.products.find((entry) => entry.id === productId);
    if (!item || !product) throw new Error("محصول در سبد خرید وجود ندارد.");
    if (quantity > product.stock) throw new Error("تعداد انتخاب‌شده بیشتر از موجودی محصول است.");
    item.quantity = quantity;
    database.carts[userId] = cart.filter((entry) => entry.quantity > 0);
    return buildCart(database, userId);
  });
}

export async function removeCartItem(userId, productId) {
  return updateDatabase((database) => {
    database.carts[userId] = (database.carts[userId] || []).filter((item) => item.productId !== productId);
    return buildCart(database, userId);
  });
}
