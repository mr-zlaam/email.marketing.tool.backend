import bcrypt from "bcrypt";
import type { Response } from "express";
import { jsonResponse } from "./apiResponse.util";

export const passwordHasher = async (password: string, res: Response) => {
  try {
    const hashedPassword: string = await bcrypt.hash(password, 10);
    return hashedPassword;
  } catch (error: unknown) {
    if (error instanceof Error) return res.status(500).json(jsonResponse(500, error.message || "internal server error while hashing the password"));
    else return res.status(500).json(jsonResponse(500, (error as string) || "internal server error while hashing the password"));
  }
};
export const verifyPassword = async (password: string, existingPassword: string, res: Response): Promise<boolean | Response> => {
  try {
    const isPasswordValid = await bcrypt.compare(password, existingPassword);
    if (!isPasswordValid) throw { status: 403, message: "Invalid Credentials" };
    return isPasswordValid;
  } catch (error: unknown) {
    if (error instanceof Error) return res.status(500).json(jsonResponse(500, error.message || "Internal server Error while checking credentials"));
    return false;
  }
};
