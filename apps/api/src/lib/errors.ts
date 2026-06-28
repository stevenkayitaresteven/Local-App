/**
 * Application error taxonomy. Throw these anywhere; the error middleware maps
 * them to a stable JSON envelope and HTTP status.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errors = {
  badRequest: (message = "Igisabwa ntikiremewe", details?: unknown) =>
    new AppError(400, "bad_request", message, details),
  unauthorized: (message = "Ugomba kwinjira") =>
    new AppError(401, "unauthorized", message),
  forbidden: (message = "Ntabwo ubifitiye uburenganzira") =>
    new AppError(403, "forbidden", message),
  notFound: (message = "Ntibyabonetse") =>
    new AppError(404, "not_found", message),
  conflict: (message = "Ibi byamaze kubaho", details?: unknown) =>
    new AppError(409, "conflict", message, details),
  unprocessable: (message = "Amakuru ntiyemewe", details?: unknown) =>
    new AppError(422, "unprocessable", message, details),
  tooMany: (message = "Wagerageje kenshi cyane, tegereza gato") =>
    new AppError(429, "rate_limited", message),
  internal: (message = "Habaye ikibazo") =>
    new AppError(500, "internal_error", message),
};
