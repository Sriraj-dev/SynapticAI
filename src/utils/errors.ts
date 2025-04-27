import { StatusCodes } from "./statusCodes";

export class AppError extends Error {
	constructor(public message: string, public statusCode: StatusCodes) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

export class NotFoundError extends AppError {
	constructor(message = "Resource not found") {
		super(message, StatusCodes.NOT_FOUND);
	}
}

export class AccessDeniedError extends AppError {
	constructor(message = "Unauthorized access") {
		super(message, StatusCodes.ACCESS_DENIED);
	}
}

export class BadRequestError extends AppError {
	constructor(message = "Bad request") {
		super(message, StatusCodes.BAD_REQUEST);
	}
}