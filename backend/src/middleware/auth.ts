import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
export type AuthPayload = {
    sub: string;
    role: string;
};
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userRole?: string;
        }
    }
}
export function authRequired(req: Request, res: Response, next: NextFunction) {
    const h = req.headers.authorization;
    const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) {
        res.status(401).json({ error: "Требуется авторизация" });
        return;
    }
    try {
        const p = jwt.verify(token, config.jwtSecret) as AuthPayload;
        req.userId = p.sub;
        req.userRole = p.role;
        next();
    }
    catch {
        res.status(401).json({ error: "Недействительный токен" });
    }
}
export function adminRequired(req: Request, res: Response, next: NextFunction) {
    if (req.userRole !== "ADMIN" && req.userRole !== "MANAGER") {
        res.status(403).json({ error: "Недостаточно прав" });
        return;
    }
    next();
}
export function adminRoleOnly(req: Request, res: Response, next: NextFunction) {
    if (req.userRole !== "ADMIN") {
        res.status(403).json({ error: "Доступно только администратору" });
        return;
    }
    next();
}
export function optionalUser(req: Request, _res: Response, next: NextFunction) {
    const h = req.headers.authorization;
    const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) {
        next();
        return;
    }
    try {
        const p = jwt.verify(token, config.jwtSecret) as AuthPayload;
        req.userId = p.sub;
        req.userRole = p.role;
    }
    catch {
    }
    next();
}
