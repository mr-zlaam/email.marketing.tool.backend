/* eslint-disable no-unused-vars */
import { type NextFunction, type Request, type Response } from "express";
type AsyncRequestHandler<T> = (req: Request, res: Response, next: NextFunction) => Promise<T>;
const asyncHandler = <T>(requestHandler: AsyncRequestHandler<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch(next);
  };
};

export { asyncHandler };
