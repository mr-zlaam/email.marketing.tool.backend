import type ms from "ms";
import envConfig from "../config/env.config";
import type { CorsOptions } from "cors";
import { throwError } from "../utils/globalUtil/throwError.util";
import type { CookieOptions } from "express";
export default {
  COMPANY_NAME: "Dialloom",
  OTP_EXPIRY: "30m" as number | ms.StringValue | undefined,
  ACCESS_TOKEN_EXPIRY: envConfig.NODE_ENV === "development" ? "7d" : ("14m" as number | ms.StringValue | undefined),
  REFRESH_TOKEN_EXPIRY: "30d" as number | ms.StringValue | undefined,
  COOKIEOPTIONS: {
    ACESSTOKENCOOKIEOPTIONS: {
      httpOnly: true,
      secure: envConfig.NODE_ENV === "production",
      sameSite: "none",
      expires: new Date(Date.now() + 14 * 60 * 1000) // 14 minutes in milliseconds
    } as CookieOptions,
    REFRESHTOKENCOOKIEOPTIONS: {
      httpOnly: true,
      secure: envConfig.NODE_ENV === "production",
      sameSite: "none",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days in milliseconds
    } as CookieOptions
  },
  SELECTED_COLUMNS: {
    FROM: {
      USER: {
        uid: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        companyName: true,
        companyURI: true,
        country: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        isVerified: true
      }
    }
  },
  CORS_OPTIONS: {
    methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE", "PATCH", "HEAD"],

    allowedHeaders: ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (envConfig.ALLOWED_REGIONS.includes(origin)) {
        callback(null, true);
      } else {
        callback(throwError(403, "Origin not allowed"));
      }
    }
  } as CorsOptions,
  EMAIL_SEND_QUENE: "emailSendQueue"
};
