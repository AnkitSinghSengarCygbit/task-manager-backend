require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const taskRoutes = require("./routes/taskRoutes");
const userRoutes = require("./routes/auth.routes");

const app = express();
const port = process.env.PORT || 3000;

// MIDDLEWARE
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// DATABASE CONNECTION
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("Database Connected!"))
  .catch((err) => console.log(err));

// ROUTES
app.use("/tasks", taskRoutes);
app.use("/users", userRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
