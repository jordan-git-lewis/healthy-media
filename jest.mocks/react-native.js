/**
 * Minimal react-native shim for Jest running in the Node test environment.
 *
 * These tests exercise pure business logic and native-bridge contracts via
 * jest.mock(). They do not need a real React Native runtime. This shim
 * provides just enough surface area to satisfy module-level initialisation
 * in src/native-bridge/native-bridge.ts and src/native-bridge/native-events.ts
 * without throwing "Invariant Violation: __fbBatchedBridgeConfig is not set".
 */

'use strict';

const NativeModules = {};

const NativeEventEmitter = jest.fn().mockImplementation(() => ({
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeAllListeners: jest.fn(),
}));

module.exports = {
  NativeModules,
  NativeEventEmitter,
};
