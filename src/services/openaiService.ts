import OpenAI from "openai";
import { TextContentBlock } from "openai/resources/beta/threads/messages";
import ChatSession from "../models/ChatSession";
import ChatMessage from "../models/ChatMessage";

class OpenAIService {
  private openai: OpenAI;
  private threadId: string = "";
  private runId: string = "";
  private sessionId: string = "";

  constructor(threadId?: string, runId?: string) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    if (threadId) this.threadId = threadId;
    if (runId) this.runId = runId;

    this.getSession().then();
  }

  getThreadId(): string {
    return this.threadId;
  }

  getRunId(): string {
    return this.runId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  private setThreadId({ id }: { id: string }) {
    this.threadId = id;
  }

  private setRunId({ id }: { id: string }) {
    this.runId = id;
  }

  private setSessionId({ _id }: { _id: any }) {
    this.sessionId = typeof _id === "string" ? _id : _id.toString();
  }

  private async setSession(phoneNumber: string, content: string) {
    const chatSession = await ChatSession.create({
      phoneNumber,
      topic: content,
      threadId: this.threadId,
      runIds: [],
      startTime: new Date(),
    });

    this.setSessionId(chatSession);
  }

  private async getSession() {
    if (!this.threadId) return;
    const session = await ChatSession.findOne({ threadId: this.threadId });
    if (session) this.setSessionId(session);
    return session;
  }

  private getContent(topic: any) {
    const topicContent = typeof topic === "string" ? { content: topic } : topic;
    const localContent = {
      nowDate: new Date().toISOString(),
      locationCall: "Brazil/São Paulo",
      language: "pt-BR",
    };

    return JSON.stringify({
      ...topicContent,
      ...localContent,
    });
  }

  async createThreadAndRun(phoneNumber: string, topic: any) {
    const content = this.getContent(topic);

    const thread = await this.openai.beta.threads.create();
    this.setThreadId(thread);

    await this.openai.beta.threads.messages.create(this.threadId, {
      role: "user",
      content,
    });

    console.log("📝 Thread criada:", this.threadId);

    this.setSession(phoneNumber, content);

    await this.createRun();

    return { content, sessionId: this.sessionId };
  }

  async createThreadWithHistory(phoneNumber: string, message: string) {
    const chatSessions = await ChatSession.aggregate([
      { $match: { phoneNumber } },
      { $sort: { _id: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "chatmessages",
          localField: "_id",
          foreignField: "sessionId",
          as: "messages",
        },
      },
      { $unwind: "$messages" },
      { $sort: { "messages._id": -1 } },
      {
        $group: {
          _id: "$_id",
          phoneNumber: { $first: "$phoneNumber" },
          topic: { $first: "$topic" },
          startTime: { $first: "$startTime" },
          endTime: { $first: "$endTime" },
          messages: { $push: "$messages" },
        },
      },
      { $sort: { _id: -1 } },
    ]);
    console.log("📚 Histórico de conversas:", chatSessions);
    const thread = await this.openai.beta.threads.create();
    this.setThreadId(thread);

    await Promise.all(
      chatSessions.map(async (chatSession, index) => {
        console.log(`📚 Conversa (${index}):`, chatSession);
        await this.openai.beta.threads.messages.create(this.threadId, {
          role: "user",
          content: chatSession.topic,
        });
        const lastMessage = chatSession.messages[0];
        await this.openai.beta.threads.messages.create(this.threadId, {
          role: "assistant",
          content: lastMessage.content,
        });
        return;
      })
    );
    await this.openai.beta.threads.messages.create(this.threadId, {
      role: "user",
      content: message,
    });

    console.log("📝 Thread criada:", this.threadId);
    this.setSession(phoneNumber, message);

    await this.createRun();

    return { content: message, sessionId: this.sessionId };
  }

  async createRun() {
    const run = await this.openai.beta.threads.runs.create(this.threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_DIRECIONADOR_ID!,
    });

    this.setRunId(run);

    await ChatSession.findByIdAndUpdate(this.sessionId, {
      $push: { runIds: run.id },
    });
  }

  private async saveMessage(role: "user" | "assistant", content: string) {
    if (!this.sessionId) return;

    await ChatMessage.create({
      sessionId: this.sessionId,
      role,
      content,
    });
  }

  async getRunStatus() {
    console.log("⏳ Buscando status do run: ", this.threadId, this.runId);
    return await this.openai.beta.threads.runs.retrieve(
      this.threadId,
      this.runId
    );
  }

  async checkRunStatus() {
    let status = await this.getRunStatus();

    while (status.status !== "completed") {
      console.log("⏳ Ainda processando...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      status = await this.getRunStatus();
    }

    return status;
  }

  async getLastResponse() {
    const messagesGPT = await this.openai.beta.threads.messages.list(
      this.threadId
    );
    const contentGpt = messagesGPT.data[0].content[0] as TextContentBlock;
    await this.saveMessage("assistant", contentGpt.text.value);
    return contentGpt.text.value;
  }

  async sendUserMessage(userSpeech: string) {
    await this.openai.beta.threads.messages.create(this.threadId, {
      role: "user",
      content: userSpeech,
    });
    await this.saveMessage("user", userSpeech);
  }

  async closeSession() {
    if (!this.sessionId) return;
    await ChatSession.findByIdAndUpdate(this.sessionId, {
      endTime: new Date(),
    });
  }
}

export default OpenAIService;
