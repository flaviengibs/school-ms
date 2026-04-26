import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { notifyUser } from "../socket";

export const getInbox = async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.message.findMany({
      where: { receiverId: req.user!.id },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(messages);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const getSent = async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.message.findMany({
      where: { senderId: req.user!.id },
      include: { receiver: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(messages);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, subject, body } = req.body;
    const receiver = await prisma.user.findUnique({ where: { id: Number(receiverId) } });
    if (!receiver) { res.status(404).json({ message: "Recipient not found" }); return; }

    const message = await prisma.message.create({
      data: { senderId: req.user!.id, receiverId: Number(receiverId), subject, body },
      include: { sender: { select: { firstName: true, lastName: true } } },
    });

    notifyUser(Number(receiverId), "new_message", {
      message: `New message from ${message.sender.firstName} ${message.sender.lastName}: ${subject}`,
      data: message,
    });

    res.status(201).json(message);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const markRead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.message.updateMany({
      where: { id: Number(req.params.id), receiverId: req.user!.id },
      data: { read: true },
    });
    res.json({ message: "Marked as read" });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.message.deleteMany({
      where: { id: Number(req.params.id), receiverId: req.user!.id },
    });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.message.count({ where: { receiverId: req.user!.id, read: false } });
    res.json({ count });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};
