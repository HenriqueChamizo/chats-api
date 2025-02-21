import mongoose from "mongoose";

const CallSessionSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession" },
    callSid: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["in-progress", "completed", "failed"],
      default: "in-progress",
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    duration: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model("CallSession", CallSessionSchema);
