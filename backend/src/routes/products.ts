import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
const router = Router();
const listQuery = z.object({
    category: z.string().optional(),
    search: z.string().optional(),
    brand: z.string().optional(),
    material: z.string().optional(),
    sizeLabel: z.string().optional(),
    priceMin: z.coerce.number().optional(),
    priceMax: z.coerce.number().optional(),
    inStock: z.enum(["true", "false"]).optional(),
    isNew: z.enum(["true", "false"]).optional(),
    sort: z
        .enum(["name", "price_asc", "price_desc", "new", "popular"])
        .optional()
        .default("name"),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(12),
});
router.get("/", async (req, res) => {
    const q = listQuery.parse(req.query);
    const where: Prisma.ProductWhereInput = {};
    if (q.category) {
        where.category = { slug: q.category };
    }
    if (q.search) {
        where.OR = [
            { name: { contains: q.search, mode: "insensitive" } },
            { sku: { contains: q.search, mode: "insensitive" } },
            { description: { contains: q.search, mode: "insensitive" } },
            { brand: { contains: q.search, mode: "insensitive" } },
        ];
    }
    if (q.brand) {
        where.brand = { equals: q.brand, mode: "insensitive" };
    }
    if (q.material) {
        where.material = { contains: q.material, mode: "insensitive" };
    }
    if (q.sizeLabel) {
        where.sizeLabel = { contains: q.sizeLabel, mode: "insensitive" };
    }
    const priceCond: Prisma.Decimal[] = [];
    if (q.priceMin !== undefined)
        priceCond.push(new Prisma.Decimal(q.priceMin));
    if (q.priceMax !== undefined)
        priceCond.push(new Prisma.Decimal(q.priceMax));
    if (q.priceMin !== undefined || q.priceMax !== undefined) {
        where.price = {};
        if (q.priceMin !== undefined)
            where.price.gte = new Prisma.Decimal(q.priceMin);
        if (q.priceMax !== undefined)
            where.price.lte = new Prisma.Decimal(q.priceMax);
    }
    if (q.inStock === "true") {
        where.stock = { gt: 0 };
    }
    if (q.isNew === "true") {
        where.isNew = true;
    }
    let orderBy: Prisma.ProductOrderByWithRelationInput = { name: "asc" };
    switch (q.sort) {
        case "price_asc":
            orderBy = { price: "asc" };
            break;
        case "price_desc":
            orderBy = { price: "desc" };
            break;
        case "new":
            orderBy = { createdAt: "desc" };
            break;
        case "popular":
            orderBy = { popularity: "desc" };
            break;
        default:
            orderBy = { name: "asc" };
    }
    const [items, total] = await Promise.all([
        prisma.product.findMany({
            where,
            include: { category: true },
            skip: (q.page - 1) * q.limit,
            take: q.limit,
            orderBy,
        }),
        prisma.product.count({ where }),
    ]);
    res.json({
        items,
        page: q.page,
        limit: q.limit,
        total,
        pages: Math.ceil(total / q.limit) || 1,
    });
});
const byIdsSchema = z.object({
    ids: z.array(z.string()).min(1).max(80),
});
router.post("/by-ids/list", async (req, res) => {
    const parsed = byIdsSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const items = await prisma.product.findMany({
        where: { id: { in: parsed.data.ids } },
        include: { category: true },
    });
    res.json(items);
});
router.get("/:slug/related", async (req, res) => {
    const self = await prisma.product.findUnique({
        where: { slug: req.params.slug },
        select: { id: true, categoryId: true },
    });
    if (!self) {
        res.status(404).json({ error: "Товар не найден" });
        return;
    }
    const items = await prisma.product.findMany({
        where: {
            categoryId: self.categoryId,
            id: { not: self.id },
            stock: { gt: 0 },
        },
        take: 6,
        orderBy: [{ popularity: "desc" }, { name: "asc" }],
        include: { category: true },
    });
    res.json({ items });
});
router.get("/:slug", async (req, res) => {
    const product = await prisma.product.findUnique({
        where: { slug: req.params.slug },
        include: { category: true },
    });
    if (!product) {
        res.status(404).json({ error: "Товар не найден" });
        return;
    }
    res.json(product);
});
export default router;
