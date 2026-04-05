import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth.js";

export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!roles.includes(role)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    return next();
  };
};