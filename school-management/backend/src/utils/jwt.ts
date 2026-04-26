import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "school_secret_key";

export const signToken = (payload: object) =>
  jwt.sign(payload, SECRET, { expiresIn: "7d" });

export const verifyToken = (token: string) =>
  jwt.verify(token, SECRET) as jwt.JwtPayload;
