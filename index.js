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

app.get('/', (req, res) => {
  res.send('🚀 Serveur ERP Streaming en ligne !');
});


app.get('/api/alertes-telegram', async (req, res) => {
  const { secret } = req.query;
  
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ erreur: "Accès refusé : secret manquant ou incorrect." });
  }

  try {
    const debutAujourdhui = new Date();
    debutAujourdhui.setHours(0, 0, 0, 0);

    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 2);
    const finJourneeLimite = new Date(dateLimite.setHours(23, 59, 59, 999));

    const expirations = await prisma.subscriptions.findMany({
      where: {
        end_date_subs: {
          gte: debutAujourdhui,
          lte: finJourneeLimite
        }
      },
      include: {
        client: true, 
        profile: {    
          include: { account: true }
        }
      }
    });

    if (expirations.length === 0) {
      return res.json({ message: "Aucun abonnement ne se termine dans moins de 2 jours." });
    }

    // Changement du nom de l'application ici
    let texteTelegram = `🔥 *Nero-Erp - Alerte Expirations (< 2 jours)* 🔥\n\n`;
    texteTelegram += `Salut Nero, voici les abonnements à relancer :\n\n`;
    
    expirations.forEach((sub, index) => {
      // Extraction des nouvelles données depuis ton schéma Prisma
      const nomClient = sub.client.name_clt;
      const nomPlateforme = sub.profile.account.platform_acct;
      const emailCompte = sub.profile.account.email_acct;
      const nomProfil = sub.profile.name_profil;
      const dateFin = new Date(sub.end_date_subs).toLocaleDateString('fr-FR');
      
      // Nettoyage du numéro (garde uniquement les chiffres) pour le lien WhatsApp
      const cleanNumber = sub.client.whatsapp_number_clt.replace(/\D/g, '');
      const lienWhatsApp = `https://wa.me/${cleanNumber}`;

      // Construction du bloc d'information complet
      texteTelegram += `${index + 1}️⃣ *${nomClient}*\n`;
      texteTelegram += `📺 Plateforme : _${nomPlateforme}_\n`;
      texteTelegram += `📧 Email : ${emailCompte}\n`;
      texteTelegram += `👤 Profil : ${nomProfil}\n`;
      texteTelegram += `📅 Expiration : ${dateFin}\n`;
      texteTelegram += `💬 Relancer : ${lienWhatsApp}\n\n`;
    });

    texteTelegram += `⚡ _Ouvre ton Nero-Erp pour la gestion complète._`;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: texteTelegram,
        parse_mode: 'Markdown',
        disable_web_page_preview: true // Option très utile : empêche Telegram d'afficher un énorme aperçu du lien WhatsApp sous chaque message
      })
    });

    return res.json({ success: true, message: `Alerte envoyée pour ${expirations.length} client(s) !` });

  } catch (error) {
    console.error("Erreur lors de l'envoi Telegram :", error);
    return res.status(500).json({ erreur: "Problème interne du serveur" });
  }
});



// ---------------------------------------------------------
// LANCEMENT DU SERVEUR
// ---------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Serveur démarré sur http://localhost:${PORT}`);
});