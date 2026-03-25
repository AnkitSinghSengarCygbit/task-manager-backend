import express, { Request, Response } from "express";
import Task, { TaskStatus } from "../models/task.models";
import auth from "../middleware/authMiddleware";

const router = express.Router();

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

// GET /tasks/user/:uid — tasks for a specific user, optional ?status= filter (protected)
router.get("/user/:uid", auth, async (req: Request, res: Response) => {
  try {
    const filter: { owner: string; status?: string } = { owner: req.params.uid as string };
    if (req.query.status) {
      filter.status = req.query.status as string;
    }

    const tasks = await Task.find(filter).populate("owner", "name email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Invalid User ID or Server Error" });
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
