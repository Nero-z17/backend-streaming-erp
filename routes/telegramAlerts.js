import express from 'express';
import prisma from '../db.js';
import cors from 'cors';

import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const router = express.Router();

router.get('/subscriptions', async (req, res) => {
  const { secret } = req.query;
  
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ erreur: "Accès refusé : secret manquant ou incorrect." });
  }

  try {
    const debutAujourdhui = new Date();
    debutAujourdhui.setHours(0, 0, 0, 0);

    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 7);
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
      return res.json({ message: "Aucun abonnement ne se termine dans moins de 7 jours." });
    }

    // Changement du nom de l'application ici
    let texteTelegram = `🔥 *Nero-Erp - Alerte Expirations (< 7 jours)* 🔥\n\n`;
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
      const messageWhatsApp = `Bonjour ${nomClient} 👋,\n\nNous vous informons que votre abonnement ${nomPlateforme} arrive à expiration le *${dateFin}*.\n\nAfin de continuer à profiter de nos services de streaming, nous vous invitons à procéder à son renouvellement dans les plus brefs délais.\n\nCordialement.`;
      const messageEncode = encodeURIComponent(messageWhatsApp);
      const lienWhatsApp = `https://wa.me/${cleanNumber}?text=${messageEncode}`;

      // Construction du bloc d'information complet
      texteTelegram += `${index + 1}️⃣ *${nomClient}*\n`;
      texteTelegram += `📺 Plateforme : _${nomPlateforme}_\n`;
      texteTelegram += `📧 Email : ${emailCompte}\n`;
      texteTelegram += `👤 Profil : ${nomProfil}\n`;
      texteTelegram += `📅 Expiration : ${dateFin}\n`;
      texteTelegram += `💬 Relancer : [Cliquer ici pour envoyer le message](${lienWhatsApp})\n\n`;
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


router.get('/accounts', async (req, res) => {
  const { secret } = req.query;
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ erreur: "Accès refusé." });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 7);
    
    // 1. On récupère TOUS les comptes sans filtre de date SQL
    const tousLesComptes = await prisma.accounts.findMany();

    // 2. On filtre intelligemment en Javascript avec notre nouvelle logique
    const comptesARenouveler = tousLesComptes.filter(acc => {
      const start = new Date(acc.start_date_acct);
      let nextRenewal = new Date(today.getFullYear(), today.getMonth(), start.getDate());
      
      if (nextRenewal < today) {
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);
      }
      // On garde si le prochain renouvellement est entre aujourd'hui et dans 7 jours
      return nextRenewal >= today && nextRenewal <= dateLimite;
    });

    if (comptesARenouveler.length === 0) {
      return res.json({ message: "Aucun compte fournisseur à renouveler." });
    }

    let texteTelegram = `⚠️ *Nero-Erp - Renouvellement Comptes (< 7 jours)* ⚠️\n\n`;
    texteTelegram += `Salut Nero, voici les comptes à repayer chez tes fournisseurs :\n\n`;
    
    comptesARenouveler.forEach((acc, index) => {
      const plateforme = acc.platform_acct;
      const email = acc.email_acct;
      // Affichage propre de la carte Visa
      const visa = acc.visa_acct ? acc.visa_acct : "Non renseignée";
      const prix = acc.purchase_price_acct;
      const dateFin = new Date(acc.renewal_date_acct).toLocaleDateString('fr-FR');
      
      texteTelegram += `${index + 1}️⃣ *${plateforme}*\n`;
      texteTelegram += `📧 Email : ${email}\n`;
      // L'utilisation des accents graves (\`) permet de copier la carte en un clic sur Telegram !
      texteTelegram += `💳 Carte Visa : \`${visa}\`\n`;
      texteTelegram += `💰 Prix à payer : ${prix} FCFA\n`;
      texteTelegram += `📅 Renouvellement : *${dateFin}*\n\n`;
    });

    texteTelegram += `⚡ _Vérifie tes cartes bancaires !_`;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: texteTelegram, parse_mode: 'Markdown' })
    });

    return res.json({ success: true, message: `Alerte comptes envoyée pour ${comptesARenouveler.length} compte(s) !` });

  } catch (error) {
    console.error("Erreur Telegram Comptes :", error);
    return res.status(500).json({ erreur: "Problème interne du serveur" });
  }
});

export default router;