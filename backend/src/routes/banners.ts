import { Router } from "express";
import { prisma } from "../db.js";
const router = Router();
router.get("/", async (_req, res) => {
    const items = await prisma.banner.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
    });
    res.json({ items });
});
export default router;
