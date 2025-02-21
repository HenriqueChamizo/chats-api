import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  sessionId: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: "ChatSession",
    required: true,
  },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
