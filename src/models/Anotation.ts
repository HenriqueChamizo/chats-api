import mongoose, { Schema, Document } from "mongoose";

export interface IAnotation extends Document {
  description: string;
  data: Record<string, any>;
  keys: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AnotationSchema = new Schema<IAnotation>(
  {
    description: { type: String, required: true },
    data: { type: Object, required: true },
    keys: { type: [String], required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model<IAnotation>("Anotation", AnotationSchema);
