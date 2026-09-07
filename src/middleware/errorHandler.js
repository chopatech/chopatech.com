export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Registered with app.onError() in src/index.js
export function errorHandler(err, c) {
  const status = err.status || 500;
  if (status >= 500) console.error(err.message, err.stack);

  return c.json(
    {
      error: {
        message: status === 500 ? "Something went wrong. Please try again." : err.message,
        details: status < 500 ? err.details : undefined,
      },
    },
    status
  );
}
