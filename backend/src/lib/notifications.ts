import { prisma } from "../db.js";
import type { OrderStatus } from "@prisma/client";
import { publishIntegrationEvent } from "./queue.js";
const statusRu: Record<OrderStatus, string> = {
    NEW: "принят",
    PAID: "оплачен",
    PROCESSING: "собирается",
    SHIPPED: "передан в доставку",
    DELIVERED: "доставлен",
    CANCELLED: "отменён",
};
export async function notifyOrderStatusChange(orderId: string, status: OrderStatus) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { select: { email: true } } },
    });
    const email = order?.guestEmail ?? order?.user?.email ?? null;
    const phone = order?.guestPhone ?? null;
    const text = `Заказ ${orderId}: статус «${statusRu[status]}»`;
    await prisma.integrationLog.create({
        data: {
            source: "notifications",
            direction: "out",
            status: "queued",
            payload: {
                channels: ["email", "sms"],
                email,
                phone,
                body: text,
                orderId,
                status,
            },
        },
    });
    await publishIntegrationEvent("notification.order_status", {
        orderId,
        status,
        email,
        phone,
        text,
    });
}
