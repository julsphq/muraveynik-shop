import { Router } from "express";
import { z } from "zod";
import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { authRequired, adminRequired, adminRoleOnly } from "../middleware/auth.js";
import { notifyOrderStatusChange } from "../lib/notifications.js";
const router = Router();
router.use(authRequired);
router.use(adminRequired);
router.get("/stats", async (_req, res) => {
    const [users, products, orders, revenue] = await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.order.count(),
        prisma.order.aggregate({
            where: { status: "PAID" },
            _sum: { total: true },
        }),
    ]);
    res.json({
        users,
        products,
        orders,
        revenue: revenue._sum.total?.toString() ?? "0",
    });
});
router.get("/orders", async (_req, res) => {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 300,
        include: {
            user: { select: { email: true, name: true, phone: true } },
            items: { include: { product: true } },
            payments: true,
        },
    });
    res.json(orders);
});
const statusSchema = z.object({
    status: z.nativeEnum(OrderStatus),
});
router.patch("/orders/:id/status", async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    try {
        const order = await prisma.order.update({
            where: { id: req.params.id },
            data: { status: parsed.data.status },
            include: {
                items: { include: { product: true } },
                user: { select: { email: true } },
            },
        });
        await notifyOrderStatusChange(order.id, order.status);
        res.json(order);
    }
    catch {
        res.status(404).json({ error: "Заказ не найден" });
    }
});
const productSchema = z.object({
    slug: z.string().min(1),
    sku: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    price: z.number().positive(),
    stock: z.number().int().min(0),
    imageUrl: z.string().url().optional().or(z.literal("")),
    categoryId: z.string(),
    brand: z.string().optional(),
    material: z.string().optional(),
    sizeLabel: z.string().optional(),
    weightKg: z.number().positive().optional(),
    popularity: z.number().int().min(0).optional(),
    isNew: z.boolean().optional(),
    countryOrigin: z.string().optional(),
    applicationGuide: z.string().optional(),
});
router.get("/products", async (_req, res) => {
    const items = await prisma.product.findMany({
        orderBy: { name: "asc" },
        take: 500,
        include: { category: true },
    });
    res.json({ items });
});
router.delete("/products/:id", adminRoleOnly, async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch {
        res.status(404).json({ error: "Товар не найден" });
    }
});
router.post("/products", adminRoleOnly, async (req, res) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    try {
        const p = await prisma.product.create({
            data: {
                slug: d.slug,
                sku: d.sku,
                name: d.name,
                description: d.description,
                price: new Prisma.Decimal(d.price),
                stock: d.stock,
                imageUrl: d.imageUrl || null,
                categoryId: d.categoryId,
                brand: d.brand,
                material: d.material,
                sizeLabel: d.sizeLabel,
                weightKg: d.weightKg !== undefined
                    ? new Prisma.Decimal(d.weightKg)
                    : undefined,
                popularity: d.popularity,
                isNew: d.isNew,
                countryOrigin: d.countryOrigin,
                applicationGuide: d.applicationGuide,
            },
            include: { category: true },
        });
        res.status(201).json(p);
    }
    catch {
        res.status(409).json({ error: "SKU или slug уже заняты" });
    }
});
router.patch("/products/:id", adminRoleOnly, async (req, res) => {
    const partial = productSchema.partial();
    const parsed = partial.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    try {
        const p = await prisma.product.update({
            where: { id: req.params.id },
            data: {
                ...d,
                price: d.price !== undefined ? new Prisma.Decimal(d.price) : undefined,
                weightKg: d.weightKg !== undefined
                    ? new Prisma.Decimal(d.weightKg)
                    : undefined,
                imageUrl: d.imageUrl === "" ? null : d.imageUrl,
            },
            include: { category: true },
        });
        res.json(p);
    }
    catch {
        res.status(404).json({ error: "Товар не найден" });
    }
});
router.post("/products/import-csv", adminRoleOnly, async (req, res) => {
    const raw = typeof req.body === "string"
        ? req.body
        : typeof req.body?.csv === "string"
            ? req.body.csv
            : null;
    if (!raw || typeof raw !== "string") {
        res.status(400).json({
            error: "Тело запроса: текст CSV или JSON { \"csv\": \"...\" }",
        });
        return;
    }
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
        res.status(400).json({ error: "Нужна строка заголовка и хотя бы одна строка данных" });
        return;
    }
    const header = lines[0].split(";").map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const need = ["sku", "name", "price", "stock", "categoryslug"];
    for (const n of need) {
        if (idx(n) < 0) {
            res.status(400).json({
                error: `В заголовке не хватает колонки: ${n}`,
            });
            return;
        }
    }
    let created = 0;
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(";").map((c) => c.trim());
        const sku = cols[idx("sku")];
        const name = cols[idx("name")];
        const price = Number(cols[idx("price")]);
        const stock = parseInt(cols[idx("stock")], 10);
        const categorySlug = cols[idx("categoryslug")];
        const brand = idx("brand") >= 0 ? cols[idx("brand")] : undefined;
        if (!sku || !name || !Number.isFinite(price) || !Number.isFinite(stock) || !categorySlug) {
            errors.push(`Строка ${i + 1}: неверные данные`);
            continue;
        }
        const cat = await prisma.category.findUnique({
            where: { slug: categorySlug },
        });
        if (!cat) {
            errors.push(`Строка ${i + 1}: категория ${categorySlug} не найдена`);
            continue;
        }
        const slug = sku.toLowerCase().replace(/[^a-z0-9\-]+/gi, "-");
        try {
            await prisma.product.create({
                data: {
                    sku,
                    slug: `${slug}-${i}`,
                    name,
                    description: name,
                    price: new Prisma.Decimal(price.toFixed(2)),
                    stock,
                    categoryId: cat.id,
                    brand: brand || null,
                },
            });
            created++;
        }
        catch {
            errors.push(`Строка ${i + 1}: не удалось создать (возможно дубль SKU)`);
        }
    }
    res.json({ created, errors });
});
router.get("/questions", async (_req, res) => {
    const items = await prisma.productQuestion.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
            product: { select: { id: true, name: true, slug: true } },
            user: { select: { email: true, name: true } },
        },
    });
    res.json({ items });
});
const answerQuestionSchema = z.object({
    answer: z.string().min(1).max(4000),
});
router.patch("/questions/:id", async (req, res) => {
    const parsed = answerQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    try {
        const q = await prisma.productQuestion.update({
            where: { id: req.params.id },
            data: { answer: parsed.data.answer, answeredAt: new Date() },
            include: {
                product: { select: { id: true, name: true, slug: true } },
                user: { select: { email: true, name: true } },
            },
        });
        res.json(q);
    }
    catch {
        res.status(404).json({ error: "Вопрос не найден" });
    }
});
const bannerSchema = z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    linkHref: z.string().optional(),
    sortOrder: z.number().int().optional(),
    active: z.boolean().optional(),
});
router.get("/banners", adminRoleOnly, async (_req, res) => {
    const items = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({ items });
});
router.post("/banners", adminRoleOnly, async (req, res) => {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    const b = await prisma.banner.create({
        data: {
            title: d.title,
            subtitle: d.subtitle,
            imageUrl: d.imageUrl || null,
            linkHref: d.linkHref,
            sortOrder: d.sortOrder ?? 0,
            active: d.active ?? true,
        },
    });
    res.status(201).json(b);
});
router.patch("/banners/:id", adminRoleOnly, async (req, res) => {
    const parsed = bannerSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    try {
        const b = await prisma.banner.update({
            where: { id: req.params.id },
            data: {
                ...d,
                imageUrl: d.imageUrl === "" ? null : d.imageUrl,
            },
        });
        res.json(b);
    }
    catch {
        res.status(404).json({ error: "Баннер не найден" });
    }
});
router.delete("/banners/:id", adminRoleOnly, async (req, res) => {
    try {
        await prisma.banner.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch {
        res.status(404).json({ error: "Баннер не найден" });
    }
});
const blogPostSchema = z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    excerpt: z.string().min(1),
    body: z.string().min(1),
});
router.get("/blog/posts", adminRoleOnly, async (_req, res) => {
    const items = await prisma.blogPost.findMany({
        orderBy: { publishedAt: "desc" },
    });
    res.json({ items });
});
router.post("/blog/posts", adminRoleOnly, async (req, res) => {
    const parsed = blogPostSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    try {
        const p = await prisma.blogPost.create({ data: parsed.data });
        res.status(201).json(p);
    }
    catch {
        res.status(409).json({ error: "Slug уже занят" });
    }
});
router.patch("/blog/posts/:id", adminRoleOnly, async (req, res) => {
    const parsed = blogPostSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    try {
        const p = await prisma.blogPost.update({
            where: { id: req.params.id },
            data: parsed.data,
        });
        res.json(p);
    }
    catch {
        res.status(404).json({ error: "Статья не найдена" });
    }
});
router.delete("/blog/posts/:id", adminRoleOnly, async (req, res) => {
    try {
        await prisma.blogPost.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch {
        res.status(404).json({ error: "Статья не найдена" });
    }
});
router.get("/stats/export.csv", adminRoleOnly, async (_req, res) => {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 2000,
        include: { items: { include: { product: true } } },
    });
    const lines = [
        "id;date;status;total;email;items",
        ...orders.map((o) => {
            const email = o.guestEmail ?? o.userId ?? "";
            const items = o.items
                .map((i) => `${i.product.sku}x${i.quantity}`)
                .join("|");
            return [
                o.id,
                o.createdAt.toISOString(),
                o.status,
                o.total.toString(),
                email,
                `"${items.replace(/"/g, '""')}"`,
            ].join(";");
        }),
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="orders-export.csv"');
    res.send("\uFEFF" + lines.join("\n"));
});
export default router;
