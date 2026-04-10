import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await prisma.user.upsert({
        where: { email: "admin@muraveynik.local" },
        update: {},
        create: {
            email: "admin@muraveynik.local",
            passwordHash,
            name: "Администратор",
            role: Role.ADMIN,
        },
    });
    const managerHash = await bcrypt.hash("manager123", 10);
    await prisma.user.upsert({
        where: { email: "manager@muraveynik.local" },
        update: {},
        create: {
            email: "manager@muraveynik.local",
            passwordHash: managerHash,
            name: "Менеджер заказов",
            role: Role.MANAGER,
        },
    });
    const catBuild = await prisma.category.upsert({
        where: { slug: "stroitelnye-materialy" },
        update: {},
        create: {
            slug: "stroitelnye-materialy",
            name: "Строительные материалы",
            description: "Цемент, сухие смеси, гипсокартон",
        },
    });
    const catInstrument = await prisma.category.upsert({
        where: { slug: "instrument" },
        update: {},
        create: {
            slug: "instrument",
            name: "Инструмент",
            description: "Ручной и электроинструмент",
        },
    });
    const catHand = await prisma.category.upsert({
        where: { slug: "ruchnoy-instrument" },
        update: {},
        create: {
            slug: "ruchnoy-instrument",
            name: "Ручной инструмент",
            description: "Ключи, отвёртки, измерительный инструмент",
            parentId: catInstrument.id,
        },
    });
    const catPaint = await prisma.category.upsert({
        where: { slug: "lkm" },
        update: {},
        create: {
            slug: "lkm",
            name: "Лакокрасочные материалы",
            description: "Краски, эмали, грунты",
        },
    });
    const catFloor = await prisma.category.upsert({
        where: { slug: "napolnye-pokrytiya" },
        update: {},
        create: {
            slug: "napolnye-pokrytiya",
            name: "Напольные покрытия",
            description: "Линолеум, ламинат, сопутствующие материалы",
        },
    });
    const demo = [
        {
            slug: "tsement-m500-50kg",
            sku: "SM-CEM-500-50",
            name: "Цемент М500, 50 кг",
            description: "Портландцемент для фундаментных и общестроительных работ. Хранить в сухом помещении.",
            price: 420,
            stock: 200,
            brand: "Балаково",
            material: "минеральный вяжущий",
            weightKg: 50,
            popularity: 80,
            isNew: false,
            categoryId: catBuild.id,
            countryOrigin: "Россия",
            applicationGuide: "Замешивать согласно норме воды на мешок. Не допускать замерзания раствора.",
        },
        {
            slug: "gkl-12-5-1200-2500",
            sku: "SM-GKL-12",
            name: "Гипсокартон 12,5 мм 1,2×2,5 м",
            description: "Лист для внутренних перегородок и облицовки. Ровная поверхность под шпаклёвку.",
            price: 680,
            stock: 120,
            brand: "Кнауф",
            material: "гипс, картон",
            weightKg: 29,
            popularity: 65,
            isNew: false,
            categoryId: catBuild.id,
            countryOrigin: "Германия",
            applicationGuide: "Крепление на каркас с шагом до 40 см. Швы зашпаклевать серпянкой.",
        },
        {
            slug: "klyuch-rogatyy-17",
            sku: "RI-KEY-17",
            name: "Ключ рожковый 17 мм",
            description: "Хромованадиевая сталь, двусторонний рожковый ключ.",
            price: 420,
            stock: 40,
            brand: "Зубр",
            material: "Cr-V сталь",
            weightKg: 0.2,
            popularity: 40,
            isNew: false,
            categoryId: catHand.id,
            countryOrigin: "Россия",
            applicationGuide: "Не использовать как рычаг сверх номинального момента.",
        },
        {
            slug: "kraska-vd-ak-9l",
            sku: "LK-KR-AK-9",
            name: "Краска водно-дисперсионная белая, 9 л",
            description: "Для стен и потолков в сухих помещениях. Без запаха после высыхания.",
            price: 2890,
            stock: 35,
            brand: "Dulux",
            material: "ВД-акрил",
            sizeLabel: "9 л",
            weightKg: 12,
            popularity: 55,
            isNew: true,
            categoryId: catPaint.id,
            countryOrigin: "Нидерланды",
            applicationGuide: "Грунтовать пористые основания. 2 слоя с интервалом 4–6 ч. Расход ~140 мл/м² за слой.",
        },
        {
            slug: "linoleum-2-5m-komfort",
            sku: "NP-LIN-25-30",
            name: "Линолеум бытовой 2,5 м, рулон 30 м",
            description: "Износостойкое покрытие для кухни и коридора. Тёплый рисунок под дерево.",
            price: 420,
            stock: 18,
            brand: "Tarkett",
            material: "ПВХ",
            sizeLabel: "ширина 2,5 м",
            weightKg: 45,
            popularity: 30,
            isNew: false,
            categoryId: catFloor.id,
            countryOrigin: "Россия",
            applicationGuide: "Основание ровное и сухое. Температура укладки +18…+25 °C. Клей по периметру и точечно.",
        },
    ];
    for (const p of demo) {
        await prisma.product.upsert({
            where: { sku: p.sku },
            update: {
                name: p.name,
                description: p.description,
                price: p.price,
                stock: p.stock,
                categoryId: p.categoryId,
                brand: p.brand,
                material: p.material,
                sizeLabel: p.sizeLabel ?? null,
                weightKg: p.weightKg,
                popularity: p.popularity,
                isNew: p.isNew,
                countryOrigin: p.countryOrigin,
                applicationGuide: p.applicationGuide,
            },
            create: {
                slug: p.slug,
                sku: p.sku,
                name: p.name,
                description: p.description,
                price: p.price,
                stock: p.stock,
                categoryId: p.categoryId,
                brand: p.brand,
                material: p.material,
                sizeLabel: p.sizeLabel ?? null,
                weightKg: p.weightKg,
                popularity: p.popularity,
                isNew: p.isNew,
                countryOrigin: p.countryOrigin,
                applicationGuide: p.applicationGuide,
            },
        });
    }
    await prisma.banner.deleteMany();
    await prisma.banner.createMany({
        data: [
            {
                title: "Доставка по городу",
                subtitle: "Курьер ИП «Муравейник» — от 350 ₽ + вес",
                sortOrder: 0,
                active: true,
                linkHref: "/catalog",
            },
            {
                title: "Новинки в каталоге",
                subtitle: "ЛКМ и напольные покрытия",
                sortOrder: 1,
                active: true,
                linkHref: "/catalog?sort=new",
            },
        ],
    });
    await prisma.blogPost.upsert({
        where: { slug: "kak-rasschitat-raskhod-kraski" },
        update: {},
        create: {
            slug: "kak-rasschitat-raskhod-kraski",
            title: "Как рассчитать расход краски",
            excerpt: "Ориентиры по м², запас на подложку и второй слой — для самостоятельного ремонта.",
            body: "Для ВД-краски типичный расход 120–160 мл/м² за слой на гладкую шпаклёвку. Добавьте 10–15% запаса на подложку и инструмент. На крупнозернистые обои и бетон расход выше — ориентируйтесь на данные с этикетки выбранной серии.",
        },
    });
    await prisma.blogPost.upsert({
        where: { slug: "ukladka-linoleuma-sovety" },
        update: {},
        create: {
            slug: "ukladka-linoleuma-sovety",
            title: "Укладка линолеума: краткие советы",
            excerpt: "Подготовка основания, акклиматизация и выбор клея.",
            body: "Основание должно быть ровным (перепад до 2 мм на 2 м), сухим и чистым. Рулон разогреть в комнате сутки. Для бытового линолеума часто достаточно холодной сварки и прикатки; в мокрых зонах — полный приклеивание по периметру и шпателем.",
        },
    });
    console.log("Seed OK");
    console.log("  admin@muraveynik.local / admin123");
    console.log("  manager@muraveynik.local / manager123");
}
main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
    console.error(e);
    process.exit(1);
});
