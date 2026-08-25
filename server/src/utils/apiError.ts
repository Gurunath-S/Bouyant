export class ApiError extends Error {
  public statusCode: number;
  public errors: any[];
  public isOperational: boolean;

  constructor(statusCode: number, message: string, errors: any[] = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, errors: any[] = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized access') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Access forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message: string, errors: any[] = []) {
    return new ApiError(409, message, errors);
  }

  static unprocessable(message: string, errors: any[] = []) {
    return new ApiError(422, message, errors);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}
