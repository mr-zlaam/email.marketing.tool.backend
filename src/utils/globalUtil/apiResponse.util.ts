import type { Request, Response } from "express";
import envConfig from "../../config/env.config";
const ENV = envConfig.NODE_ENV;
const jsonResponse = (
  status: number,
  message: string = "OK",
  data: object | null | object[] = null,
  metaData: object | null | object[] = null,
  optMessage: string = ""
) => {
  return {
    success: status < 400,
    statusCode: status,
    message: message,
    data: data,
    metaData: metaData,
    optMessage: optMessage
  };
};
const httpResponse = (req: Request, res: Response, statusCode: number, message: string, data: unknown = null): Response => {
  const response: IHTTPRESPONSE = {
    success: statusCode < 400,
    status: statusCode,
    message,
    data,
    requestInfo: {
      url: req.originalUrl,
      ip: req?.ip,
      method: req.method
    }
  };
  if (ENV && ENV === "production" && response.requestInfo) {
    delete response.requestInfo.ip;
  }
  return res.status(statusCode).json(response).end();
};
export { jsonResponse, httpResponse };

interface IHTTPRESPONSE {
  success: boolean;
  status: number;
  message: string;
  data: unknown;
  requestInfo: {
    ip?: string;
    url: string | null;
    method: string | null;
  };
}
