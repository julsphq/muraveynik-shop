import type { DeliveryType } from "@prisma/client";
export type DeliveryZone = "DEFAULT" | "CENTER" | "OUTSKIRTS";
export function quoteDelivery(deliveryType: DeliveryType, totalWeightKg: number, zone: DeliveryZone = "DEFAULT"): number {
    if (deliveryType === "PICKUP")
        return 0;
    const base = 350;
    const perKg = 25;
    const raw = base + Math.max(0, totalWeightKg) * perKg;
    let factor = 1;
    if (zone === "CENTER")
        factor = 0.9;
    if (zone === "OUTSKIRTS")
        factor = 1.25;
    return Math.min(5000, Math.round(raw * factor));
}
export function defaultWeightPerUnitKg(): number {
    return 1;
}
