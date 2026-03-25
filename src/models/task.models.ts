import mongoose, { Document, Schema, Types } from "mongoose";

export type TaskStatus = "pending" | "progress" | "completed";

export interface ITask extends Document {
  title: string;
  description: string;
  status: TaskStatus;
  notes: string;
  owner: Types.ObjectId;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "progress", "completed"],
      default: "pending",
    },
    notes: { type: String, default: "", trim: true },
    owner: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model<ITask>("Task", taskSchema);
