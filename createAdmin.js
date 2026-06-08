import prisma from './db.js';
import bcrypt from 'bcryptjs';


async function main() {
  const password = "Neponepo"; // Ton mot de passe ici
  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.create({
    data: {
      username_admin: "nepo",
      password_hash_admin: hashedPassword
    }
  });
  console.log("Admin créé avec succès :", admin);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());