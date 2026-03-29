import "express-async-errors";
import express from "express";
import cors from "cors";
import type { Server } from "node:http";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import categoriesRoutes from "./routes/categories.js";
import productsRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import ordersRoutes from "./routes/orders.js";
import paymentsRoutes from "./routes/payments.js";
import adminRoutes from "./routes/admin.js";
import integrationRoutes from "./routes/integration.js";
import deliveryRoutes from "./routes/delivery.js";
import favoritesRoutes from "./routes/favorites.js";
import reviewsRoutes from "./routes/reviews.js";
import profileRoutes from "./routes/profile.js";
import questionsRoutes from "./routes/questions.js";
import bannersRoutes from "./routes/banners.js";
import blogRoutes from "./routes/blog.js";
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");
mkdirSync(uploadsDir, { recursive: true });

app.use(cors({
    origin: config.clientOrigin,
    credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDir));
app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "muraveynik-api" });
});
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/questions", questionsRoutes);
app.use("/api/banners", bannersRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/integration", integrationRoutes);
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
});
const startServer = (port: number, allowFallback: boolean): void => {
    const server: Server = app.listen(port, () => {
        console.log(`API: http://localhost:${port}`);
    });
    server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && allowFallback && config.fallbackPort !== port) {
            console.warn(`Порт ${port} занят, пробуем ${config.fallbackPort}`);
            startServer(config.fallbackPort, false);
            return;
        }
        throw err;
    });
};
startServer(config.port, true);
