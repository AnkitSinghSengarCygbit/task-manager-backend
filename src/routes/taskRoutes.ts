import express, { Request, Response, NextFunction } from "express";
import Task, { TaskStatus } from "../models/task.models";
import User from "../models/user.models";
import auth from "../middleware/authMiddleware";

const router = express.Router();

// Middleware: admin-only guard (chains after auth)
const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user || user.role !== "admin") {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    next();
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /tasks — create a task (protected)
router.post("/", auth, async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ message: "Title is required" });
      return;
    }

    const task = new Task({
      title: title.trim(),
      description: description?.trim() || "",
      status: "pending",
      owner: req.user!.userId,
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

// POST /tasks/assign — admin assigns a task to a user
router.post("/assign", auth, adminAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, assignedTo } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ message: "Title is required" });
      return;
    }
    if (!assignedTo) {
      res.status(400).json({ message: "assignedTo user is required" });
      return;
    }

    const targetUser = await User.findById(assignedTo);
    if (!targetUser) {
      res.status(404).json({ message: "Assigned user not found" });
      return;
    }

    const task = new Task({
      title: title.trim(),
      description: description?.trim() || "",
      status: "assigned",
      owner: req.user!.userId,
      assignedTo,
      assignedBy: req.user!.userId,
      screenshotRequired: !!req.body.screenshotRequired,
    });

    await task.save();
    const populated = await task.populate("assignedTo", "name email");
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

// GET /tasks/user-counts — admin gets task count per user (aggregation)
router.get("/user-counts", auth, adminAuth, async (req: Request, res: Response) => {
  try {
    const counts = await Task.aggregate([
      { $match: { assignedTo: { $exists: true, $ne: null } } },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]);
    const result: Record<string, number> = {};
    counts.forEach((c) => { result[c._id.toString()] = c.count; });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// GET /tasks/pending-review — admin sees all submitted tasks awaiting review
router.get("/pending-review", auth, adminAuth, async (req: Request, res: Response) => {
  try {
    const tasks = await Task.find({ status: "submitted" })
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// GET /tasks — all tasks, optional ?status= filter (protected)
router.get("/", auth, async (req: Request, res: Response) => {
  try {
    const filter: { status?: string } = {};
    if (req.query.status) {
      filter.status = req.query.status as string;
    }

    const tasks = await Task.find(filter).populate("owner", "name email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// GET /tasks/user/:uid — own + assigned tasks for a user, optional ?status= filter
router.get("/user/:uid", auth, async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;
    const filter: Record<string, unknown> = {
      $or: [{ owner: uid }, { assignedTo: uid }],
    };
    if (req.query.status) {
      filter.status = req.query.status as string;
    }

    const tasks = await Task.find(filter)
      .populate("owner", "name email")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Invalid User ID or Server Error" });
  }
});

// PATCH /tasks/:id/submit-proof — user submits proof for an assigned task
router.patch("/:id/submit-proof", auth, async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    if (task.assignedTo?.toString() !== req.user!.userId) {
      res.status(403).json({ message: "Not authorized to submit proof for this task" });
      return;
    }

    const { proof, screenshot } = req.body;
    if (!proof || !proof.trim()) {
      res.status(400).json({ message: "Proof is required" });
      return;
    }

    task.proof = proof.trim();
    task.screenshot = screenshot || "";
    task.status = "submitted";
    task.adminFeedback = "";
    await task.save();

    const populated = await task.populate([
      { path: "assignedTo", select: "name email" },
      { path: "assignedBy", select: "name email" },
    ]);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// PATCH /tasks/:id/review — admin approves or rejects a submitted task
router.patch("/:id/review", auth, adminAuth, async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    if (task.status !== "submitted") {
      res.status(400).json({ message: "Task is not awaiting review" });
      return;
    }

    const { approved, feedback, approvalNote } = req.body;

    if (approved) {
      task.status = "completed";
      task.adminFeedback = "";
      task.approvalNote = approvalNote?.trim() ?? "";
    } else {
      if (!feedback || !feedback.trim()) {
        res.status(400).json({ message: "Feedback is required when rejecting" });
        return;
      }
      task.status = "revision";
      task.adminFeedback = feedback.trim();
      task.approvalNote = "";
    }

    await task.save();
    const populated = await task.populate([
      { path: "assignedTo", select: "name email" },
      { path: "assignedBy", select: "name email" },
    ]);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// PATCH /tasks/:id — update title, description, status, or notes (owner only)
router.patch("/:id", auth, async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    if (task.owner.toString() !== req.user!.userId) {
      res.status(403).json({ message: "Not authorized to update this task" });
      return;
    }

    const { title, description, status, notes } = req.body;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (notes !== undefined) task.notes = notes.trim();
    if (status !== undefined) {
      const validStatuses: TaskStatus[] = ["pending", "progress", "completed"];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ message: "Invalid status value" });
        return;
      }
      task.status = status;
    }

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// DELETE /tasks/:id — delete a task (owner only)
router.delete("/:id", auth, async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    if (task.owner.toString() !== req.user!.userId) {
      res.status(403).json({ message: "Not authorized to delete this task" });
      return;
    }

    await task.deleteOne();
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

export default router;
