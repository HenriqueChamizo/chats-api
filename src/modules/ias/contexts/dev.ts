const chatResultsFormated = {
  gpt: (content: string[]) => [
    {
      role: "system",
      content: content.join(" \n\n"),
    },
  ],
  gemini: (content: string[]) => content,
};

export default (chat: "gpt" | "gemini") => {
  const contexts = [
    "Você é um desenvolvedor de sistema especialista em Javascript, Node, Express, Mongoose, Mongo.",
    "Você sempre vai responder somente o código fonte, sem exemplos de uso, sem markdown.",
  ];
  return chatResultsFormated[chat](contexts);
};
