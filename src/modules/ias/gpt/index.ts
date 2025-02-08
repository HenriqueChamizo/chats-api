import axios from "axios";
import contexts from "./../contexts";

async function chat(message: string, context?: string) {
  try {
    const messages = [{ role: "user", content: message }];
    if (context) {
      messages.push(...contexts[context]("gpt"));
    }
    console.log("Messages", messages);
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: process.env.OPENAI_MODEL,
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message;
  } catch (error: any) {
    console.error("Erro na IA:", error.response?.data || error.message);
  }
  return null;
}
export default chat;
