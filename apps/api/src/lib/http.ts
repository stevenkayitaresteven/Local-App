import type { Request, Response, NextFunction, RequestHandler } from "express";

/** Wrap async handlers so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function created<T>(res: Response, body: T): void {
  res.status(201).json(body);
}

export function ok<T>(res: Response, body: T): void {
  res.status(200).json(body);
}

export function noContent(res: Response): void {
  res.status(204).end();
}
