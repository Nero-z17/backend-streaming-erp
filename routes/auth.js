import express from 'express';
import prisma from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = "ton_secret_super_complique"; 

// POST : Créer un nouvel admin (À utiliser dans Thunder Client)
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newAdmin = await prisma.admin.create({
      data: { username_admin: username, password_hash_admin: hashedPassword }
    });
    res.status(201).json({ message: "Admin créé avec succès", admin: newAdmin.username_admin });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création de l'admin" });
  }
});

// POST : LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await prisma.admin.findUnique({ where: { username_admin: username } });
    if (!admin) return res.status(401).json({ error: "Identifiants invalides" });

    const isMatch = await bcrypt.compare(password, admin.password_hash_admin);
    if (!isMatch) return res.status(401).json({ error: "Identifiants invalides" });

    const token = jwt.sign({ id: admin.id_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: admin.username_admin });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET : VERIFY
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: "Aucun jeton fourni" });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.status(200).json({ valid: true, id_admin: decoded.id });
  } catch (error) {
    res.status(401).json({ error: "Session expirée ou jeton invalide" });
  }
});

export default router;