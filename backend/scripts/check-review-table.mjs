import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
    const n = await prisma.review.count();
    console.log("OK: таблица Review доступна, записей:", n);
}
catch (e) {
    console.error("Ошибка:", e.message);
    process.exit(1);
}
finally {
    await prisma.$disconnect();
}
