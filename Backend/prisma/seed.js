"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    const categories = [
        {
            id: 'focus',
            name: 'Deep Focus',
            slug: 'focus',
            coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80',
            gradient: 'from-[#4720ca] to-[#0b0b0f]',
        },
        {
            id: 'energy',
            name: 'Energy Boost',
            slug: 'energy',
            coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80',
            gradient: 'from-[#1ed760] to-[#0b0b0f]',
        },
        {
            id: 'chill',
            name: 'Chill Vibes',
            slug: 'chill',
            coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80',
            gradient: 'from-[#ff6584] to-[#0b0b0f]',
        },
        {
            id: 'melancholy',
            name: 'Midnight Melancholy',
            slug: 'melancholy',
            coverUrl: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=400&q=80',
            gradient: 'from-[#8cbeff] to-[#0b0b0f]',
        },
    ];
    console.log('Seeding categories...');
    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: cat,
            create: cat,
        });
    }
    console.log('Seeding test user...');
    const passwordHash = await bcrypt_1.default.hash('password123', 12);
    await prisma.user.upsert({
        where: { email: 'test@vibe.music' },
        update: {},
        create: {
            email: 'test@vibe.music',
            username: 'testuser',
            password: passwordHash,
            displayName: 'Test User',
            role: 'USER',
            isVerified: true,
            isActive: true,
        },
    });
    console.log('✅ Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map