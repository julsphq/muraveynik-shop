import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authRequired } from "../middleware/auth.js";
const router = Router();
router.get("/product/:productId", async (req, res) => {
    const product = await prisma.product.findUnique({
        where: { id: req.params.productId },
    });
    if (!product) {
        res.status(404).json({ error: "Товар не найден" });
        return;
    }
    const list = await prisma.review.findMany({
        where: { productId: product.id },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    const avg = list.length > 0
        ? list.reduce((s, r) => s + r.rating, 0) / list.length
        : null;
    res.json({
        items: list,
        count: list.length,
        averageRating: avg !== null ? Math.round(avg * 10) / 10 : null,
    });
});
const createSchema = z.object({
    productId: z.string(),
    rating: z.number().int().min(1).max(5),
    text: z.string().max(2000).optional().default(""),
});
router.post("/", authRequired, async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { productId, rating, text } = parsed.data;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        res.status(404).json({ error: "Товар не найден" });
        return;
    }
    try {
        const review = await prisma.review.create({
            data: {
                productId,
                userId: req.userId!,
                rating,
                text: text.trim(),
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });
        res.status(201).json(review);
    }
    catch {
        res.status(409).json({
            error: "Вы уже оставляли отзыв на этот товар. Редактирование пока недоступно.",
        });
    }
});
router.delete("/:id", authRequired, async (req, res) => {
    const review = await prisma.review.findUnique({
        where: { id: req.params.id },
    });
    if (!review) {
        res.status(404).json({ error: "Отзыв не найден" });
        return;
    }
    if (review.userId !== req.userId && req.userRole !== "ADMIN") {
        res.status(403).json({ error: "Нет прав" });
        return;
    }
    await prisma.review.delete({ where: { id: review.id } });
    res.status(204).send();
});
export default router;
