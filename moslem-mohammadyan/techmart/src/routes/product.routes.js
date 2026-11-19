import { Router } from "express";
import { readDatabase } from "../data/store.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const database = await readDatabase();
    const search = String(req.query.search || "").trim().toLocaleLowerCase("fa");
    const category = String(req.query.category || "").trim();
    const sort = String(req.query.sort || "featured");

    let products = database.products.filter((product) => product.stock >= 0);
    if (search) {
      products = products.filter((product) => `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase("fa").includes(search));
    }
    if (category && category !== "همه") products = products.filter((product) => product.category === category);

    if (sort === "price-asc") products.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") products.sort((a, b) => b.price - a.price);
    else if (sort === "name") products.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    else products.sort((a, b) => Number(b.featured) - Number(a.featured));

    res.json({ products, categories: ["همه", ...new Set(database.products.map((product) => product.category))] });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const database = await readDatabase();
    const product = database.products.find((item) => item.id === req.params.id);
    if (!product) return res.status(404).json({ error: "محصول پیدا نشد." });
    res.json({ product });
  } catch (error) {
    next(error);
  }
});

export default router;
