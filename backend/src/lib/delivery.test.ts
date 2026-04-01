import { describe, it, expect } from "vitest";
import { quoteDelivery } from "./delivery.js";
describe("quoteDelivery", () => {
    it("самовывоз бесплатно", () => {
        expect(quoteDelivery("PICKUP", 100)).toBe(0);
    });
    it("зона центра дешевле базы при том же весе", () => {
        const base = quoteDelivery("COURIER", 10, "DEFAULT");
        const center = quoteDelivery("COURIER", 10, "CENTER");
        expect(center).toBeLessThanOrEqual(base);
    });
});
