import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { authRequired } from "../middleware/auth.js";
const router = Router();
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    phone: z.string().optional(),
});
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});
router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { email, password, name, phone } = parsed.data;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
        res.status(409).json({ error: "Email уже зарегистрирован" });
        return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { email, passwordHash, name, phone },
    });
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: "7d" });
    res.status(201).json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
});
router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: "Неверный email или пароль" });
        return;
    }
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: "7d" });
    res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
});
router.get("/me", authRequired, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });
    if (!user) {
        res.status(404).json({ error: "Не найден" });
        return;
    }
    res.json(user);
});
export default router;
