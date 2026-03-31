import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authRequired } from "../middleware/auth.js";
const router = Router();
router.get("/product/:productId", async (req, res) => {
    const items = await prisma.productQuestion.findMany({
        where: { productId: req.params.productId },
        orderBy: { createdAt: "desc" },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
        take: 100,
    });
    res.json({ items });
});
const postSchema = z.object({
    productId: z.string(),
    text: z.string().min(3).max(2000),
});
router.post("/", authRequired, async (req, res) => {
    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const p = await prisma.product.findUnique({
        where: { id: parsed.data.productId },
    });
    if (!p) {
        res.status(404).json({ error: "Товар не найден" });
        return;
    }
    const q = await prisma.productQuestion.create({
        data: {
            productId: parsed.data.productId,
            userId: req.userId!,
            text: parsed.data.text,
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });
    res.status(201).json(q);
});
export default router;
