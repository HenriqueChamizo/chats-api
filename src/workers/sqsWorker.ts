import SqsService from "../services/sqsService";
import QueueMessage from "../models/QueueMessage";

async function processQueue() {
  try {
    const sqs = new SqsService();
    const result = await sqs.processQueue();

    if (result.Messages) {
      for (const message of result.Messages) {
        console.log("📨 Mensagem recebida:", message.Body);

        const data = JSON.parse(message.Body || "{}");

        const queueMessage = await QueueMessage.findOne({
          messageId: message.MessageId,
        });

        if (!queueMessage) {
          console.error("🚨 Mensagem não encontrada no banco!");
          continue;
        }

        try {
          await sqs.processedQueue(data);

          queueMessage &&
            (await sqs.deleteMessage(
              message.ReceiptHandle!,
              message.MessageId!
            ));
        } catch (error) {
          console.error("❌ Erro ao processar mensagem:", error);

          queueMessage &&
            (await QueueMessage.findOneAndUpdate(
              { messageId: message.MessageId },
              { status: "failed" },
              { new: true }
            ));
        }
      }
    }
  } catch (error) {
    console.error("❌ Erro ao processar fila:", error);
  }
}

export default setInterval(processQueue, 5000);
