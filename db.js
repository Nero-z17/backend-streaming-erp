// db.js
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// 1. Configuration du pool de connexion PostgreSQL avec l'URL de Neon
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Création de l'adaptateur pour PostgreSQL
const adapter = new PrismaPg(pool);

// 3. Injection de l'adaptateur dans le client Prisma
const prisma = new PrismaClient({ adapter });

export default prisma;