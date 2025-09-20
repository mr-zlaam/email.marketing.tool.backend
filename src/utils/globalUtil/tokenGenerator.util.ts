import type { Response } from "express";
import type ms from "ms";
import jwt from "jsonwebtoken";
import envConfig from "../../config/env.config";
import appConstant from "../../constants/app.constant";
import logger from "./logger.util";
import type { TCURRENTROLE } from "../../db/schemas/shared/enums";
export interface IPAYLOAD {
  uid: string;
  OTP_TOKEN_VERSION: number;
  role: TCURRENTROLE;
  roleId?: number;
  isVerified: boolean;
}

export default {
  generateAccessToken: (payload: IPAYLOAD, res: Response): string | Response => {
    try {
      const token = jwt.sign(
        { uid: payload.uid, OTP_TOKEN_VERSION: payload.OTP_TOKEN_VERSION, role: payload.role, isVerified: payload.isVerified },
        envConfig.JWT_SECRET,
        {
          expiresIn: appConstant.ACCESS_TOKEN_EXPIRY
        }
      );
      return token;
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(500).json({
          success: false,
          message: error.message || "Internal server Error while generating access token",
          status: 500
        });
      else
        return res.status(500).json({
          success: false,
          message: (error as string) || "Internal server Error while generating access token",
          status: 500
        });
    }
  },
  generateRefreshToken: (payload: IPAYLOAD, res: Response): string | Response => {
    try {
      const token = jwt.sign({ uid: payload.uid, OTP_TOKEN_VERSION: payload.OTP_TOKEN_VERSION }, envConfig.JWT_SECRET, {
        expiresIn: appConstant.REFRESH_TOKEN_EXPIRY
      });
      return token;
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(500).json({
          success: false,
          message: error.message || "Internal server Error while generating access token",
          status: 500
        });
      else
        return res.status(500).json({
          success: false,
          message: (error as string) || "Internal server Error while generating access token",
          status: 500
        });
    }
  },

  generateLocationToken: (payload: object, res: Response): string | Response => {
    try {
      const token = jwt.sign(payload, envConfig.JWT_SECRET);
      return token;
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(500).json({
          success: false,
          message: error.message || "Internal server Error while generating access token",
          status: 500
        });
      else
        return res.status(500).json({
          success: false,
          message: (error as string) || "Internal server Error while generating access token",
          status: 500
        });
    }
  },
  generateOTPToken: (payload: { OTP?: string }, res: Response, expiryTime?: number | ms.StringValue): string | Response => {
    try {
      const token = jwt.sign(payload, envConfig.JWT_SECRET, { expiresIn: expiryTime ?? appConstant.OTP_EXPIRY });
      return token;
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(500).json({
          success: false,
          message: error.message || "Internal server Error while generating access token",
          status: 500
        });
      else
        return res.status(500).json({
          success: false,
          message: (error as string) || "Internal server Error while generating access token",
          status: 500
        });
    }
  }
};
export function verifyToken<T>(token: string, secret: string = envConfig.JWT_SECRET): [Error | null, T | null] {
  try {
    const decoded = jwt.verify(token, secret) as T;
    return [null, decoded];
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.info(`ERROR::${error.message || "Invalid access Token"}`, { error });
      return [new Error(error.message || `Invalid Token::${error}`), null];
    } else {
      logger.info(`ERROR::${error as string}`, { error });
      return [Error(`Internal server error while verifying token :: ${error as string}`), null];
    }
  }
}
