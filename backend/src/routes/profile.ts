import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authRequired } from "../middleware/auth.js";
const router = Router();
router.use(authRequired);
router.get("/me", async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            savedAddresses: { orderBy: { isDefault: "desc" } },
        },
    });
    if (!user) {
        res.status(404).json({ error: "Пользователь не найден" });
        return;
    }
    res.json(user);
});
const patchMeSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().min(10).optional().or(z.literal("")),
});
router.patch("/me", async (req, res) => {
    const parsed = patchMeSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    const user = await prisma.user.update({
        where: { id: req.userId! },
        data: {
            name: d.name,
            phone: d.phone === "" ? null : d.phone,
        },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            savedAddresses: { orderBy: { isDefault: "desc" } },
        },
    });
    res.json(user);
});
const addressSchema = z.object({
    label: z.string().min(1),
    address: z.string().min(5),
    isDefault: z.boolean().optional(),
});
router.post("/addresses", async (req, res) => {
    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const d = parsed.data;
    if (d.isDefault) {
        await prisma.savedAddress.updateMany({
            where: { userId: req.userId! },
            data: { isDefault: false },
        });
    }
    const row = await prisma.savedAddress.create({
        data: {
            userId: req.userId!,
            label: d.label,
            address: d.address,
            isDefault: d.isDefault ?? false,
        },
    });
    res.status(201).json(row);
});
router.patch("/addresses/:id", async (req, res) => {
    const parsed = addressSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const existing = await prisma.savedAddress.findFirst({
        where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
        res.status(404).json({ error: "Адрес не найден" });
        return;
    }
    const d = parsed.data;
    if (d.isDefault) {
        await prisma.savedAddress.updateMany({
            where: { userId: req.userId! },
            data: { isDefault: false },
        });
    }
    const row = await prisma.savedAddress.update({
        where: { id: existing.id },
        data: {
            label: d.label,
            address: d.address,
            isDefault: d.isDefault,
        },
    });
    res.json(row);
});
router.delete("/addresses/:id", async (req, res) => {
    const existing = await prisma.savedAddress.findFirst({
        where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
        res.status(404).json({ error: "Адрес не найден" });
        return;
    }
    await prisma.savedAddress.delete({ where: { id: existing.id } });
    res.status(204).send();
});
export default router;
