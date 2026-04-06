import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import type { AuthPayload } from "../middleware/auth.js";
import { notifyOrderStatusChange } from "../lib/notifications.js";
const router = Router();
router.post("/yookassa/demo", async (req, res) => {
    const schema = z.object({
        orderId: z.string(),
        guestEmail: z.string().email().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { orderId, guestEmail } = parsed.data;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
        res.status(404).json({ error: "Заказ не найден" });
        return;
    }
    if (order.userId) {
        const h = req.headers.authorization;
        const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
        if (!token) {
            res.status(401).json({ error: "Требуется авторизация" });
            return;
        }
        try {
            const p = jwt.verify(token, config.jwtSecret) as AuthPayload;
            if (p.sub !== order.userId) {
                res.status(403).json({ error: "Нет доступа к заказу" });
                return;
            }
        }
        catch {
            res.status(401).json({ error: "Недействительный токен" });
            return;
        }
    }
    else {
        if (!guestEmail || order.guestEmail !== guestEmail) {
            res.status(403).json({ error: "Укажите e-mail, указанный при заказе" });
            return;
        }
    }
    if (order.paymentMethod === "CASH_ON_DELIVERY") {
        res.status(400).json({
            error: "Выбрана оплата при получении — онлайн-оплата не требуется",
        });
        return;
    }
    if (order.status !== "NEW") {
        res.status(400).json({ error: "Заказ уже оплачен или недоступен" });
        return;
    }
    const externalId = `demo_${order.id}_${Date.now()}`;
    await prisma.payment.create({
        data: {
            orderId: order.id,
            provider: "yookassa",
            externalId,
            amount: order.total,
            status: "succeeded",
        },
    });
    const paid = await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
    });
    await notifyOrderStatusChange(paid.id, "PAID");
    await prisma.integrationLog.create({
        data: {
            source: "yookassa",
            direction: "in",
            status: "ok",
            payload: { orderId: order.id, externalId, demo: true },
        },
    });
    res.json({
        ok: true,
        message: "Демо-оплата прошла успешно (без реального списания)",
        paymentId: externalId,
    });
});
export default router;
