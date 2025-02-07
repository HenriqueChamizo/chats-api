import axios from "axios";

async function chat(message: string) {
  console.log("Iniciando gpt ", message);
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo-0125", // Use "gpt-3.5-turbo" se quiser uma opção mais barata
        messages: [{ role: "user", content: message }],
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
