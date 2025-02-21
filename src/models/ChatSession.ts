import mongoose, { Schema, Document } from "mongoose";

export interface IChatSession extends Document {
  phoneNumber: string;
  topic: string;
  threadId: string;
  runIds: string[];
  startTime: Date;
  endTime?: Date;
}

const ChatSessionSchema = new Schema<IChatSession>({
  phoneNumber: { type: String, required: true },
  topic: { type: String, required: true },
  threadId: { type: String, required: true },
  runIds: [{ type: String }],
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
});

export default mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);
