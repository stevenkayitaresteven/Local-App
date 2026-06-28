import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";
import { errors } from "../lib/errors.js";

type Source = "body" | "query" | "params";

/**
 * Validate-and-narrow middleware. On success the parsed, typed value replaces the
 * raw input so handlers read trusted data. On failure it raises a 422 with a
 * field-level breakdown.
 */
export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // query/params are read-only getters on Express 4 in some setups; assign safely.
      Object.defineProperty(req, source, { value: parsed, writable: true, configurable: true });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(errors.unprocessable("Amakuru yatanzwe ntiyemewe", err.flatten().fieldErrors));
      } else {
        next(err);
      }
    }
  };
}
