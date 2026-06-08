import express from 'express';
import prisma from '../db.js';

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    let subFilter = { client: { id_admin: req.admin.id } }; // Filtre Admin appliqué par défaut
    let expFilter = { id_admin: req.admin.id }; // Filtre Admin appliqué par défaut

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1); 
      subFilter.start_date_subs = { gte: startDate, lt: endDate };
      expFilter.date_exp = { gte: startDate, lt: endDate };
    }

    const subs = await prisma.subscriptions.findMany({ where: subFilter });
    const totalRevenue = subs.reduce((acc, sub) => acc + sub.amount_paid_subs, 0);

    const expenses = await prisma.expenses.findMany({ where: expFilter });
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount_exp, 0);

    const netProfit = totalRevenue - totalExpenses;

    res.json({
      totalRevenue, totalExpenses, netProfit,
      activeClientsCount: subs.filter(s => s.status_subs === 'ACTIVE').length
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur Dashboard summary" });
  }
});

router.get('/monthly', async (req, res) => {
  try {
    // CORRECTION : On applique le filtre Admin sur les stats annuelles/mensuelles !
    const subs = await prisma.subscriptions.findMany({ where: { client: { id_admin: req.admin.id } } });
    const expenses = await prisma.expenses.findMany({ where: { id_admin: req.admin.id } });

    const monthlyData = {};

    subs.forEach(sub => {
      const date = new Date(sub.start_date_subs);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { name: monthKey, revenue: 0, expenses: 0, profit: 0 };
      monthlyData[monthKey].revenue += sub.amount_paid_subs;
    });

    expenses.forEach(exp => {
      const date = new Date(exp.date_exp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { name: monthKey, revenue: 0, expenses: 0, profit: 0 };
      monthlyData[monthKey].expenses += exp.amount_exp;
    });

    const evolutionArray = Object.values(monthlyData).map(month => {
      month.profit = month.revenue - month.expenses;
      return month;
    });

    evolutionArray.sort((a, b) => a.name.localeCompare(b.name));

    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const currentMonthStats = monthlyData[currentMonthKey] || { revenue: 0, expenses: 0, profit: 0 };

    res.json({ currentMonth: currentMonthStats, evolution: evolutionArray });
  } catch (error) {
    res.status(500).json({ error: "Erreur Dashboard mensuel" });
  }
});

export default router;