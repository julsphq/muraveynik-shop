import { Router } from "express";
import { z } from "zod";
import { Prisma, type DeliveryType, type PaymentMethod, } from "@prisma/client";
import { prisma } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { quoteDelivery, type DeliveryZone } from "../lib/delivery.js";
const router = Router();
const lineSchema = z.object({
    productId: z.string(),
    quantity: z.number().int().min(1).max(999),
});
function defaultWeightKg(weight: Prisma.Decimal | null | undefined): number {
    if (weight === null || weight === undefined)
        return 1;
    const n = Number(weight);
    return Number.isFinite(n) && n > 0 ? n : 1;
}
async function totalsFromLines(lines: z.infer<typeof lineSchema>[], deliveryType: DeliveryType, zone: DeliveryZone = "DEFAULT") {
    const ids = [...new Set(lines.map((l) => l.productId))];
    const products = await prisma.product.findMany({
        where: { id: { in: ids } },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    let weightKg = 0;
    for (const line of lines) {
        const p = map.get(line.productId);
        if (!p)
            throw new Error(`Товар не найден`);
        if (p.stock < line.quantity) {
            throw new Error(`Недостаточно «${p.name}» на складе`);
        }
        subtotal += Number(p.price) * line.quantity;
        weightKg += defaultWeightKg(p.weightKg) * line.quantity;
    }
    const deliveryCost = quoteDelivery(deliveryType, weightKg, zone);
    return {
        subtotal,
        deliveryCost,
        total: subtotal + deliveryCost,
        weightKg,
        productMap: map,
    };
}
const guestSchema = z.object({
    items: z.array(lineSchema).min(1),
    guestEmail: z.string().email(),
    guestPhone: z.string().min(10),
    guestName: z.string().min(2),
    address: z.string().min(5),
    comment: z.string().optional(),
    deliveryType: z.enum(["COURIER", "PICKUP"]),
    paymentMethod: z.enum(["ONLINE", "CASH_ON_DELIVERY"]).default("ONLINE"),
    deliveryZone: z.enum(["DEFAULT", "CENTER", "OUTSKIRTS"]).optional(),
    isReservation: z.boolean().optional(),
});
router.post("/guest", async (req, res) => {
    const parsed = guestSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    const zone = d.deliveryZone ?? "DEFAULT";
    const resComment = d.comment && d.isReservation
        ? `${d.comment} · [Бронь без предоплаты]`
        : d.isReservation
            ? "[Бронь без предоплаты]"
            : d.comment;
    try {
        const { subtotal, deliveryCost, total, productMap } = await totalsFromLines(d.items, d.deliveryType, zone);
        const order = await prisma.$transaction(async (tx) => {
            const o = await tx.order.create({
                data: {
                    guestEmail: d.guestEmail,
                    guestPhone: d.guestPhone,
                    guestName: d.guestName,
                    address: d.address,
                    comment: resComment,
                    deliveryType: d.deliveryType,
                    paymentMethod: d.isReservation
                        ? "CASH_ON_DELIVERY"
                        : d.paymentMethod,
                    isReservation: d.isReservation ?? false,
                    deliveryZone: d.deliveryZone ?? null,
                    itemsSubtotal: new Prisma.Decimal(subtotal.toFixed(2)),
                    deliveryCost: new Prisma.Decimal(deliveryCost),
                    total: new Prisma.Decimal(total.toFixed(2)),
                    status: "NEW",
                    items: {
                        create: d.items.map((line) => {
                            const p = productMap.get(line.productId)!;
                            return {
                                productId: line.productId,
                                quantity: line.quantity,
                                price: p.price,
                            };
                        }),
                    },
                },
                include: { items: { include: { product: true } } },
            });
            for (const line of d.items) {
                await tx.product.update({
                    where: { id: line.productId },
                    data: { stock: { decrement: line.quantity } },
                });
            }
            return o;
        });
        await prisma.integrationLog.create({
            data: {
                source: "1c",
                direction: "out",
                status: "queued",
                payload: {
                    event: "order.created",
                    orderId: order.id,
                    guest: true,
                },
            },
        });
        res.status(201).json(order);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка оформления";
        res.status(400).json({ error: msg });
    }
});
const userCreateSchema = z.object({
    address: z.string().min(5),
    comment: z.string().optional(),
    deliveryType: z.enum(["COURIER", "PICKUP"]),
    paymentMethod: z.enum(["ONLINE", "CASH_ON_DELIVERY"]).default("ONLINE"),
    deliveryZone: z.enum(["DEFAULT", "CENTER", "OUTSKIRTS"]).optional(),
    isReservation: z.boolean().optional(),
});
router.use(authRequired);
router.post("/", async (req, res) => {
    const parsed = userCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    const zone = d.deliveryZone ?? "DEFAULT";
    const resComment = d.comment && d.isReservation
        ? `${d.comment} · [Бронь без предоплаты]`
        : d.isReservation
            ? "[Бронь без предоплаты]"
            : d.comment;
    const cartItems = await prisma.cartItem.findMany({
        where: { userId: req.userId! },
        include: { product: true },
    });
    if (cartItems.length === 0) {
        res.status(400).json({ error: "Корзина пуста" });
        return;
    }
    const lines = cartItems.map((c) => ({
        productId: c.productId,
        quantity: c.quantity,
    }));
    try {
        const { subtotal, deliveryCost, total, productMap } = await totalsFromLines(lines, d.deliveryType, zone);
        const order = await prisma.$transaction(async (tx) => {
            const o = await tx.order.create({
                data: {
                    userId: req.userId!,
                    address: d.address,
                    comment: resComment,
                    deliveryType: d.deliveryType,
                    paymentMethod: (d.isReservation
                        ? "CASH_ON_DELIVERY"
                        : d.paymentMethod) as PaymentMethod,
                    isReservation: d.isReservation ?? false,
                    deliveryZone: d.deliveryZone ?? null,
                    itemsSubtotal: new Prisma.Decimal(subtotal.toFixed(2)),
                    deliveryCost: new Prisma.Decimal(deliveryCost),
                    total: new Prisma.Decimal(total.toFixed(2)),
                    status: "NEW",
                    items: {
                        create: lines.map((line) => {
                            const p = productMap.get(line.productId)!;
                            return {
                                productId: line.productId,
                                quantity: line.quantity,
                                price: p.price,
                            };
                        }),
                    },
                },
                include: { items: { include: { product: true } } },
            });
            for (const line of lines) {
                await tx.product.update({
                    where: { id: line.productId },
                    data: { stock: { decrement: line.quantity } },
                });
            }
            await tx.cartItem.deleteMany({ where: { userId: req.userId! } });
            return o;
        });
        await prisma.integrationLog.create({
            data: {
                source: "1c",
                direction: "out",
                status: "queued",
                payload: { event: "order.created", orderId: order.id },
            },
        });
        res.status(201).json(order);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка оформления";
        res.status(400).json({ error: msg });
    }
});
router.get("/", async (req, res) => {
    const orders = await prisma.order.findMany({
        where: { userId: req.userId! },
        orderBy: { createdAt: "desc" },
        include: {
            items: { include: { product: true } },
            payments: true,
        },
    });
    res.json(orders);
});
router.post("/:id/repeat", async (req, res) => {
    const order = await prisma.order.findFirst({
        where: { id: req.params.id, userId: req.userId! },
        include: { items: true },
    });
    if (!order) {
        res.status(404).json({ error: "Заказ не найден" });
        return;
    }
    let linesAdded = 0;
    for (const line of order.items) {
        const product = await prisma.product.findUnique({
            where: { id: line.productId },
        });
        if (!product || product.stock < 1)
            continue;
        const qty = Math.min(line.quantity, product.stock);
        const existing = await prisma.cartItem.findUnique({
            where: {
                userId_productId: {
                    userId: req.userId!,
                    productId: line.productId,
                },
            },
        });
        if (existing) {
            const nextQty = Math.min(existing.quantity + qty, product.stock);
            await prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: nextQty },
            });
        }
        else {
            await prisma.cartItem.create({
                data: {
                    userId: req.userId!,
                    productId: line.productId,
                    quantity: qty,
                },
            });
        }
        linesAdded++;
    }
    if (linesAdded === 0) {
        res.status(400).json({
            error: "Не удалось добавить позиции: проверьте наличие на складе",
        });
        return;
    }
    res.json({
        ok: true,
        message: "Состав заказа добавлен в корзину (с учётом остатков)",
    });
});
router.get("/:id", async (req, res) => {
    const order = await prisma.order.findFirst({
        where: { id: req.params.id, userId: req.userId! },
        include: {
            items: { include: { product: true } },
            payments: true,
        },
    });
    if (!order) {
        res.status(404).json({ error: "Заказ не найден" });
        return;
    }
    res.json(order);
});
export default router;
