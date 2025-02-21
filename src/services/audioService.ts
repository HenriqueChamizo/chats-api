import fs from "fs";
import path from "path";
import { pipeline } from "stream";
import { OpenAI } from "openai";

class AudioService {
  private openai: OpenAI;
  private static TEMP_PATH = "/tmp";

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }

  async downloadAudio(url: string): Promise<string> {
    const auth = {
      username: process.env.TWILIO_ACCOUNT_SID!,
      password: process.env.TWILIO_SECRET_KEY!,
    };
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${auth.username}:${auth.password}`
        ).toString("base64")}`,
      },
    });
    if (!response.ok) throw new Error("Erro ao baixar o áudio.");

    const arrayBuffer = await response.arrayBuffer(); // Converte para Buffer
    const buffer = Buffer.from(arrayBuffer);

    const filePath = path.join(AudioService.TEMP_PATH, "audio.ogg");
    fs.writeFileSync(filePath, buffer); // Salva o arquivo corretamente

    return filePath;
  }

  async transcribeAudio(filePath: string): Promise<string> {
    const response = await this.openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "pt",
    });

    return response.text.trim();
  }

  async processAudio(url: string): Promise<string> {
    try {
      console.log(`🎙️ Mensagem de voz recebida:`, url);
      const filePath = await this.downloadAudio(url);
      console.log(`📥 Áudio baixado:`, filePath);
      const text = await this.transcribeAudio(filePath);
      console.log("📲 Mensagem do transcrita: ", text);
      fs.unlinkSync(filePath);
      return text;
    } catch (error) {
      console.error("❌ Erro ao processar áudio:", error);
      return "Desculpe, não entendi seu audio. Pode repetir ou escrever?";
    }
  }
}

export default AudioService;
