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

  private async getSession() {
    if (!this.threadId) return;
    const session = await ChatSession.findOne({ threadId: this.threadId });
    if (session) this.setSessionId(session);
    return session;
  }

  async createThreadAndRun(phoneNumber: string, topic: any) {
    const topicContent = typeof topic === "string" ? { content: topic } : topic;
    const localContent = {
      nowDate: new Date().toISOString(),
      locationCall: "Brazil/São Paulo",
      language: "pt-BR",
    };

    const content = JSON.stringify({
      ...topicContent,
      ...localContent,
    });

    const thread = await this.openai.beta.threads.create();
    this.setThreadId(thread);

    await this.openai.beta.threads.messages.create(this.threadId, {
      role: "user",
      content,
    });

    console.log("📝 Thread criada:", this.threadId);

    const chatSession = await ChatSession.create({
      phoneNumber,
      topic: content,
      threadId: this.threadId,
      runIds: [],
      startTime: new Date(),
    });

    this.setSessionId(chatSession);

    await this.createRun();

    return { content, sessionId: this.sessionId };
  }

  async createRun() {
    const run = await this.openai.beta.threads.runs.create(this.threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID!,
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
