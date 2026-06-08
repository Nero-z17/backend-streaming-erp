import express from 'express';
import prisma from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const clients = await prisma.clients.findMany({
      where: { id_admin: req.admin.id }, // Filtrage par admin
      orderBy: { created_date_clt: 'desc' }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des clients" });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.clients.findUnique({
      // CORRECTION : Plus de parseInt car c'est un UUID
      where: { id_clt: req.params.id }
    });
    if (!client) return res.status(404).json({ error: "Client introuvable" });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name_clt, whatsapp_number_clt, note_clt } = req.body;
    const newClient = await prisma.clients.create({
      data: { name_clt, whatsapp_number_clt, note_clt, id_admin: req.admin.id } // Tampon de l'admin
    });
    res.status(201).json(newClient);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création du client" });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name_clt, whatsapp_number_clt, note_clt } = req.body;
    const updatedClient = await prisma.clients.update({
      where: { id_clt: req.params.id }, 
      data: { name_clt, whatsapp_number_clt, note_clt }
    });
    res.json(updatedClient);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.clients.delete({ where: { id_clt: req.params.id } });
    res.json({ message: "Client supprimé" });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

export default router;