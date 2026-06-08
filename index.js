import express from 'express';
import cors from 'cors';
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


// ---------------------------------------------------------
// LANCEMENT DU SERVEUR
// ---------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Serveur démarré sur http://localhost:${PORT}`);
});