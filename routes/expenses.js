import express from 'express';
import prisma from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const expenses = await prisma.expenses.findMany({
      where: { id_admin: req.admin.id }, // Filtrage par admin
      orderBy: { date_exp: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: "Erreur récupération dépenses" });
  }
});

router.post('/', async (req, res) => {
  try {
    const { date_exp, category_exp, amount_exp, description_exp } = req.body;
    const newExpense = await prisma.expenses.create({
      data: { 
        date_exp: new Date(date_exp), 
        category_exp, 
        amount_exp: parseFloat(amount_exp), 
        description_exp,
        id_admin: req.admin.id // Tampon de l'admin
      }
    });
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ error: "Erreur ajout dépense" });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { date_exp, category_exp, amount_exp, description_exp } = req.body;
    const updatedExpense = await prisma.expenses.update({
      where: { id_exp: req.params.id }, 
      data: { date_exp: new Date(date_exp), category_exp, amount_exp: parseFloat(amount_exp), description_exp }
    });
    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ error: "Erreur modification dépense" });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.expenses.delete({ where: { id_exp: req.params.id } });
    res.json({ message: "Dépense supprimée" });
  } catch (error) {
    res.status(500).json({ error: "Erreur suppression dépense" });
  }
});

export default router;