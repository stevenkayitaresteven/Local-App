import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { ApiError } from "@umuturanyi/shared";

export function notFoundHandler(_req: Request, res: Response): void {
  const body: ApiError = { error: { code: "not_found", message: "Iyi nzira ntibaho" } };
  res.status(404).json(body);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let code = "internal_error";
  let message = "Habaye ikibazo ku rusobe";
  let details: unknown;

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      status = 409;
      code = "conflict";
      message = "Ibi byamaze kubaho";
      details = err.meta?.target;
    } else if (err.code === "P2025") {
      status = 404;
      code = "not_found";
      message = "Ntibyabonetse";
    } else {
      status = 400;
      code = "database_error";
      message = "Ikibazo cy'ububikoshingiro";
    }
  }

  if (status >= 500) {
    logger.error({ err, reqId: req.id, path: req.path }, "unhandled error");
  } else {
    logger.debug({ code, status, reqId: req.id, path: req.path }, message);
  }

  const body: ApiError = { error: { code, message, ...(details ? { details } : {}) } };
  res.status(status).json(body);
}
