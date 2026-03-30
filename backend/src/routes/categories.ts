import { Router } from "express";
import { prisma } from "../db.js";
const router = Router();
router.get("/", async (_req, res) => {
    const list = await prisma.category.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { products: true } } },
    });
    res.json(list);
});
router.get("/tree", async (_req, res) => {
    const all = await prisma.category.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { products: true } } },
    });
    type Node = (typeof all)[0] & {
        children: Node[];
    };
    const map = new Map<string, Node>();
    for (const c of all) {
        map.set(c.id, { ...c, children: [] });
    }
    const roots: Node[] = [];
    for (const c of all) {
        const node = map.get(c.id)!;
        if (c.parentId) {
            const p = map.get(c.parentId);
            if (p)
                p.children.push(node);
            else
                roots.push(node);
        }
        else {
            roots.push(node);
        }
    }
    res.json(roots);
});
export default router;
