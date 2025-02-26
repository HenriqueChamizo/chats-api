import ChatSession, { IChatSession } from "../models/ChatSession";
import AudioService from "./audioService";
import OpenAIService from "./openaiService";
import { extractJson } from "../utils";
import TwilioService from "./twilioService";

class WhatsService {
  openAIService: OpenAIService;

  constructor(threadId?: string, runId?: string) {
    this.openAIService = new OpenAIService(threadId, runId);
  }

  getOpenAIService(): OpenAIService {
    return this.openAIService;
  }

  setOpenAIService(openaiService: OpenAIService) {
    this.openAIService = openaiService;
  }

  private async send(number: string, userMessage: string, chatSession: any) {
    const isSessionActive = chatSession && !chatSession.endTime;
    let openaiService: OpenAIService;
    if (isSessionActive) {
      console.log(`🔄 Continuando conversa na Thread ${chatSession!.threadId}`);
      openaiService = new OpenAIService(chatSession!.threadId);
    } else {
      console.log(`🆕 Criando nova sessão para ${number}`);
      openaiService = new OpenAIService();
      await openaiService.createThreadWithHistory(number, userMessage);
      chatSession = await ChatSession.findOne({ phoneNumber: number }).sort({
        _id: -1,
      });
    }

    this.setOpenAIService(openaiService);

    if (!chatSession) {
      console.error("🚨 Thread não encontrada para esse número!");
      return { status: 400, error: "Thread não encontrada!" };
    }

    if (isSessionActive) await openaiService.sendUserMessage(userMessage);
    if (!openaiService.getRunId()) await openaiService.createRun();

    console.log("⏳ Processando resposta...");
    await openaiService.checkRunStatus();
    console.log("✅ Resposta pronta!");
    const chatResponse = await openaiService.getLastResponse();

    console.log(`🤖 ChatGPT respondeu:`, chatResponse);

    const extractedData = extractJson(chatResponse);
    if (extractedData.extracted) {
      await ChatSession.findByIdAndUpdate(chatSession._id, {
        endTime: new Date(),
      });
      console.log("✅ Sessão finalizada no banco de dados.");
    }

    if (extractedData.cleanText) {
      const twilioService = new TwilioService();
      await twilioService.sendWhatsAppMessage(number, extractedData.cleanText);
    }

    return { status: 200, extractedData };
  }

  async sendMessage(
    number: string,
    message: string,
    mediaType: string,
    mediaUrl: string
  ): Promise<any> {
    let chatSession = await ChatSession.findOne({
      phoneNumber: number,
    }).sort({ _id: -1 });

    let userMessage = message;

    if (mediaType && mediaType.startsWith("audio")) {
      const audioService = new AudioService();
      userMessage = await audioService.processAudio(mediaUrl);
    }
    return await this.send(number, userMessage, chatSession);
  }

  async callbackMessage(message: any, result?: any) {
    console.log(`📨 Mensagem de callback:`, message, result);

    const parseResult = result || "Erro no processamento";
    const userMessage =
      typeof parseResult !== "string" ? JSON.stringify(result) : result;

    const chatSession = await ChatSession.findById(message.sessionId);

    return await this.send(message.phoneNumber, userMessage, chatSession);
  }
}

export default WhatsService;
