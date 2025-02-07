import axios from "axios";

async function chat(message: string) {
  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      { contents: [{ parts: [{ text: message }] }] },
      {
        headers: { "Content-Type": "application/json" },
        params: { key: process.env.GOOGLE_GEMINI_API_KEY },
      }
    );

    return {
      role: "assistant",
      content: response.data.candidates[0].content.parts[0].text,
      refusal: null,
    };
  } catch (error: any) {
    console.error("Erro na IA:", error.response?.data || error.message);
  }
  return null;
}

export default chat;
