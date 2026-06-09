import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config'; // Pour lire l'URL Neon depuis ton .env

// Connexion à Neon (Exactement comme dans ton db.js)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createAdmin() {
  try {
    console.log("⏳ Création de l'administrateur en cours...");

    // 1. Définis ici tes identifiants de connexion
    const username = "Nero"; 
    const plainPassword = "Neronero"; // Remplace par le mot de passe que tu veux taper sur ton tel

    // 2. Cryptage du mot de passe
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 3. Injection dans la base de données Cloud
    const newAdmin = await prisma.admin.create({
      data: {
        username_admin: username,
        password_hash_admin: hashedPassword,
      },
    });

    console.log(`✅ Succès ! L'admin "${newAdmin.username_admin}" est maintenant dans ta base Neon.`);
    console.log("📱 Tu peux maintenant te connecter depuis ton téléphone !");

  } catch (error) {
    console.error("❌ Erreur :", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();