const state = {
  user: null,
  products: [],
  allProducts: [],
  categories: ["همه"],
  selectedCategory: "همه",
  cart: { items: [], itemCount: 0, total: 0 },
  authMode: "login"
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const dialogs = ["authDialog", "cartDialog", "ordersDialog", "adminDialog", "userDialog"];

function formatPrice(value) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value) || 0)} تومان`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.textContent = message;
  $("#toastRegion").append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function openDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog && !dialog.open) dialog.showModal();
}

function closeDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog?.open) dialog.close();
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "ارتباط با سرور انجام نشد.");
  return payload;
}

function getGuestCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem("techmart.guestCart") || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveGuestCart(cart) {
  localStorage.setItem("techmart.guestCart", JSON.stringify(cart));
}

function buildGuestCart() {
  const saved = getGuestCart();
  const items = Object.entries(saved).map(([productId, quantity]) => {
    const product = state.allProducts.find((entry) => entry.id === productId);
    if (!product || !Number.isInteger(quantity) || quantity < 1) return null;
    return { product: { ...product }, quantity, lineTotal: product.price * quantity };
  }).filter(Boolean);
  state.cart = {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.lineTotal, 0)
  };
  updateCartBadge();
  return state.cart;
}

function updateCartBadge() {
  $("#cartCount").textContent = new Intl.NumberFormat("fa-IR").format(state.cart.itemCount || 0);
}

function updateAccountHeader() {
  const accountButton = $("#accountButton");
  const userMenuButton = $("#userMenuButton");
  if (state.user) {
    accountButton.classList.add("hidden");
    userMenuButton.classList.remove("hidden");
    userMenuButton.textContent = (state.user.name || "ب").trim().slice(0, 1);
    $("#userNameLabel").textContent = state.user.name;
    $("#adminPanelButton").classList.toggle("hidden", state.user.role !== "admin");
  } else {
    accountButton.classList.remove("hidden");
    userMenuButton.classList.add("hidden");
  }
}

async function loadProducts() {
  const search = $("#searchInput").value.trim();
  const sort = $("#sortSelect").value;
  const params = new URLSearchParams({ search, sort, category: state.selectedCategory });
  const [result, allResult] = await Promise.all([
    api(`/api/products?${params.toString()}`),
    api("/api/products")
  ]);
  state.products = result.products;
  state.allProducts = allResult.products;
  state.categories = result.categories;
  renderCategories();
  renderProducts();
  if (!state.user) buildGuestCart();
}

function renderCategories() {
  $("#categoryList").innerHTML = state.categories.map((category) => `
    <button class="category-chip ${category === state.selectedCategory ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
  `).join("");
}

function renderProducts() {
  const grid = $("#productGrid");
  if (!state.products.length) {
    grid.innerHTML = '<div class="empty-state">محصولی با این مشخصات پیدا نشد.</div>';
    return;
  }
  grid.innerHTML = state.products.map((product) => `
    <article class="product-card">
      <div class="product-art">
        ${product.featured ? '<span class="product-tag">پیشنهاد تک‌مارت</span>' : ""}
        <span class="product-stock">${product.stock > 0 ? `موجودی: ${new Intl.NumberFormat("fa-IR").format(product.stock)}` : "ناموجود"}</span>
        <span class="product-emoji" aria-hidden="true">${escapeHtml(product.emoji)}</span>
      </div>
      <div class="product-info">
        <span class="product-category">${escapeHtml(product.category)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="product-bottom">
          <div class="product-price">${formatPrice(product.price)}<small>قیمت نهایی</small></div>
          <button class="add-button" type="button" data-action="add" data-id="${escapeHtml(product.id)}" ${product.stock < 1 ? "disabled" : ""}>افزودن به سبد +</button>
        </div>
      </div>
    </article>
  `).join("");
}

async function loadMe() {
  const result = await api("/api/auth/me");
  state.user = result.user;
  updateAccountHeader();
  if (state.user) await loadCart();
  else buildGuestCart();
}

async function loadCart() {
  if (!state.user) return buildGuestCart();
  state.cart = await api("/api/cart");
  updateCartBadge();
  return state.cart;
}

async function mergeGuestCart() {
  const guestCart = getGuestCart();
  const entries = Object.entries(guestCart);
  for (const [productId, quantity] of entries) {
    try {
      await api("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId, quantity })
      });
    } catch (error) {
      showToast(error.message, "error");
    }
  }
  saveGuestCart({});
  await loadCart();
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isRegister = mode === "register";
  $("#authTitle").textContent = isRegister ? "ساخت حساب کاربری" : "ورود به حساب";
  $("#authSubmit").textContent = isRegister ? "ثبت‌نام و ورود" : "ورود به حساب";
  $("#nameField").classList.toggle("hidden", !isRegister);
  $("#authForm [name=password]").setAttribute("autocomplete", isRegister ? "new-password" : "current-password");
  $$("[data-auth-mode]").forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
  $("#authMessage").textContent = "";
}

function statusLabel(status) {
  return ({
    confirmed: "تأیید شده",
    processing: "در حال آماده‌سازی",
    shipped: "ارسال شده",
    delivered: "تحویل شده",
    cancelled: "لغو شده"
  })[status] || status;
}

function renderCart() {
  const cart = state.user ? state.cart : buildGuestCart();
  const target = $("#cartContents");
  if (!cart.items.length) {
    target.innerHTML = '<div class="empty-state">سبد خرید شما خالی است. از فروشگاه محصولی انتخاب کنید.</div>';
    return;
  }

  const itemsHtml = cart.items.map((item) => `
    <div class="cart-row">
      <div class="cart-row-art">${escapeHtml(item.product.emoji)}</div>
      <div>
        <h3>${escapeHtml(item.product.name)}</h3>
        <small>${formatPrice(item.product.price)} برای هر عدد</small>
        <div class="quantity-control">
          <button type="button" data-action="quantity" data-id="${escapeHtml(item.product.id)}" data-delta="1" aria-label="افزایش تعداد">+</button>
          <span>${new Intl.NumberFormat("fa-IR").format(item.quantity)}</span>
          <button type="button" data-action="quantity" data-id="${escapeHtml(item.product.id)}" data-delta="-1" aria-label="کاهش تعداد">−</button>
        </div>
      </div>
      <div class="cart-row-end">
        <strong>${formatPrice(item.lineTotal)}</strong>
        <button class="remove-link" type="button" data-action="remove" data-id="${escapeHtml(item.product.id)}">حذف</button>
      </div>
    </div>
  `).join("");

  const checkoutHtml = state.user ? `
    <form id="checkoutForm" class="checkout-area">
      <h3>اطلاعات ارسال و پرداخت</h3>
      <div class="checkout-grid">
        <label class="form-field full-field">آدرس کامل تحویل<input name="address" required minlength="10" maxlength="300" placeholder="استان، شهر، خیابان، پلاک و واحد"></label>
        <label class="form-field">شماره همراه<input name="phone" required inputmode="numeric" pattern="09[0-9]{9}" maxlength="11" placeholder="09123456789"></label>
        <label class="form-field">روش پرداخت<select name="paymentMethod"><option value="cod">پرداخت در محل</option><option value="demo">پرداخت آزمایشی (بدون درگاه بانکی)</option></select></label>
      </div>
      <p class="form-message" id="checkoutMessage" role="alert"></p>
      <button class="button button-primary button-full" type="submit">ثبت نهایی سفارش</button>
    </form>
  ` : `
    <div class="checkout-area"><p class="form-message">برای ثبت سفارش ابتدا وارد حساب کاربری شوید.</p><button class="button button-primary button-full" type="button" data-action="login-from-cart">ورود و ادامه خرید</button></div>
  `;

  target.innerHTML = `
    <div class="cart-list">${itemsHtml}</div>
    <div class="cart-total"><span>مبلغ قابل پرداخت</span><strong>${formatPrice(cart.total)}</strong></div>
    ${checkoutHtml}
  `;
}

async function changeCartQuantity(productId, delta) {
  const current = state.cart.items.find((item) => item.product.id === productId)?.quantity || 0;
  const next = Math.max(0, current + delta);
  if (state.user) {
    state.cart = await api(`/api/cart/items/${encodeURIComponent(productId)}`, {
      method: "PATCH", body: JSON.stringify({ quantity: next })
    });
  } else {
    const guest = getGuestCart();
    const product = state.allProducts.find((entry) => entry.id === productId);
    if (next > 0 && product && next > product.stock) throw new Error("تعداد انتخاب‌شده بیشتر از موجودی محصول است.");
    if (next === 0) delete guest[productId];
    else guest[productId] = next;
    saveGuestCart(guest);
    buildGuestCart();
  }
  renderCart();
}

async function removeCartItem(productId) {
  if (state.user) {
    state.cart = await api(`/api/cart/items/${encodeURIComponent(productId)}`, { method: "DELETE" });
  } else {
    const guest = getGuestCart();
    delete guest[productId];
    saveGuestCart(guest);
    buildGuestCart();
  }
  renderCart();
}

async function openOrders() {
  if (!state.user) return openDialog("authDialog");
  const result = await api("/api/orders");
  const target = $("#ordersContents");
  if (!result.orders.length) {
    target.innerHTML = '<div class="empty-state">هنوز سفارشی ثبت نکرده‌اید.</div>';
  } else {
    target.innerHTML = result.orders.map((order) => `
      <article class="order-card">
        <div class="order-card-head"><div><strong>سفارش ${escapeHtml(order.code)}</strong><br><small>${new Date(order.createdAt).toLocaleString("fa-IR")}</small></div><span class="status-pill ${order.status}">${statusLabel(order.status)}</span></div>
        <p>${order.items.map((item) => `${escapeHtml(item.name)} × ${new Intl.NumberFormat("fa-IR").format(item.quantity)}`).join("، ")}</p>
        <p><strong>مبلغ: ${formatPrice(order.total)}</strong> · ${order.paymentMethod === "cod" ? "پرداخت در محل" : "پرداخت آزمایشی"}</p>
      </article>
    `).join("");
  }
  closeDialog("userDialog");
  openDialog("ordersDialog");
}

async function openAdminPanel() {
  if (state.user?.role !== "admin") return showToast("دسترسی مدیر لازم است.", "error");
  const [summary, orders, productsResult] = await Promise.all([
    api("/api/admin/summary"), api("/api/admin/orders"), api("/api/products")
  ]);
  const statuses = ["confirmed", "processing", "shipped", "delivered", "cancelled"];
  $("#adminContents").innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat"><strong>${new Intl.NumberFormat("fa-IR").format(summary.totalProducts)}</strong><span>محصول</span></div>
      <div class="admin-stat"><strong>${new Intl.NumberFormat("fa-IR").format(summary.totalCustomers)}</strong><span>مشتری</span></div>
      <div class="admin-stat"><strong>${new Intl.NumberFormat("fa-IR").format(summary.totalOrders)}</strong><span>سفارش</span></div>
      <div class="admin-stat"><strong>${new Intl.NumberFormat("fa-IR").format(summary.revenue)}</strong><span>فروش (تومان)</span></div>
    </div>
    <h3 class="admin-section-title">افزودن محصول جدید</h3>
    <form id="adminProductForm" class="admin-product-form">
      <label class="form-field">نام محصول<input name="name" required minlength="2" maxlength="100"></label>
      <label class="form-field">دسته‌بندی<input name="category" required maxlength="40" placeholder="مثلاً لوازم جانبی"></label>
      <label class="form-field">قیمت (تومان)<input name="price" required type="number" min="1"></label>
      <label class="form-field">موجودی<input name="stock" required type="number" min="0"></label>
      <label class="form-field">ایموجی محصول<input name="emoji" maxlength="8" value="📦"></label>
      <label class="form-field span-two">توضیحات<input name="description" required maxlength="500"></label>
      <button class="button button-primary span-two" type="submit">ثبت محصول جدید</button>
    </form>
    <h3 class="admin-section-title">مدیریت سفارش‌ها</h3>
    ${orders.orders.length ? orders.orders.map((order) => `
      <div class="admin-order">
        <div><strong>${escapeHtml(order.code)}</strong><br><small>${escapeHtml(order.customerName)} · ${formatPrice(order.total)}</small></div>
        <select data-order-status="${escapeHtml(order.id)}" aria-label="تغییر وضعیت سفارش">
          ${statuses.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}
        </select>
      </div>
    `).join("") : '<div class="empty-state">هنوز سفارشی ثبت نشده است.</div>'}
    <h3 class="admin-section-title">محصولات فعلی</h3>
    ${productsResult.products.map((product) => `
      <div class="admin-order"><div><strong>${escapeHtml(product.emoji)} ${escapeHtml(product.name)}</strong><br><small>${formatPrice(product.price)} · موجودی ${new Intl.NumberFormat("fa-IR").format(product.stock)}</small></div><button class="remove-link" type="button" data-action="admin-delete-product" data-id="${escapeHtml(product.id)}">حذف محصول</button></div>
    `).join("")}
  `;
  closeDialog("userDialog");
  openDialog("adminDialog");
}

async function addProductToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  if (state.user) {
    state.cart = await api("/api/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity: 1 }) });
  } else {
    const guest = getGuestCart();
    const next = (guest[productId] || 0) + 1;
    if (next > product.stock) throw new Error("موجودی محصول برای این تعداد کافی نیست.");
    guest[productId] = next;
    saveGuestCart(guest);
    buildGuestCart();
  }
  updateCartBadge();
  showToast("محصول به سبد خرید اضافه شد.");
}

$("#accountButton").addEventListener("click", () => {
  setAuthMode("login");
  openDialog("authDialog");
});
$("#userMenuButton").addEventListener("click", () => openDialog("userDialog"));
$("#cartButton").addEventListener("click", () => { renderCart(); openDialog("cartDialog"); });
$("#myOrdersButton").addEventListener("click", openOrders);
$("#adminPanelButton").addEventListener("click", () => openAdminPanel().catch((error) => showToast(error.message, "error")));
$("#logoutButton").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
    state.user = null;
    state.cart = { items: [], itemCount: 0, total: 0 };
    updateAccountHeader();
    buildGuestCart();
    closeDialog("userDialog");
    showToast("با موفقیت از حساب خارج شدید.");
  } catch (error) { showToast(error.message, "error"); }
});

$$("[data-close]").forEach((button) => button.addEventListener("click", () => closeDialog(button.dataset.close)));
$$("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));

$("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const payload = Object.fromEntries(form.entries());
  const endpoint = state.authMode === "register" ? "/api/auth/register" : "/api/auth/login";
  $("#authSubmit").disabled = true;
  $("#authMessage").textContent = "";
  try {
    const result = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
    state.user = result.user;
    updateAccountHeader();
    await mergeGuestCart();
    closeDialog("authDialog");
    formElement.reset();
    showToast(state.authMode === "register" ? "حساب کاربری شما ساخته شد." : "با موفقیت وارد شدید.");
    if ($("#cartDialog").open) renderCart();
  } catch (error) {
    $("#authMessage").textContent = error.message;
  } finally {
    $("#authSubmit").disabled = false;
  }
});

$("#searchInput").addEventListener("input", () => {
  window.clearTimeout(window.__techmartSearchTimer);
  window.__techmartSearchTimer = window.setTimeout(() => loadProducts().catch((error) => showToast(error.message, "error")), 220);
});
$("#sortSelect").addEventListener("change", () => loadProducts().catch((error) => showToast(error.message, "error")));
$("#categoryList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.selectedCategory = button.dataset.category;
  loadProducts().catch((error) => showToast(error.message, "error"));
});

$("#cartContents").addEventListener("submit", async (event) => {
  if (event.target.id !== "checkoutForm") return;
  event.preventDefault();
  const form = new FormData(event.target);
  const payload = Object.fromEntries(form.entries());
  const submitButton = event.target.querySelector("button[type=submit]");
  submitButton.disabled = true;
  $("#checkoutMessage").textContent = "";
  try {
    const result = await api("/api/orders", { method: "POST", body: JSON.stringify(payload) });
    await loadCart();
    renderCart();
    await loadProducts();
    showToast(`سفارش ${result.order.code} با موفقیت ثبت شد.`);
    openOrders().catch(() => undefined);
  } catch (error) {
    const message = $("#checkoutMessage");
    if (message) message.textContent = error.message;
    else showToast(error.message, "error");
  } finally {
    if (submitButton.isConnected) submitButton.disabled = false;
  }
});

$("#adminContents").addEventListener("submit", async (event) => {
  if (event.target.id !== "adminProductForm") return;
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target).entries());
  payload.price = Number(payload.price);
  payload.stock = Number(payload.stock);
  try {
    await api("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
    showToast("محصول جدید ثبت شد.");
    await loadProducts();
    await openAdminPanel();
  } catch (error) { showToast(error.message, "error"); }
});

$("#adminContents").addEventListener("change", async (event) => {
  const select = event.target.closest("[data-order-status]");
  if (!select) return;
  try {
    await api(`/api/admin/orders/${encodeURIComponent(select.dataset.orderStatus)}/status`, {
      method: "PATCH", body: JSON.stringify({ status: select.value })
    });
    showToast("وضعیت سفارش به‌روزرسانی شد.");
  } catch (error) {
    showToast(error.message, "error");
    await openAdminPanel();
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === "add") await addProductToCart(id);
    if (action === "quantity") await changeCartQuantity(id, Number(button.dataset.delta));
    if (action === "remove") await removeCartItem(id);
    if (action === "login-from-cart") {
      setAuthMode("login");
      openDialog("authDialog");
    }
    if (action === "admin-delete-product") {
      if (!window.confirm("از حذف این محصول مطمئن هستید؟")) return;
      await api(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      showToast("محصول حذف شد.");
      await loadProducts();
      await openAdminPanel();
    }
  } catch (error) { showToast(error.message, "error"); }
});

async function initializeApp() {
  try {
    await loadProducts();
    await loadMe();
  } catch (error) {
    $("#productGrid").innerHTML = `<div class="empty-state">${escapeHtml(error.message)}<br>مطمئن شوید سرور پروژه اجرا شده است.</div>`;
  }
}

initializeApp();
