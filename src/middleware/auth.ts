import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

export type AuthPayload = {
  userId: string;
  role: string;
};

export type AuthenticatedRequest = Request & { user?: AuthPayload };

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, status: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ success: false, error: "User not active" });
    }

    req.user = { userId: user.id, role: user.role };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};
