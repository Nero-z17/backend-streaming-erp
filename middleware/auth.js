// middleware/auth.js
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  
  if (!token) return res.status(403).json({ error: "Accès refusé" });

  try {
    const verified = jwt.verify(token.split(" ")[1], "ton_secret_super_complique");
    req.admin = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token invalide" });
  }
};