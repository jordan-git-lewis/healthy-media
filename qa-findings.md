# QA Findings - Healthy Media

<!-- Append-only log. Do not edit existing entries. -->
---

### F-001: Unescaped quote chars in JSX - oem-setup.tsx lines 98:19 and 98:33
- **Layer:** BUILD
- **Severity:** cosmetic
- **Domain:** onboarding/ui
- **Observed:** ESLint react/no-unescaped-entities errors at app/(onboarding)/oem-setup.tsx lines 98:19 and 98:33 - literal double-quote characters in JSX text.
- **Expected:** JSX text with double quotes must use HTML entities per eslint-plugin-react.
- **Root cause:** Developer used raw double-quote chars in JSX text rather than HTML entities.
- **Cluster:** C-003
- **Issue:** #50
- **Status:** open
---

### F-002: Missing useEffect dependencies - currentMonth, currentYear, loadMonth, refreshToday
- **Layer:** BUILD
- **Severity:** substantive
- **Domain:** calendar/ui
- **Observed:** ESLint react-hooks/exhaustive-deps warning at app/(tabs)/calendar.tsx line 30:6 - useEffect missing deps: currentMonth, currentYear, loadMonth, refreshToday.
- **Expected:** All values referenced inside useEffect must be in the dependency array. Missing deps cause stale closures per React hooks rules.
- **Root cause:** Developer omitted reactive values from useEffect dependency array, leaving stale state risk.
- **Cluster:** C-004
- **Issue:** #47
- **Status:** open
---

### F-003: Missing useCallback dependency - refreshToday at calendar.tsx line 36
- **Layer:** BUILD
- **Severity:** substantive
- **Domain:** calendar/ui
- **Observed:** ESLint react-hooks/exhaustive-deps warning at app/(tabs)/calendar.tsx line 36:8 - useCallback missing dep: refreshToday.
- **Expected:** useCallback must declare all referenced values in its dependency array to avoid stale closures.
- **Root cause:** Same pattern as F-002 - incomplete dependency array in calendar screen hooks.
- **Cluster:** C-004
- **Issue:** #47
- **Status:** open
---

### F-004: Unused variable router in app/calendar/[date].tsx line 12
- **Layer:** BUILD
- **Severity:** cosmetic
- **Domain:** calendar/ui
- **Observed:** ESLint no-unused-vars error at app/calendar/[date].tsx line 12:32 - router imported but never used.
- **Expected:** No unused variable declarations; dead code should be removed.
- **Root cause:** router imported for planned navigation but the call was never implemented or was removed.
- **Cluster:** C-001
- **Issue:** #48
- **Status:** open
---

### F-005: Unused variable dailyRecords in src/calendar-tracking/calendar-store.ts line 68
- **Layer:** BUILD
- **Severity:** cosmetic
- **Domain:** calendar-tracking/state
- **Observed:** ESLint no-unused-vars error at src/calendar-tracking/calendar-store.ts line 68:44 - dailyRecords assigned but never used.
- **Expected:** No unused assignments in production source files.
- **Root cause:** Variable destructured from state but the value is never consumed.
- **Cluster:** C-001
- **Issue:** #48
- **Status:** open
---

### F-006: Unused import generateId in src/calendar-tracking/daily-record-service.ts line 9
- **Layer:** BUILD
- **Severity:** cosmetic
- **Domain:** calendar-tracking/service
- **Observed:** ESLint no-unused-vars error at src/calendar-tracking/daily-record-service.ts line 9:10 - generateId imported but never used.
- **Expected:** No unused imports in production source files.
- **Root cause:** Import left over from earlier implementation; function no longer called in this file.
- **Cluster:** C-001
- **Issue:** #48
- **Status:** open
---

### F-007: Explicit any type in tests/calendar-tracking/calendar-store.test.ts line 25
- **Layer:** BUILD
- **Severity:** cosmetic
- **Domain:** calendar-tracking/tests
- **Observed:** ESLint no-explicit-any error at tests/calendar-tracking/calendar-store.test.ts line 25:22.
- **Expected:** Explicit any replaced with proper types or unknown per TypeScript strict-mode conventions.
- **Root cause:** Test author used any as a quick type escape rather than defining a precise mock type.
- **Cluster:** C-002
- **Issue:** #49
- **Status:** open
---

### F-008: Unused variable result in tests/calendar-tracking/daily-record-service.test.ts line 211
- **Layer:** BUILD
- **Severity:** cosmetic
- **Domain:** calendar-tracking/tests
- **Observed:** ESLint no-unused-vars error at tests/calendar-tracking/daily-record-service.test.ts line 211:11 - result assigned but never used.
- **Expected:** No unused variables in test files; assignment removed or value asserted.
- **Root cause:** Test result captured in variable but assertion was forgotten or removed.
- **Cluster:** C-001
- **Issue:** #48
- **Status:** open
---

### F-009: Unused import DayDetail and explicit any in tests/calendar-tracking/day-detail.test.ts
- **Layer:** BUILD
- **Severity:** cosmetic
- **Domain:** calendar-tracking/tests
- **Observed:** ESLint errors at tests/calendar-tracking/day-detail.test.ts - line 1:15 DayDetail defined but never used; line 31:22 any type used explicitly.
- **Expected:** No unused imports; no explicit any types.
- **Root cause:** DayDetail type import left over after test refactor; any used as type shortcut.
- **Cluster:** C-001 / C-002 (both cosmetic)
- **Issue:** #48 / #49
- **Status:** open
---

### F-010: Explicit any type in tests/calendar-tracking/day-reset-integration.test.ts line 40
- **Layer:** BUILD
- **Severity:** cosmetic
- **Domain:** calendar-tracking/tests
- **Observed:** ESLint no-explicit-any error at tests/calendar-tracking/day-reset-integration.test.ts line 40:22.
- **Expected:** No explicit any in test files.
- **Root cause:** any used as type shortcut in mock setup.
- **Cluster:** C-002
- **Issue:** #49
- **Status:** open
---

### F-011: Unused variable mockUseBlockingStore in tests/onboarding/app-selection.test.ts line 23
- **Layer:** BUILD
- **Severity:** cosmetic
- **Domain:** onboarding/tests
- **Observed:** ESLint no-unused-vars error at tests/onboarding/app-selection.test.ts line 23:7 - mockUseBlockingStore assigned but never used.
- **Expected:** No unused mock variable assignments.
- **Root cause:** Mock variable created but never referenced in test assertions or setup.
- **Cluster:** C-001
- **Issue:** #48
- **Status:** open
---

### F-012: Jest cannot parse react-native ESM - tests/onboarding/permissions.test.ts suite fails to run
- **Layer:** BUILD
- **Severity:** substantive
- **Domain:** testing/config
- **Observed:** Suite fails with SyntaxError: Cannot use import statement outside a module. Import chain: permissions.test.ts -> src/native-bridge/index.ts -> src/native-bridge/native-bridge.ts -> react-native (node_modules). Jest ts-jest transforms .ts files but the default transformIgnorePatterns blocks node_modules, so react-native ESM is never transpiled.
- **Expected:** The test suite should run. react-native must be mocked at module level or included in Jests transformIgnorePatterns exclusion list.
- **Root cause:** jest.config.js uses testEnvironment:node + ts-jest without adding react-native to transformIgnorePatterns or a moduleNameMapper to intercept it before the Node runtime sees raw ESM.
- **Cluster:** C-005
- **Issue:** #46
- **Status:** open
---

### F-013: Jest cannot parse react-native ESM - tests/onboarding/oem-setup.test.ts suite fails to run
- **Layer:** BUILD
- **Severity:** substantive
- **Domain:** testing/config
- **Observed:** Suite fails with identical SyntaxError: Cannot use import statement outside a module via the same native-bridge -> react-native import chain.
- **Expected:** Test suite should run with react-native properly mocked or transpiled.
- **Root cause:** Same root cause as F-012 - Jest config missing react-native transform/mock configuration.
- **Cluster:** C-005
- **Issue:** #46
- **Status:** open
---

### F-014: Jest cannot parse react-native ESM - tests/app-blocking/blocking-store.test.ts suite fails to run
- **Layer:** BUILD
- **Severity:** substantive
- **Domain:** testing/config
- **Observed:** Suite fails with identical SyntaxError: Cannot use import statement outside a module. Chain: blocking-store.test.ts -> src/app-blocking/blocking-service.ts -> src/native-bridge/index.ts -> src/native-bridge/native-bridge.ts -> react-native. The jest.mock of blocking-service does not prevent the transitive react-native import from failing during module resolution.
- **Expected:** Test suite should run. The native-bridge import should be intercepted before reaching react-native.
- **Root cause:** Same root cause as F-012 - Jest config missing transform/mock configuration for react-native.
- **Cluster:** C-005
- **Issue:** #46
- **Status:** open

---
<!-- Cycle 2 re-check note: F-001 through F-010 and F-012 through F-014 resolved. F-011 remains the sole open finding. -->

### F-015: Config plugin TypeScript file not resolvable by Expo at runtime
- **Layer:** BOOT
- **Severity:** blocking
- **Domain:** build/config-plugin
- **Observed:** `npx expo start --android` crashes immediately with `PluginError: Failed to resolve plugin for module "./plugins/with-healthy-media"`. The file exists at `plugins/with-healthy-media.ts` but Expo's `@expo/config-plugins` resolver cannot execute TypeScript directly — it requires a compiled CommonJS `.js` file.
- **Expected:** Expo resolves the plugin, injects Android permissions and components, and dev server starts successfully (TDD §Config Plugin).
- **Root cause:** Agent A authored the plugin as a TypeScript ESM module (`export default`). Expo's plugin resolver calls `require()` on the path, which Node.js cannot handle for `.ts` files without a separate compilation step.
- **Cluster:** C-006
- **Issue:** pending
- **Status:** open

### F-016: expo-asset missing from package.json and node_modules
- **Layer:** BOOT
- **Severity:** blocking
- **Domain:** build/dependencies
- **Observed:** `npx expo start --android` fails with `Error: The required package expo-asset cannot be found`. `expo-asset` was absent from both `package.json` dependencies and `node_modules/`.
- **Expected:** `expo-asset` present and resolvable by `@expo/metro-config` (required at Metro bundler startup).
- **Root cause:** `expo-asset` is a required peer of `@expo/metro-config` but was never added to `package.json` during project scaffolding.
- **Cluster:** C-007
- **Issue:** pending
- **Status:** fixed
