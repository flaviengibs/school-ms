import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import path from "path";
import { initSocket } from "./socket";

import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import classesRoutes from "./routes/classes.routes";
import subjectsRoutes from "./routes/subjects.routes";
import gradesRoutes from "./routes/grades.routes";
import attendanceRoutes from "./routes/attendance.routes";
import timetableRoutes from "./routes/timetable.routes";
import bulletinsRoutes from "./routes/bulletins.routes";
import announcementsRoutes from "./routes/announcements.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import auditRoutes from "./routes/audit.routes";
import messagesRoutes from "./routes/messages.routes";
import homeworkRoutes from "./routes/homework.routes";
import eventsRoutes from "./routes/events.routes";
import blamesRoutes from "./routes/blames.routes";
import applicationsRoutes from "./routes/applications.routes";
import settingsRoutes from "./routes/settings.routes";
import gradebookRoutes from "./routes/gradebook.routes";
import exportRoutes from "./routes/export.routes";
import schoolsRoutes from "./routes/schools.routes";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Security headers
app.use(helmet());

// CORS — only allow the frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json({ limit: "10kb" }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads"))); // limit body size

// Global rate limit: 500 req / 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
}));

// Stricter limit on auth endpoints: 50 req / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Too many auth attempts, please try again later" },
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/grades", gradesRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/bulletins", bulletinsRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/blames", blamesRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/gradebook", gradebookRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/schools", schoolsRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Init Socket.io
initSocket(httpServer);

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
