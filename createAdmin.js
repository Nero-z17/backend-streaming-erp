import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createAdmin() {
  try {
    const username = "Nepo"; 
    const plainPassword = "Neponepo"; 

    // Conversion forcée en string pour éviter l'erreur "must be a string"
    const passwordString = String(plainPassword); 
    const hashedPassword = await bcrypt.hash(passwordString, 10);

    const newAdmin = await prisma.admin.create({
      data: {
        username_admin: username,
        password_hash_admin: hashedPassword,
      },
    });

    console.log("✅ Admin créé avec succès :", newAdmin.username_admin);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur critique :", error);
    process.exit(1);
  }
}

createAdmin();