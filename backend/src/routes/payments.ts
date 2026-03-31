import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import type { AuthPayload } from "../middleware/auth.js";
import { notifyOrderStatusChange } from "../lib/notifications.js";

const router = Router();

function ykAuth() {
    return "Basic " + Buffer.from(`${config.yookassaShopId}:${config.yookassaSecretKey}`).toString("base64");
}

async function verifyOrderAccess(
    req: import("express").Request,
    order: { userId: string | null; guestEmail: string | null },
    guestEmail?: string,
): Promise<string | null> {
    if (order.userId) {
        const h = req.headers.authorization;
        const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
        if (!token) return "Требуется авторизация";
        try {
            const p = jwt.verify(token, config.jwtSecret) as AuthPayload;
            if (p.sub !== order.userId) return "Нет доступа к заказу";
        } catch {
            return "Недействительный токен";
        }
    } else {
        if (!guestEmail || order.guestEmail !== guestEmail)
            return "Укажите e-mail, указанный при заказе";
    }
    return null;
}

const createSchema = z.object({
    orderId: z.string(),
    guestEmail: z.string().email().optional(),
});

router.post("/yookassa/create", async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { orderId, guestEmail } = parsed.data;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) { res.status(404).json({ error: "Заказ не найден" }); return; }

    const accessErr = await verifyOrderAccess(req, order, guestEmail);
    if (accessErr) { res.status(401).json({ error: accessErr }); return; }

    if (order.paymentMethod === "CASH_ON_DELIVERY") {
        res.status(400).json({ error: "Выбрана оплата при получении" });
        return;
    }
    if (order.status !== "NEW") {
        res.status(400).json({ error: "Заказ уже оплачен или недоступен" });
        return;
    }

    // Демо-режим, если нет ключей
    if (!config.yookassaShopId || !config.yookassaSecretKey) {
        const externalId = `demo_${order.id}_${Date.now()}`;
        await prisma.payment.create({
            data: { orderId: order.id, provider: "yookassa", externalId, amount: order.total, status: "succeeded" },
        });
        const paid = await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
        await notifyOrderStatusChange(paid.id, "PAID");
        res.json({ demo: true, ok: true, message: "Демо-оплата прошла успешно (без реального списания)" });
        return;
    }

    const returnUrl = `${config.clientOrigin}/payment/return?orderId=${order.id}`;
    const idempotencyKey = `${order.id}-create`;

    const ykRes = await fetch("https://api.yookassa.ru/v3/payments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotence-Key": idempotencyKey,
            "Authorization": ykAuth(),
        },
        body: JSON.stringify({
            amount: { value: Number(order.total).toFixed(2), currency: "RUB" },
            capture: true,
            confirmation: { type: "redirect", return_url: returnUrl },
            description: `Заказ ${order.id.slice(0, 8).toUpperCase()}`,
            metadata: { orderId: order.id },
        }),
    });

    if (!ykRes.ok) {
        const detail = await ykRes.json().catch(() => ({}));
        res.status(502).json({ error: "ЮКасса: ошибка создания платежа", detail });
        return;
    }

    const yk = await ykRes.json() as {
        id: string;
        status: string;
        confirmation?: { confirmation_url: string };
    };

    await prisma.payment.create({
        data: { orderId: order.id, provider: "yookassa", externalId: yk.id, amount: order.total, status: yk.status },
    });

    res.json({
        paymentId: yk.id,
        confirmationUrl: yk.confirmation?.confirmation_url,
        status: yk.status,
    });
});

// Уведы от Юкассы
router.post("/yookassa/webhook", async (req, res) => {
    const event = req.body as { event?: string; object?: { id?: string } };
    if (!event?.object?.id) { res.status(200).json({ ok: true }); return; }

    const externalId = event.object.id;
    const eventType = event.event;

    const payment = await prisma.payment.findFirst({ where: { externalId } });
    if (!payment) { res.status(200).json({ ok: true }); return; }

    if (eventType === "payment.succeeded") {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "succeeded" } });
        const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
        if (order?.status === "NEW") {
            const updated = await prisma.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
            await notifyOrderStatusChange(updated.id, "PAID");
        }
    } else if (eventType === "payment.canceled") {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "canceled" } });
    }

    res.status(200).json({ ok: true });
});

// Статус оплаты
router.get("/yookassa/status/:orderId", async (req, res) => {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!order) { res.status(404).json({ error: "Заказ не найден" }); return; }

    const payment = order.payments[0] ?? null;

    // Если ключи есть и платёж ещё pending актуализируем статус от ЮКассы
    if (config.yookassaShopId && config.yookassaSecretKey && payment?.status === "pending") {
        try {
            const ykRes = await fetch(`https://api.yookassa.ru/v3/payments/${payment.externalId}`, {
                headers: { "Authorization": ykAuth() },
            });
            if (ykRes.ok) {
                const yk = await ykRes.json() as { status: string };
                if (yk.status !== payment.status) {
                    await prisma.payment.update({ where: { id: payment.id }, data: { status: yk.status } });
                    if (yk.status === "succeeded" && order.status === "NEW") {
                        const updated = await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
                        await notifyOrderStatusChange(updated.id, "PAID");
                    }
                }
            }
        } catch { /* не мешаем возврату данных из БД */ }
    }

    const fresh = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true, total: true },
    });

    res.json({
        orderId,
        orderStatus: fresh?.status ?? order.status,
        paymentStatus: payment?.status ?? null,
        total: fresh?.total ?? order.total,
        demo: !config.yookassaShopId,
    });
});

router.post("/yookassa/demo", async (req, res) => {
    const schema = z.object({
        orderId: z.string(),
        guestEmail: z.string().email().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const { orderId, guestEmail } = parsed.data;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) { res.status(404).json({ error: "Заказ не найден" }); return; }

    const accessErr = await verifyOrderAccess(req, order, guestEmail);
    if (accessErr) { res.status(401).json({ error: accessErr }); return; }

    if (order.paymentMethod === "CASH_ON_DELIVERY") {
        res.status(400).json({ error: "Выбрана оплата при получении" }); return;
    }
    if (order.status !== "NEW") {
        res.status(400).json({ error: "Заказ уже оплачен или недоступен" }); return;
    }

    const externalId = `demo_${order.id}_${Date.now()}`;
    await prisma.payment.create({
        data: { orderId: order.id, provider: "yookassa", externalId, amount: order.total, status: "succeeded" },
    });
    const paid = await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
    await notifyOrderStatusChange(paid.id, "PAID");

    res.json({ ok: true, message: "Демо-оплата прошла успешно (без реального списания)", paymentId: externalId });
});

export default router;
