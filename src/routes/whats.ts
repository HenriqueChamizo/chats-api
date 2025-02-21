import { Application } from "express";
import OpenAIService from "../services/openaiService";
import TwilioService from "../services/twilioService";
import { extractJson } from "../utils";
import ChatSession from "../models/ChatSession";
import SqsService from "../services/sqsService";
import AudioService from "../services/audioService";

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
      let chatSession = await ChatSession.findOne({
        phoneNumber: number,
      }).sort({ _id: -1 });

      if (!chatSession) {
        console.error("🚨 Thread não encontrada para esse número!");
        res.status(400).json({ error: "Thread não encontrada!" });
        return;
      }

      let userMessage = message;

      if (mediaType && mediaType.startsWith("audio")) {
        const audioService = new AudioService();
        userMessage = await audioService.processAudio(mediaUrl);
      }

      const isSessionActive = chatSession && !chatSession.endTime;
      let openaiService: OpenAIService;
      if (isSessionActive) {
        console.log(
          `🔄 Continuando conversa na Thread ${chatSession.threadId}`
        );
        openaiService = new OpenAIService(chatSession.threadId);
      } else {
        console.log(`🆕 Criando nova sessão para ${number}`);
        openaiService = new OpenAIService();
        await openaiService.createThreadWithHistory(number, userMessage);
        chatSession = await ChatSession.findOne({ phoneNumber: number }).sort({
          _id: -1,
        });
      }

      if (!chatSession) {
        console.error("🚨 Thread não encontrada para esse número!");
        res.status(400).json({ error: "Thread não encontrada!" });
        return;
      }

      if (isSessionActive) await openaiService.sendUserMessage(userMessage);
      if (!openaiService.getRunId()) await openaiService.createRun();
      console.log("⏳ Processando resposta...");
      await openaiService.checkRunStatus();
      console.log("✅ Resposta pronta!");
      const chatResponse = await openaiService.getLastResponse();

      console.log(`🤖 ChatGPT respondeu:`, chatResponse);

      const jsonExtracted = extractJson(chatResponse);
      if (jsonExtracted.extracted) {
        await ChatSession.findByIdAndUpdate(chatSession._id, {
          endTime: new Date(),
        });
        console.log("✅ Sessão finalizada no banco de dados.");
      }

      const twilioService = new TwilioService();
      await twilioService.sendWhatsAppMessage(number, jsonExtracted.cleanText);

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
      res.sendStatus(200);
    } catch (error) {
      console.error("❌ Erro no processamento:", error);
      res.status(500).send("Erro no processamento.");
    }
  });
};
