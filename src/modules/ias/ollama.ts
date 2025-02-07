import axios from "axios";

async function chat(message: string) {
  const { OLLAMA_HOST, OLLAMA_MODEL } = process.env;
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: message,
      stream: false,
    });

    return response.data.response;
  } catch (error: any) {
    console.error("Erro na API Ollama:", error.response?.data || error.message);
  }
  return null;
}

export default chat;
