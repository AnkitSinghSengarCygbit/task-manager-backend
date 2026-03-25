import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
}

const auth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const header = req.header("Authorization");

    if (!header) {
      res.status(401).json({ message: "No token provided!" });
      return;
    }

    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
      res.status(401).json({ message: "Invalid token format" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
};

export default auth;
