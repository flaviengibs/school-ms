import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { verifyToken } from "./utils/jwt";

export interface SocketUser {
  id: number;
  role: string;
  email: string;
  socketId: string;
}

// In-memory online users map
const onlineUsers = new Map<number, SocketUser>();

let io: SocketServer;

export const initSocket = (httpServer: HttpServer) => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = verifyToken(token);
      (socket as any).user = { id: payload.id, role: payload.role, email: payload.email };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user as SocketUser;
    user.socketId = socket.id;
    onlineUsers.set(user.id, user);

    // Broadcast updated online list to admins
    emitOnlineUsers();

    socket.on("disconnect", () => {
      onlineUsers.delete(user.id);
      emitOnlineUsers();
    });

    // Join role-based rooms for targeted notifications
    socket.join(`role:${user.role}`);
    socket.join(`user:${user.id}`);
  });

  return io;
};

export const getIo = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

const emitOnlineUsers = () => {
  const list = Array.from(onlineUsers.values()).map(u => ({
    id: u.id, role: u.role, email: u.email,
  }));
  io.to("role:SUPER_ADMIN").to("role:ADMIN").emit("online_users", list);
};

// Notification helpers called from controllers
export const notifyUser = (userId: number, event: string, data: object) => {
  getIo().to(`user:${userId}`).emit(event, data);
};

export const notifyRole = (role: string, event: string, data: object) => {
  getIo().to(`role:${role}`).emit(event, data);
};

export const notifyAll = (event: string, data: object) => {
  getIo().emit(event, data);
};
