/**
 * Jest global setup for React Native test environment.
 *
 * Defines globals that react-native expects to be present when running under
 * Node (e.g. __DEV__, which Metro normally injects at build time).
 */

// react-native reads __DEV__ at module evaluation time; without it the module
// throws "ReferenceError: __DEV__ is not defined".
global.__DEV__ = true;
