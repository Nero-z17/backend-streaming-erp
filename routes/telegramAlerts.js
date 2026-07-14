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

    // 1. Récupération des abonnements à relancer (< 7 jours)
    const expirations = await prisma.subscriptions.findMany({
      where: {
        end_date_subs: {
          gte: debutAujourdhui,
          lte: finJourneeLimite
        }
      },
      include: { client: true, profile: { include: { account: true } } }
    });

    // 2. NOUVEAU : Récupération des abonnements non renouvelés (Déjà terminés)
    const nonRenouveles = await prisma.subscriptions.findMany({
      where: {
        end_date_subs: {
          lt: debutAujourdhui
        },
        status_subs: "ACTIVE" // Évite de récupérer les vieux abonnements déjà passés en EXPIRED
      },
      include: { client: true, profile: { include: { account: true } } }
    });

    if (expirations.length === 0 && nonRenouveles.length === 0) {
      return res.json({ message: "Aucun abonnement à signaler." });
    }

    let texteTelegram = `🔥 *Nero-Erp - Alerte Abonnements* 🔥\n\n`;
    
    // -- BLOC 1 : Expirations proches --
    if (expirations.length > 0) {
      texteTelegram += `⏳ *Abonnements à relancer (< 7 jours) :*\n\n`;
      expirations.forEach((sub, index) => {
        const nomClient = sub.client.name_clt;
        const nomPlateforme = sub.profile.account.platform_acct;
        const emailCompte = sub.profile.account.email_acct;
        const nomProfil = sub.profile.name_profil;
        const dateFin = new Date(sub.end_date_subs).toLocaleDateString('fr-FR');
        
        const cleanNumber = sub.client.whatsapp_number_clt.replace(/\D/g, '');
        const messageWhatsApp = `Bonjour ${nomClient} 👋,\n\nNous vous informons que votre abonnement ${nomPlateforme} arrive à expiration le *${dateFin}*.\n\nAfin de continuer à profiter de nos services de streaming, nous vous invitons à procéder à son renouvellement dans les plus brefs délais.\n\nCordialement.`;
        const lienWhatsApp = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(messageWhatsApp)}`;

        texteTelegram += `${index + 1}️⃣ *${nomClient}*\n`;
        texteTelegram += `📺 Plateforme : _${nomPlateforme}_\n`;
        texteTelegram += `📧 Email : ${emailCompte}\n`;
        texteTelegram += `👤 Profil : ${nomProfil}\n`;
        texteTelegram += `📅 Expiration : ${dateFin}\n`;
        texteTelegram += `💬 Relancer : [Message WhatsApp](${lienWhatsApp})\n\n`;
      });
    }

    // -- BLOC 2 : Non renouvelés --
    if (nonRenouveles.length > 0) {
      texteTelegram += `❌ *NON RENOUVELÉS (Terminés) :*\n\n`;
      nonRenouveles.forEach((sub, index) => {
        const nomClient = sub.client.name_clt;
        const nomPlateforme = sub.profile.account.platform_acct;
        const emailCompte = sub.profile.account.email_acct;
        const nomProfil = sub.profile.name_profil;
        const dateFin = new Date(sub.end_date_subs).toLocaleDateString('fr-FR');

        texteTelegram += `🔴 *${nomClient}*\n`;
        texteTelegram += `📺 Plateforme : _${nomPlateforme}_\n`;
        texteTelegram += `📧 Email : ${emailCompte}\n`;
        texteTelegram += `👤 Profil : ${nomProfil}\n`;
        texteTelegram += `📅 Expiré depuis le : *${dateFin}*\n\n`;
      });
    }

    texteTelegram += `⚡ _Ouvre ton Nero-Erp pour la gestion complète._`;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    // 1. Découpage de sécurité si le message global dépasse 4000 caractères
    const MAX_LENGTH = 4000;
    let messagesToSend = [];
    if (texteTelegram.length > MAX_LENGTH) {
      for (let i = 0; i < texteTelegram.length; i += MAX_LENGTH) {
        messagesToSend.push(texteTelegram.substring(i, i + MAX_LENGTH));
      }
    } else {
      messagesToSend.push(texteTelegram);
    }

    // 2. Envoi des blocs avec gestion automatique des erreurs de syntaxe Markdown
    for (const msg of messagesToSend) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("❌ Erreur API Telegram détectée :", data);
        
        // Si Telegram rejette le message à cause du Markdown (ex: un "_" mal placé dans un email ou un nom)
        const isMarkdownError = data.description && (
          data.description.includes("parse") || 
          data.description.includes("can't find end") ||
          data.description.includes("character")
        );

        if (isMarkdownError) {
          console.log("🔄 Réessai d'envoi immédiat en texte brut pour contourner le bug de formatage...");
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg,
              disable_web_page_preview: true
              // On retire simplement 'parse_mode' pour envoyer le texte brut sans planter !
            })
          });
        }
      }
    }

    return res.json({ success: true, message: `Alerte envoyée (À relancer: ${expirations.length}, Expirés: ${nonRenouveles.length}) !` });

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
    
    // 1. On récupère TOUS les comptes
    const tousLesComptes = await prisma.accounts.findMany();

    // 2. NOUVEAU : On attache la VRAIE date de renouvellement dynamique à chaque compte
    const comptesAvecRenouvellement = tousLesComptes.map(acc => {
      const start = new Date(acc.start_date_acct);
      let nextRenewal = new Date(today.getFullYear(), today.getMonth(), start.getDate());
      
      if (nextRenewal < today) {
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);
      }
      return { ...acc, dynamicNextRenewal: nextRenewal };
    });

    // 3. On filtre en utilisant cette nouvelle date
    const comptesARenouveler = comptesAvecRenouvellement.filter(acc => {
      return acc.dynamicNextRenewal >= today && acc.dynamicNextRenewal <= dateLimite;
    });

    if (comptesARenouveler.length === 0) {
      return res.json({ message: "Aucun compte fournisseur à renouveler." });
    }

    let texteTelegram = `⚠️ *Nero-Erp - Renouvellement Comptes (< 7 jours)* ⚠️\n\n`;
    texteTelegram += `Salut Nero, voici les comptes à repayer chez tes fournisseurs :\n\n`;
    
    comptesARenouveler.forEach((acc, index) => {
      const plateforme = acc.platform_acct;
      const email = acc.email_acct;
      const visa = acc.visa_acct ? acc.visa_acct : "Non renseignée";
      const prix = acc.purchase_price_acct;
      
      // 4. CORRECTION : On affiche la date dynamique pour le mois en cours !
      const dateFin = acc.dynamicNextRenewal.toLocaleDateString('fr-FR');
      
      texteTelegram += `${index + 1}️⃣ *${plateforme}*\n`;
      texteTelegram += `📧 Email : ${email}\n`;
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