import type { NextFunction, Request, Response } from "express";
import { eq, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { database, type DatabaseClient } from "../db/db";
import { httpResponse } from "../utils/globalUtil/apiResponse.util";
import getMinutes from "../utils/quickUtil/getMinute.util";
import envConfig from "../config/env.config";
import reshttp from "reshttp";
import logger from "../utils/globalUtil/logger.util";
import { doubleNumber } from "../utils/globalUtil/doubleNumber.uitl";
import { rateLimiterFlexible } from "../db/schemas/rateLimiterSchema";
const db: DatabaseClient = database.db;

type ErrorLimiter = {
  remainingPoints: number;
  msBeforeNext: number;
};

type ConsumeResult = {
  remainingPoints: number;
};

interface RateLimiterOptions {
  storeClient: NodePgDatabase<Record<string, unknown>>;
  points: number;
  duration: number;
}

class RateLimiterDrizzle {
  private storeClient: NodePgDatabase<Record<string, unknown>>;
  private points: number;
  private duration: number;

  constructor({ storeClient, points, duration }: RateLimiterOptions) {
    this.storeClient = storeClient;
    this.points = points;
    this.duration = duration;
  }

  async consume(key: string, points: number = 1): Promise<ConsumeResult> {
    const now = new Date();

    // First, try to find an existing record
    const records = await this.storeClient.select().from(rateLimiterFlexible).where(eq(rateLimiterFlexible.key, key));
    const record = records[0];

    // If no record exists or expired, create a new one
    if (!record) {
      const expire = new Date(now.getTime() + this.duration * 1000); // Initial expiration based on the duration

      await this.storeClient.insert(rateLimiterFlexible).values({
        key,
        points,
        expire,
        previousDelay: this.duration // Set the initial delay
      });

      return { remainingPoints: this.points - points };
    }

    // If record exists and is expired, handle delay doubling
    if (record.expire && record.expire < now) {
      const prevDelay = record.previousDelay || this.duration; // Use existing delay or the initial duration if first request
      const newDelay = doubleNumber(prevDelay); // Double the previous delay

      const expire = new Date(now.getTime() + newDelay * 1000); // New expiration time

      // Update the record with the new delay and expiration
      await this.storeClient
        .update(rateLimiterFlexible)
        .set({
          points: record.points + points, // Increment the points
          expire,
          previousDelay: newDelay // Update to the doubled delay
        })
        .where(eq(rateLimiterFlexible.key, key));

      return { remainingPoints: this.points - (record.points + points) };
    }

    // If the record exists and is not expired, just update the points
    const newPoints = record.points + points;

    // Check if the limit is exceeded
    if (newPoints > this.points) {
      const msBeforeNext = record.expire ? record.expire.getTime() - now.getTime() : this.duration * 1000;

      throw {
        remainingPoints: 0,
        msBeforeNext
      } as ErrorLimiter;
    }

    // Update the points
    await this.storeClient
      .update(rateLimiterFlexible)
      .set({
        points: newPoints
      })
      .where(eq(rateLimiterFlexible.key, key));

    return { remainingPoints: this.points - newPoints };
  }
}

class RateLimiterMiddleware {
  private rateLimiter: RateLimiterDrizzle | null = null;
  private currentTotalPoints: number | null = null;
  private currentDuration: number | null = null;

  public async handle(
    req: Request,
    res: Response,
    next: NextFunction,
    consumptionPoints = 1,
    message?: string,
    totalPoints?: number,
    duration = 60
  ): Promise<void> {
    try {
      if (envConfig.NODE_ENV === "development") return next();

      // Initialize or reinitialize rate limiter only if totalPoints or duration have changed
      if (!this.rateLimiter || this.currentTotalPoints !== totalPoints || this.currentDuration !== duration) {
        this.rateLimiter = new RateLimiterDrizzle({
          storeClient: db,
          points: totalPoints || 10, // Default points if none provided
          duration
        });
        this.currentTotalPoints = totalPoints || 10;
        this.currentDuration = duration;
      }

      // Consume points based on the request-specific consumptionPoints
      await this.rateLimiter.consume(req.ip || "unknown-ip", consumptionPoints);
      next();
    } catch (err: unknown) {
      if (this.isErrorLimiter(err)) {
        if (err.remainingPoints === 0) {
          const remainingSeconds = Math.ceil(err.msBeforeNext / 1000); // Convert ms to seconds
          const remainingDuration = getMinutes(remainingSeconds);
          httpResponse(req, res, reshttp.tooManyRequestsCode, message || `${reshttp.tooManyRequestsMessage} ${remainingDuration}`, null).end();
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : String(err);
        httpResponse(req, res, reshttp.internalServerErrorCode, `something went wrong in rateLimiter middleware: ${errorMessage}`, null);
      }
    }
  }

  // Type guard for ErrorLimiter
  private isErrorLimiter(error: unknown): error is ErrorLimiter {
    return typeof error === "object" && error !== null && "remainingPoints" in error && "msBeforeNext" in error;
  }

  // Utility method to clean up expired records periodically
  public async cleanUp(): Promise<void> {
    const now = new Date();
    try {
      await db.delete(rateLimiterFlexible).where(lte(rateLimiterFlexible.expire, now));
    } catch (error) {
      logger.error("Error cleaning up rate limiter records:", { error });
    }
  }
}

const rateLimiterMiddleware = new RateLimiterMiddleware();
export default rateLimiterMiddleware;
