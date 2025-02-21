import AWS from "aws-sdk";
import QueueMessage from "../models/QueueMessage";

class SQSService {
  private sqs: AWS.SQS;
  private queueUrl: string;

  constructor() {
    this.sqs = new AWS.SQS({
      region: process.env.AWS_REGION!,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    });
    this.queueUrl = process.env.AWS_SQS_QUEUE_URL!;
  }

  async sendMessage(messageBody: object) {
    const params = {
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(messageBody),
    };

    try {
      const result = await this.sqs.sendMessage(params).promise();
      console.log("📩 Mensagem enviada para a fila:", result.MessageId);

      await QueueMessage.create({
        messageId: result.MessageId,
        queueUrl: this.queueUrl,
        body: messageBody,
        status: "pending",
      });

      return result.MessageId;
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem para SQS:", error);
    }
  }

  async processQueue() {
    return await this.sqs
      .receiveMessage({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 10,
      })
      .promise();
  }

  async deleteMessage(receiptHandle: string, messageId: string) {
    await this.sqs
      .deleteMessage({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      })
      .promise();

    await QueueMessage.findOneAndUpdate(
      { messageId },
      { status: "processed" },
      { new: true }
    );

    console.log("✅ Mensagem processada e removida da fila.");
  }
}

export default SQSService;
