/**
 * Basic local-dev seed data: reference categories + one ready-to-use test
 * account. Not for load testing — see src/scripts/seedLoadTestData.ts
 * (npm run seed:loadtest) for that; this script is small, idempotent, and
 * safe to run against a real dev database.
 *
 * Previously this script inserted a `password` field directly and imported
 * `bcrypt` — both predate the Supabase Auth migration and no longer exist
 * on the User model or as a dependency. User creation now goes through
 * Supabase Auth (mirrors AuthService.signup), not a direct password hash.
 */
import { PrismaClient } from '@prisma/client';
import { supabase, supabaseAdmin } from '../src/config/supabase';

const prisma = new PrismaClient();

const TEST_USER = {
  email: 'test@vibe.music',
  username: 'vibe_seed_test_user',
  password: 'password123',
  displayName: 'Test User',
};

async function seedCategories() {
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
    await prisma.category.upsert({ where: { slug: cat.slug }, update: cat, create: cat });
  }
}

async function seedTestUser() {
  console.log('Seeding test user...');

  const existingByEmail = await prisma.user.findUnique({ where: { email: TEST_USER.email } });
  if (existingByEmail) {
    console.log(`Test user ${TEST_USER.email} already exists, skipping.`);
    return;
  }
  const existingByUsername = await prisma.user.findUnique({ where: { username: TEST_USER.username } });
  if (existingByUsername) {
    console.log(`A user with username "${TEST_USER.username}" already exists (different email) — skipping to avoid a conflict.`);
    return;
  }

  // Create (or reuse) the Supabase Auth account, then the linked public.User row —
  // same two-step flow as AuthService.signup.
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    email_confirm: true,
    user_metadata: { username: TEST_USER.username, displayName: TEST_USER.displayName, role: 'USER' },
  });

  // Note: Supabase's actual message is "...has already been registered" — a plain
  // `.includes('already registered')` (the same check AuthService.signup uses) never
  // matches it. Checking for 'already' + 'registered' separately instead.
  const alreadyRegistered =
    authError && authError.message.toLowerCase().includes('already') && authError.message.toLowerCase().includes('registered');
  if (authError && !alreadyRegistered) {
    throw new Error(`Failed to create Supabase Auth user: ${authError.message}`);
  }

  let supabaseUid = authData?.user?.id;
  if (!supabaseUid) {
    // Already registered in Supabase Auth from a previous run — look it up instead.
    const { data: signIn } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    supabaseUid = signIn?.user?.id;
  }
  if (!supabaseUid) {
    throw new Error('Could not resolve a Supabase Auth user id for the seeded test user.');
  }

  await prisma.user.create({
    data: {
      supabaseId: supabaseUid,
      email: TEST_USER.email,
      username: TEST_USER.username,
      displayName: TEST_USER.displayName,
      role: 'USER',
      isVerified: true,
      isActive: true,
    },
  });

  console.log(`Seeded test user: ${TEST_USER.email} / ${TEST_USER.password}`);
}

async function main() {
  console.log('🌱 Starting database seeding...');
  await seedCategories();
  await seedTestUser();
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
