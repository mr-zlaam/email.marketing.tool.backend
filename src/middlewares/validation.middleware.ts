import type { Request, Response, NextFunction } from "express";
import reshttp from "reshttp";
import { type z, ZodError } from "zod";

export function validator(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue: issueParamType) => ({
          message: `ERR:: ${issue.message} `
        }));
        res.status(reshttp.badRequestCode).json({
          success: false,
          status: reshttp.badRequestCode,
          error: "Invalid data",
          details: errorMessages
        });
      } else {
        res.status(reshttp.internalServerErrorCode).json({
          success: false,
          status: reshttp.internalServerErrorCode,
          error: reshttp.internalServerErrorMessage + "zod(validation.middleware.ts)"
        });
      }
    }
  };
}

type issueParamType = {
  message: string;
};
