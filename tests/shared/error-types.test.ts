import {
  DatabaseError,
  ValidationError,
  PermissionError,
  NativeBridgeError,
} from '../../src/shared/error-types';

describe('error-types', () => {
  describe('DatabaseError', () => {
    it('extends Error with correct code and name', () => {
      const error = new DatabaseError('db failed');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('db failed');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.name).toBe('DatabaseError');
    });

    it('accepts a cause option', () => {
      const cause = new Error('root cause');
      const error = new DatabaseError('db failed', { cause });
      expect(error.cause).toBe(cause);
    });
  });

  describe('ValidationError', () => {
    it('extends Error with correct code and name', () => {
      const error = new ValidationError('invalid input');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('accepts a cause option', () => {
      const cause = new Error('root cause');
      const error = new ValidationError('invalid input', { cause });
      expect(error.cause).toBe(cause);
    });
  });

  describe('PermissionError', () => {
    it('extends Error with correct code and name', () => {
      const error = new PermissionError('access denied');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('access denied');
      expect(error.code).toBe('PERMISSION_ERROR');
      expect(error.name).toBe('PermissionError');
    });

    it('accepts a cause option', () => {
      const cause = new Error('root cause');
      const error = new PermissionError('access denied', { cause });
      expect(error.cause).toBe(cause);
    });
  });

  describe('NativeBridgeError', () => {
    it('extends Error with correct code and name', () => {
      const error = new NativeBridgeError('bridge failed');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('bridge failed');
      expect(error.code).toBe('NATIVE_BRIDGE_ERROR');
      expect(error.name).toBe('NativeBridgeError');
    });

    it('accepts a cause option', () => {
      const cause = new Error('root cause');
      const error = new NativeBridgeError('bridge failed', { cause });
      expect(error.cause).toBe(cause);
    });
  });
});
