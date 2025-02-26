export default (
  text: string
): { extracted: boolean; json: object; cleanText: string } => {
  const regex = /```json\s*([\s\S]*?)\s*```|\{[\s\S]*\}$/;
  const match = text.match(regex);

  let extractedJson: object = {};
  let extracted = false;
  let cleanText = text;

  if (match) {
    try {
      console.log("📩 JSON recebido:", match[1] || match[0]);

      const jsonString = (match[1] || match[0])
        .replace(/([{,])\s*([^":,\s]+)\s*:/g, '$1"$2":')
        .trim();

      extractedJson = JSON.parse(jsonString);
      extracted = true;
    } catch (error) {
      console.error("❌ Erro ao parsear JSON:", error);
    }

    cleanText = text.replace(match[0], "").trim();
  }

  return {
    extracted,
    json: extractedJson,
    cleanText,
  };
};
