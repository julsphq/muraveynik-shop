import { Router } from "express";
import { prisma } from "../db.js";
const router = Router();
router.get("/posts", async (_req, res) => {
    const items = await prisma.blogPost.findMany({
        orderBy: { publishedAt: "desc" },
        select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            publishedAt: true,
        },
    });
    res.json({ items });
});
router.get("/posts/:slug", async (req, res) => {
    const post = await prisma.blogPost.findUnique({
        where: { slug: req.params.slug },
    });
    if (!post) {
        res.status(404).json({ error: "Статья не найдена" });
        return;
    }
    res.json(post);
});
export default router;
