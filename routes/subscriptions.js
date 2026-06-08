import express from 'express';
import prisma from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const subscriptions = await prisma.subscriptions.findMany({
      where: { client: { id_admin: req.admin.id } }, // CRUCIAL : Filtre via le client
      include: {
        client: true, 
        profile: { include: { account: true } }
      },
      orderBy: { end_date_subs: 'asc' }
    });

    const formattedSubscriptions = subscriptions.map(sub => ({
      ...sub,
      Clients: sub.client,
      Profiles: { ...sub.profile, Accounts: sub.profile?.account }
    }));

    res.json(formattedSubscriptions);
  } catch (error) {
    res.status(500).json({ error: "Erreur récupération abonnements" });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id_clt, id_profil, duration_months_subs, agreed_price_subs, amount_paid_subs, start_date_subs } = req.body;

    const startDate = start_date_subs ? new Date(start_date_subs) : new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + parseInt(duration_months_subs));

    let payment_status = 'PENDING';
    const reste_a_payer = parseFloat(agreed_price_subs) - parseFloat(amount_paid_subs);
    if (reste_a_payer <= 0) payment_status = 'PAID';
    else if (parseFloat(amount_paid_subs) > 0) payment_status = 'PARTIAL';

    const newSub = await prisma.subscriptions.create({
      data: {
        id_clt, id_profil, duration_months_subs: parseInt(duration_months_subs),
        agreed_price_subs: parseFloat(agreed_price_subs), amount_paid_subs: parseFloat(amount_paid_subs),
        payment_status_subs: payment_status, start_date_subs: startDate, end_date_subs: endDate, status_subs: 'ACTIVE'
      }
    });
    res.status(201).json(newSub);
  } catch (error) {
    res.status(500).json({ error: "Erreur attribution abonnement" });
  }
});

router.put('/:id/payment', async (req, res) => {
  try {
    const { added_amount } = req.body;
    const subId = req.params.id;
    
    const sub = await prisma.subscriptions.findUnique({ where: { id_subs: subId } });
    if (!sub) return res.status(404).json({ error: "Abonnement introuvable" });

    const totalPaid = parseFloat(sub.amount_paid_subs) + parseFloat(added_amount);
    let newStatus = 'PENDING';
    const reste_a_payer = parseFloat(sub.agreed_price_subs) - totalPaid;
    if (reste_a_payer <= 0) newStatus = 'PAID';
    else if (totalPaid > 0) newStatus = 'PARTIAL';

    const updatedSub = await prisma.subscriptions.update({
      where: { id_subs: subId },
      data: { amount_paid_subs: totalPaid, payment_status_subs: newStatus }
    });
    res.json(updatedSub);
  } catch (error) {
    res.status(500).json({ error: "Erreur paiement" });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { duration_months_subs, agreed_price_subs, amount_paid_subs, start_date_subs } = req.body;
    const startDate = new Date(start_date_subs);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + parseInt(duration_months_subs));

    let payment_status = 'PENDING';
    const reste_a_payer = parseFloat(agreed_price_subs) - parseFloat(amount_paid_subs);
    if (reste_a_payer <= 0) payment_status = 'PAID';
    else if (parseFloat(amount_paid_subs) > 0) payment_status = 'PARTIAL';

    const updatedSub = await prisma.subscriptions.update({
      where: { id_subs: req.params.id },
      data: {
        duration_months_subs: parseInt(duration_months_subs), agreed_price_subs: parseFloat(agreed_price_subs),
        amount_paid_subs: parseFloat(amount_paid_subs), payment_status_subs: payment_status,
        start_date_subs: startDate, end_date_subs: endDate
      }
    });
    res.json(updatedSub);
  } catch (error) {
    res.status(500).json({ error: "Erreur modification" });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.subscriptions.delete({ where: { id_subs: req.params.id } });
    res.json({ message: "Abonnement supprimé" });
  } catch (error) {
    res.status(500).json({ error: "Erreur suppression abonnement" });
  }
});

export default router;