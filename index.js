import express from 'express';
import cors from 'cors';

import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// 1. Configuration du pool de connexion PostgreSQL avec l'URL du Cloud
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Création de l'adaptateur de pilote pour PostgreSQL
const adapter = new PrismaPg(pool);

// 3. Injection sécurisée de l'adaptateur dans le client Prisma
const prisma = new PrismaClient({ adapter });


import authRoutes from './routes/auth.js';
import { verifyToken } from './middleware/auth.js'; // Le garde du corps

// Importation de tes modules de routes
import clientsRoutes from './routes/clients.js';
import accountsRoutes from './routes/accounts.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import expensesRoutes from './routes/expenses.js';
import dashboardRoutes from './routes/dashboard.js';
import telegramAlertsRoutes from './routes/telegramAlerts.js';


const app = express();
app.use(cors());
app.use(express.json());

// 1. Route publique (Connexion)
app.use('/api/auth', authRoutes);

// 2. Routes protégées (Il faut être loggé pour y accéder)
// Si tu mets verifyToken ici, toutes les routes en dessous seront protégées
app.use('/api/clients', verifyToken, clientsRoutes);
app.use('/api/accounts', verifyToken, accountsRoutes);
app.use('/api/subscriptions', verifyToken, subscriptionsRoutes);
app.use('/api/expenses', verifyToken, expensesRoutes);
app.use('/api/dashboard', verifyToken, dashboardRoutes);
app.use('/api/alertes-telegram', telegramAlertsRoutes);

app.get('/', (req, res) => {
  res.send('🚀 Serveur ERP Streaming en ligne !');
});



// ---------------------------------------------------------
// LANCEMENT DU SERVEUR
// ---------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Serveur démarré sur http://localhost:${PORT}`);
});