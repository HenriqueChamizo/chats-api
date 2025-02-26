import { Application } from "express";
import OpenAIService from "../services/openaiService";
import TwilioService from "../services/twilioService";
import { extractJson } from "../utils";
import ChatSession from "../models/ChatSession";
import SqsService from "../services/sqsService";
import AudioService from "../services/audioService";
import WhatsService from "../services/whatsService";

export default (app: Application) => {
  app.post("/whatsapp/send", async (req, res): Promise<any> => {
    try {
      const { topic, number, debug } = req.body;

      if (!topic || !number) {
        return res
          .status(400)
          .json({ error: "Tópico e número são obrigatórios!" });
      }

      const openaiService = new OpenAIService();

      await openaiService.createThreadAndRun(number, topic);

      console.log("⏳ Processando resposta...");
      await openaiService.checkRunStatus();
      console.log("✅ Resposta pronta!");

      const chatResponse = await openaiService.getLastResponse();
      console.log(`🤖 ChatGPT respondeu:`, chatResponse);

      const threadId = openaiService.getThreadId();
      const runId = openaiService.getRunId();

      const twilioService = new TwilioService(debug);
      const message = await twilioService.sendWhatsAppMessage(
        number,
        chatResponse
      );

      res.json({
        message: "Conversa Whatsapp iniciada!",
        callSid: message.sid,
        threadId,
        runId,
      });
    } catch (error: any) {
      console.error("Erro ao iniciar chat:", error);
      res.status(500).json({ error: "Erro ao iniciar a conversa" });
    }
  });

  app.post("/whatsapp/twiml", async (req, res) => {
    const {
      From,
      Body: message,
      MediaContentType0: mediaType,
      MediaUrl0: mediaUrl,
    } = req.body;
    const match = From.match(/whatsapp:(\+\d+)/);
    const number = match && match.length ? match[1] : From;

    console.log(`📲 Mensagem do WhatsApp de ${number}:`, message || mediaUrl);

    try {
      const whatsAppService = new WhatsService();
      const result = await whatsAppService.sendMessage(
        number,
        message,
        mediaType,
        mediaUrl
      );

      if (result.status === 400) {
        res.status(200).send("");
        return;
      }

      const openaiService = whatsAppService.getOpenAIService();
      const jsonExtracted = result.extractedData;
      if (jsonExtracted.extracted) {
        const sqs = new SqsService();
        await sqs.sendMessage({
          type: "whatsAppMessage",
          result: jsonExtracted.json,
          phoneNumber: number,
          threadId: openaiService.getThreadId(),
          runId: openaiService.getRunId(),
          sessionId: openaiService.getSessionId(),
        });
      }
      res.status(200).send("");
      return;
    } catch (error) {
      console.error("❌ Erro no processamento:", error);
      res.status(200).send("");
    }
  });

  app.post("/test/json", async (req, res) => {
    const { text } = req.body;
    const json = extractJson(text);
    res.json(json);
  });
};
