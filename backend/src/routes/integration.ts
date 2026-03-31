import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authRequired, adminRequired } from "../middleware/auth.js";
const router = Router();
router.use(authRequired);
router.use(adminRequired);
router.post("/1c/import-stock", async (req, res) => {
    const schema = z.array(z.object({
        sku: z.string(),
        stock: z.number().int().min(0),
    }));
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    let updated = 0;
    for (const row of parsed.data) {
        const r = await prisma.product.updateMany({
            where: { sku: row.sku },
            data: { stock: row.stock },
        });
        updated += r.count;
    }
    await prisma.integrationLog.create({
        data: {
            source: "1c",
            direction: "in",
            status: "ok",
            payload: { rows: parsed.data.length, updated },
        },
    });
    res.json({ ok: true, updated });
});
router.get("/logs", async (_req, res) => {
    const logs = await prisma.integrationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
    });
    res.json(logs);
});
export default router;
