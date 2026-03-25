const express = require("express");
const router = express.Router();
const Task = require("../models/task.models");
const auth = require("../middleware/authMiddleware");

// POST /tasks — create a task (protected)
router.post("/", auth, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const task = new Task({
      title: title.trim(),
      description: description?.trim() || '',
      status: 'pending',
      owner: req.user.userId,
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /tasks — all tasks, optional ?status= filter (protected)
router.get("/", auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const tasks = await Task.find(filter).populate("owner", "name email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /tasks/user/:uid — tasks for a specific user, optional ?status= filter (protected)
router.get("/user/:uid", auth, async (req, res) => {
  try {
    const filter = { owner: req.params.uid };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const tasks = await Task.find(filter).populate("owner", "name email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Invalid User ID or Server Error" });
  }
});

// PATCH /tasks/:id — update title, description, or status (owner only)
router.patch("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    const { title, description, status, notes } = req.body;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (notes !== undefined) task.notes = notes.trim();
    if (status !== undefined) {
      const validStatuses = ['pending', 'progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      task.status = status;
    }

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /tasks/:id — delete a task (owner only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
