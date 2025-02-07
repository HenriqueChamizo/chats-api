import axios from "axios";
import { Application } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/User";
import authenticateJWT from "../middlewares/auth";

export default (app: Application) => {
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth/failure" }),
    (req: any, res) => {
      res.json({
        message: "Autenticado com sucesso",
        token: req.user.token, // Access token (1h)
        refreshToken: req.user.refreshToken, // Refresh token (14d)
        user: req.user.user,
      });
    }
  );

  app.post("/refresh-token", async (req, res): Promise<any> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res
        .status(401)
        .json({ message: "Token de atualização não fornecido" });
    }

    try {
      // Verificar se o refresh token é válido
      const decoded: any = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || ""
      );

      // Buscar usuário no banco e verificar o refresh token
      const user = await User.findOne({ _id: decoded.id });

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ message: "Refresh token inválido" });
      }

      // Gerar novos tokens
      const newAccessToken = jwt.sign(
        { id: user._id, name: user.name, email: user.email },
        process.env.JWT_SECRET || "",
        { expiresIn: "1h" }
      );

      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET || "",
        { expiresIn: "14d" }
      );

      // Substituir o refresh token antigo no banco
      user.refreshToken = newRefreshToken;
      await user.save();

      res.json({
        token: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      return res.status(403).json({ message: "Token inválido ou expirado" });
    }
  });

  // Rota de falha na autenticação
  app.get("/auth/failure", (req, res) => {
    res.send("Falha na autenticação");
  });

  app.post("/logout", authenticateJWT, async (req: any, res): Promise<any> => {
    try {
      const user = await User.findById(req.user.id);

      if (!user || !user.googleAccessToken) {
        return res
          .status(400)
          .json({ message: "Usuário não autenticado no Google" });
      }

      // Revogar o token de acesso
      const revokeAccessTokenUrl = `https://oauth2.googleapis.com/revoke?token=${user.googleAccessToken}`;
      await axios.post(revokeAccessTokenUrl);

      // Revogar o refresh token (se existir)
      if (user.googleRefreshToken) {
        const revokeRefreshTokenUrl = `https://oauth2.googleapis.com/revoke?token=${user.googleRefreshToken}`;
        await axios.post(revokeRefreshTokenUrl);
      }

      // Remover os tokens do banco
      await User.findByIdAndUpdate(user._id, {
        refreshToken: null,
        googleAccessToken: null,
        googleRefreshToken: null,
      });

      res.json({
        message: "Logout realizado com sucesso, sessão do Google encerrada",
      });
    } catch (err) {
      console.error("Erro ao revogar tokens do Google:", err);
      res.status(500).json({ message: "Erro ao realizar logout" });
    }
  });
};
