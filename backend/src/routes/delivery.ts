import { Router } from "express";
import { z } from "zod";
import { quoteDelivery } from "../lib/delivery.js";
const router = Router();
const querySchema = z.object({
    type: z.enum(["COURIER", "PICKUP"]),
    weightKg: z.coerce.number().min(0).default(0),
    zone: z.enum(["DEFAULT", "CENTER", "OUTSKIRTS"]).optional(),
});
router.get("/quote", (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { type, weightKg, zone } = parsed.data;
    const cost = quoteDelivery(type, weightKg, zone ?? "DEFAULT");
    res.json({
        deliveryType: type,
        weightKg,
        cost,
        currency: "RUB",
        note: "Ориентир по городу; итог фиксируется при оформлении заказа.",
    });
});
export default router;
