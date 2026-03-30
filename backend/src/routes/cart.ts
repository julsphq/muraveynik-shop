import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authRequired } from "../middleware/auth.js";
const router = Router();
router.use(authRequired);
router.get("/", async (req, res) => {
    const items = await prisma.cartItem.findMany({
        where: { userId: req.userId! },
        include: { product: { include: { category: true } } },
    });
    const total = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
    res.json({ items, total: total.toFixed(2) });
});
const addSchema = z.object({
    productId: z.string(),
    quantity: z.number().int().min(1).max(999).default(1),
});
router.post("/", async (req, res) => {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { productId, quantity } = parsed.data;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        res.status(404).json({ error: "Товар не найден" });
        return;
    }
    if (product.stock < quantity) {
        res.status(400).json({ error: "Недостаточно товара на складе" });
        return;
    }
    const existing = await prisma.cartItem.findUnique({
        where: {
            userId_productId: { userId: req.userId!, productId },
        },
    });
    if (existing) {
        const nextQty = existing.quantity + quantity;
        if (product.stock < nextQty) {
            res.status(400).json({ error: "Недостаточно товара на складе" });
            return;
        }
        const updated = await prisma.cartItem.update({
            where: { id: existing.id },
            data: { quantity: nextQty },
            include: { product: { include: { category: true } } },
        });
        res.json(updated);
        return;
    }
    const created = await prisma.cartItem.create({
        data: {
            userId: req.userId!,
            productId,
            quantity,
        },
        include: { product: { include: { category: true } } },
    });
    res.status(201).json(created);
});
router.patch("/:id", async (req, res) => {
    const schema = z.object({ quantity: z.number().int().min(1).max(999) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const item = await prisma.cartItem.findFirst({
        where: { id: req.params.id, userId: req.userId! },
        include: { product: true },
    });
    if (!item) {
        res.status(404).json({ error: "Позиция не найдена" });
        return;
    }
    if (item.product.stock < parsed.data.quantity) {
        res.status(400).json({ error: "Недостаточно товара на складе" });
        return;
    }
    const updated = await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: parsed.data.quantity },
        include: { product: { include: { category: true } } },
    });
    res.json(updated);
});
router.delete("/:id", async (req, res) => {
    const item = await prisma.cartItem.findFirst({
        where: { id: req.params.id, userId: req.userId! },
    });
    if (!item) {
        res.status(404).json({ error: "Позиция не найдена" });
        return;
    }
    await prisma.cartItem.delete({ where: { id: item.id } });
    res.status(204).send();
});
router.delete("/", async (req, res) => {
    await prisma.cartItem.deleteMany({ where: { userId: req.userId! } });
    res.status(204).send();
});
export default router;
