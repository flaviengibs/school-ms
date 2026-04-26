import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  type: "grade" | "attendance" | "announcement";
  message: string;
  timestamp: Date;
  read: boolean;
}

interface OnlineUser { id: number; role: string; email: string }

interface SocketContextType {
  connected: boolean;
  notifications: Notification[];
  onlineUsers: OnlineUser[];
  markAllRead: () => void;
  unreadCount: number;
}

const SocketContext = createContext<SocketContextType>({
  connected: false, notifications: [], onlineUsers: [],
  markAllRead: () => {}, unreadCount: 0,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const addNotification = (type: Notification["type"], message: string) => {
    const notif: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      type, message, timestamp: new Date(), read: false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 50)); // keep last 50
    // Also show a toast
    const icons: Record<string, string> = { grade: "📝", attendance: "🕐", announcement: "📢" };
    toast(message, { icon: icons[type] });
  };

  useEffect(() => {
    if (!user || !token) return;

    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const socket = io(socketUrl, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("new_grade", (data: any) => {
      addNotification("grade", data.message);
    });

    socket.on("attendance_update", (data: any) => {
      if (data.attendance?.status !== "PRESENT") {
        addNotification("attendance", data.message || "Attendance updated");
      }
    });

    socket.on("new_announcement", (data: any) => {
      addNotification("announcement", `New announcement: ${data.announcement?.title}`);
    });

    socket.on("new_homework", (data: any) => {
      addNotification("announcement", data.message || "New homework assigned");
    });

    socket.on("homework_graded", (data: any) => {
      addNotification("grade", data.message || "Homework graded");
    });

    socket.on("new_message", (data: any) => {
      addNotification("announcement", data.message || "New message received");
    });

    socket.on("blame_issued", (data: any) => {
      addNotification("attendance", data.message || "You received a blame");
    });

    socket.on("account_suspended", (data: any) => {
      addNotification("attendance", data.message || "Your account has been suspended");
    });

    socket.on("account_reactivated", (data: any) => {
      addNotification("grade", data.message || "Your account has been reactivated");
    });

    socket.on("online_users", (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user, token]);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SocketContext.Provider value={{ connected, notifications, onlineUsers, markAllRead, unreadCount }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
