import axios from "axios";
import { Application } from "express";
import ias from "../modules/ias";

export default (app: Application) => {
  app.post("/chat", async (req, res): Promise<any> => {
    try {
      const { message, chat } = req.body;

      if (!message) {
        return res.status(400).json({ error: "A mensagem é obrigatória!" });
      }

      if (!chat) {
        return res.status(400).json({ error: "Chat é obrigatório!" });
      }
      if (!ias[chat]) {
        return res.status(400).json({ error: "IA sem suporte!" });
      }

      console.log("Mensagem recebida:", chat, message);
      const response = await ias[chat](message);

      res.json(response);
    } catch (error: any) {
      console.error("Erro na API IA:", error.response?.data || error.message);
      res.status(500).json({ error: "Erro ao processar a solicitação" });
    }
  });
};
