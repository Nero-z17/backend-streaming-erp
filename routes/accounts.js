import express from 'express';
import prisma from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const accounts = await prisma.accounts.findMany({
      where: { id_admin: req.admin.id }, // Filtrage par admin
      include: { Profiles: true },
      orderBy: { renewal_date_acct: 'asc' }
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: "Erreur récupération des comptes" });
  }
});

router.post('/', async (req, res) => {
  try {
    const { platform_acct, email_acct, password_acct, purchase_price_acct, renewal_date_acct, status_acct, mdp_gmail_acct, visa_acct } = req.body;
    const newAccount = await prisma.accounts.create({
      data: {
        platform_acct, email_acct, password_acct,
        purchase_price_acct: parseFloat(purchase_price_acct),
        renewal_date_acct: new Date(renewal_date_acct),
        status_acct: status_acct || 'ACTIVE',
        mdp_gmail_acct: mdp_gmail_acct || null, 
        visa_acct: visa_acct || null,           
        id_admin: req.admin.id // Tampon de l'admin
      }
    });
    res.status(201).json(newAccount);
  } catch (error) {
    res.status(500).json({ error: "Erreur création du compte" });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { platform_acct, email_acct, password_acct, purchase_price_acct, renewal_date_acct, mdp_gmail_acct, visa_acct } = req.body;
    const updatedAccount = await prisma.accounts.update({
      where: { id_acct: req.params.id },
      data: { platform_acct, email_acct, password_acct, purchase_price_acct: parseFloat(purchase_price_acct), renewal_date_acct: new Date(renewal_date_acct), mdp_gmail_acct: mdp_gmail_acct || null, visa_acct: visa_acct || null}
    });
    res.json(updatedAccount);
  } catch (error) {
    res.status(500).json({ error: "Erreur modification" });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.accounts.delete({ where: { id_acct: req.params.id } });
    res.json({ message: "Compte supprimé" });
  } catch (error) {
    res.status(500).json({ error: "Erreur suppression" });
  }
});

// PROFILS (Laissés tels quels car ils dépendent du Account)
router.post('/:id/profiles', async (req, res) => {
  try {
    const newProfile = await prisma.profiles.create({
      data: { id_acct: req.params.id, name_profil: req.body.name_profil, pin_code_profil: req.body.pin_code_profil }
    });
    res.status(201).json(newProfile);
  } catch (error) {
    res.status(500).json({ error: "Erreur création profil" });
  }
});

router.get('/:id/profiles', async (req, res) => {
  try {
    const profiles = await prisma.profiles.findMany({ 
      where: { id_acct: req.params.id },
      include: {
        _count: {
          select: { Subscriptions: true }
        }
      }
    });
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: "Erreur récupération profils" });
  }
});


router.put('/profiles/:idProfil', async (req, res) => {
  try {
    const updatedProfile = await prisma.profiles.update({
      where: { id_profil: req.params.idProfil },
      data: { name_profil: req.body.name_profil, pin_code_profil: req.body.pin_code_profil }
    });
    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: "Erreur modification profil" });
  }
});

router.delete('/profiles/:idProfil', async (req, res) => {
  try {
    await prisma.profiles.delete({ where: { id_profil: req.params.idProfil } });
    res.json({ message: "Profil supprimé" });
  } catch (error) {
    res.status(500).json({ error: "Erreur suppression profil" });
  }
});

export default router;