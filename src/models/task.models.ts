import mongoose, { Document, Schema, Types } from "mongoose";

export type TaskStatus = "pending" | "progress" | "completed" | "assigned" | "submitted" | "revision";

export interface ITask extends Document {
  title: string;
  description: string;
  status: TaskStatus;
  notes: string;
  owner: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  assignedBy?: Types.ObjectId;
  proof?: string;
  screenshot?: string;
  screenshotRequired?: boolean;
  adminFeedback?: string;
  approvalNote?: string;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "progress", "completed", "assigned", "submitted", "revision"],
      default: "pending",
    },
    notes: { type: String, default: "", trim: true },
    owner: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    proof: { type: String, default: "", trim: true },
    screenshot: { type: String, default: "" },
    screenshotRequired: { type: Boolean, default: false },
    adminFeedback: { type: String, default: "", trim: true },
    approvalNote: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<ITask>("Task", taskSchema);
