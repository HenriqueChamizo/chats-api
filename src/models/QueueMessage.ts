import mongoose, { Schema, Document } from "mongoose";

export interface IQueueMessage extends Document {
  messageId: string;
  queueUrl: string;
  body: any;
  status: "pending" | "processing" | "processed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const QueueMessageSchema = new Schema<IQueueMessage>(
  {
    messageId: { type: String, required: true, unique: true },
    queueUrl: { type: String, required: true },
    body: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "processed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IQueueMessage>(
  "QueueMessage",
  QueueMessageSchema
);
