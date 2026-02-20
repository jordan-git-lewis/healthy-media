export class DatabaseError extends Error {
  readonly code = 'DATABASE_ERROR';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends Error {
  readonly code = 'PERMISSION_ERROR';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PermissionError';
  }
}

export class NativeBridgeError extends Error {
  readonly code = 'NATIVE_BRIDGE_ERROR';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NativeBridgeError';
  }
}
