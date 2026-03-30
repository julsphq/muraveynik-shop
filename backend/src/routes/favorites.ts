import { Router } from "express";
import { prisma } from "../db.js";
import { authRequired } from "../middleware/auth.js";
const router = Router();
router.use(authRequired);
router.get("/", async (req, res) => {
    const rows = await prisma.favorite.findMany({
        where: { userId: req.userId! },
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: "desc" },
    });
    res.json(rows.map((r) => r.product));
});
router.post("/:productId", async (req, res) => {
    const product = await prisma.product.findUnique({
        where: { id: req.params.productId },
    });
    if (!product) {
        res.status(404).json({ error: "Товар не найден" });
        return;
    }
    await prisma.favorite.upsert({
        where: {
            userId_productId: {
                userId: req.userId!,
                productId: product.id,
            },
        },
        create: { userId: req.userId!, productId: product.id },
        update: {},
    });
    res.status(201).json({ ok: true });
});
router.delete("/:productId", async (req, res) => {
    await prisma.favorite.deleteMany({
        where: { userId: req.userId!, productId: req.params.productId },
    });
    res.status(204).send();
});
export default router;
