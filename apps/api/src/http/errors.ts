export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "error",
  ) {
    super(message);
  }
}
