import { Application } from "express";
import authenticateJWT from "../middlewares/auth";

export default (app: Application) => {
  // Rota de perfil para verificar se o usuário está logado
  app.get("/profile", authenticateJWT, (req, res): any => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    res.json(req.user);
  });
};
