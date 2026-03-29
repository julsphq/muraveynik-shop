import "dotenv/config";

const parsedPort = Number(process.env.PORT);
const parsedFallbackPort = Number(process.env.PORT_FALLBACK);

export const config = {
    port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 4000,
    fallbackPort: Number.isFinite(parsedFallbackPort) && parsedFallbackPort > 0
        ? parsedFallbackPort
        : 4001,
    jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    yookassaShopId: process.env.YOOKASSA_SHOP_ID || "",
    yookassaSecretKey: process.env.YOOKASSA_SECRET_KEY || "",
};
