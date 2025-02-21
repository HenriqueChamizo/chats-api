import { Application } from "express";
import OpenAIService from "../services/openaiService";
import TwilioService from "../services/twilioService";
import { extractJson } from "../utils";
import ChatSession from "../models/ChatSession";
import ChatMessage from "../models/ChatMessage";
import SqsService from "../services/sqsService";

export default (app: Application) => {
  app.post("/call", async (req, res): Promise<any> => {
    try {
      const { topic, number, debug } = req.body;

      if (!topic || !number) {
        return res
          .status(400)
          .json({ error: "Tópico e número são obrigatórios!" });
      }

      const openaiService = new OpenAIService();

      const { sessionId } = await openaiService.createThreadAndRun(
        number,
        topic
      );

      console.log("⏳ Processando resposta...");
      await openaiService.checkRunStatus();
      console.log("✅ Resposta pronta!");

      const chatResponse = await openaiService.getLastResponse();
      console.log(`🤖 ChatGPT respondeu:`, chatResponse);

      const threadId = openaiService.getThreadId();
      const runId = openaiService.getRunId();

      const twilioService = new TwilioService(debug);
      const call = await twilioService.makeCall(
        number,
        `${process.env.MY_SERVER_URL}/twiml?number=${encodeURIComponent(
          number
        )}&initial=true`,
        sessionId
      );

      res.json({
        message: "Ligação iniciada!",
        callSid: call.sid,
        threadId,
        runId,
      });
    } catch (error: any) {
      console.error("Erro ao iniciar chat:", error);
      res.status(500).json({ error: "Erro ao iniciar a conversa" });
    }
  });

  app.post("/twiml", async (req, res) => {
    const number = req.query.number as string;
    const trying = req.query.trying as string;
    const initial = req.query.initial === "true";
    const {
      CallSid: callSid,
      CallStatus: callStatus,
      SpeechResult: userSpeech,
    } = req.body;

    let runId = req.query.runId as string | undefined;
    const twimlRedirectUrl = `${
      process.env.MY_SERVER_URL
    }/twiml?number=${encodeURIComponent(number)}`;

    console.log(`Tentativa GPT:`, trying);

    const chatSession = await ChatSession.findOne({ phoneNumber: number }).sort(
      { _id: -1 }
    );
    if (!chatSession) {
      console.error("🚨 Thread não encontrada para esse número!");
      res.status(400).json({ error: "Thread não encontrada!" });
      return;
    }

    const { threadId } = chatSession;

    try {
      const twilioService = new TwilioService();
      await twilioService.updateCallStatus(callSid, callStatus);

      if (initial) {
        const lastAssistantMessage = await ChatMessage.findOne({
          sessionId: chatSession._id,
          role: "assistant",
        }).sort({ _id: -1 });

        console.log(`📞 Conversa Iniciada: `, lastAssistantMessage?.content);
        if (lastAssistantMessage?.content) {
          res
            .type("text/xml")
            .send(
              twilioService.generateTwimlResponse(
                lastAssistantMessage.content,
                twimlRedirectUrl,
                { sayType: "gather" }
              )
            );
          return;
        }
      }

      const openaiService = new OpenAIService(threadId, runId);

      if (userSpeech && trying !== "1") {
        console.log(`📞 Usuário (${number}) disse:`, userSpeech);
        await openaiService.sendUserMessage(userSpeech);
      }

      if (!openaiService.getRunId()) {
        console.log("⏳ Processando resposta...");
        await openaiService.createRun();
      }

      console.log(`⏳ Analisando status (${trying})...`);
      const status = await openaiService.getRunStatus();

      if (status.status !== "completed") {
        const newTrying = parseInt(trying || "0") + 1;
        const url = `${twimlRedirectUrl}&trying=${newTrying}&runId=${openaiService.getRunId()}`;
        const sayText = newTrying === 1 ? "Aguarde um momento." : "";
        console.log("⏳ Ainda processando...", url);
        res.type("text/xml").send(
          twilioService.generateTwimlResponse(sayText, url, {
            sayType: "twiml",
          })
        );
        return;
      }

      const chatResponse = await openaiService.getLastResponse();
      console.log(`🤖 ChatGPT respondeu:`, chatResponse);

      const jsonExtracted = extractJson(chatResponse);

      res.type("text/xml").send(
        twilioService.generateTwimlResponse(
          jsonExtracted.cleanText,
          twimlRedirectUrl,
          {
            sayType: "gather",
            endCall: jsonExtracted.extracted,
          }
        )
      );

      if (jsonExtracted.extracted) {
        const sqs = new SqsService();
        await sqs.sendMessage({
          result: jsonExtracted.json,
          phoneNumber: number,
          threadId: openaiService.getThreadId(),
          runId: openaiService.getRunId(),
          sessionId: openaiService.getSessionId(),
        });
      }
      return;
    } catch (error) {
      console.error("Erro ao processar resposta do GPT:", error);
      res.status(500).json({ error: "Erro ao processar a resposta." });
    }
  });
};
