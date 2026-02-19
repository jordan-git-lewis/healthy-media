# Problem Statement: Healthy Media

## Metadata
- **Author:** Jordan
- **Date:** 2026-02-19
- **Type:** CREATE (Greenfield)
- **Status:** Draft

## 1. The Problem

People struggle to self-regulate their social media usage, especially during periods that require sustained focus — work hours, study sessions, or personal projects. Existing solutions are either too rigid (full device lockdowns that frustrate users) or too weak (easily dismissed screen-time notifications). There is no middle ground that ties app access to meaningful task completion while giving users control over enforcement severity.

**Who experiences it:** Anyone who finds themselves reflexively opening social media when they should be focused — students, professionals, remote workers, and general consumers.

**Cost of not solving:** Lost productivity, guilt cycles, and an inability to build sustainable focus habits. Users continue relying on willpower alone, which is demonstrably unreliable.

**Evidence:** Personal experience with social media distraction; widespread adoption of screen-time tools (Apple Screen Time, Digital Wellbeing) indicates market demand, but those tools lack task-based unlocking and flexible enforcement.

## 2. Success Criteria

**Quantitative:**
- App successfully scans and lists all installed apps on an Android device
- Blocking/warning overlays trigger reliably for selected apps
- Tasks (both time-based and goal-based) correctly gate app access
- SQLite stores and retrieves user data (app selections, tasks, usage history, daily goal completion) without data loss
- Habit calendar accurately reflects daily success status with correct color coding (full success / partial success / not met)
- Success threshold configuration works correctly (e.g., "3 of 5" triggers success when 3 tasks are completed)
- Override events are logged accurately and reflected in daily detail stats

**Qualitative:**
- App feels helpful, not punishing — users should feel rewarded for completing tasks, not trapped
- Blocking enforcement is transparent — users always understand why an app is restricted and how to unlock it
- Onboarding is intuitive — a new user can configure their first blocked apps and tasks within 2 minutes
- Architecture supports future Play Store release without major rewrites

## 3. Scope

**MVP (Must-Have):**
- Scan installed apps and present them in a selectable list (checkboxes)
- Tiered enforcement per app: hard block, soft warning, or no restriction
- Blocking overlay UX:
  - Blocked apps appear greyed out on the user's device
  - Tapping a greyed-out app triggers a popup showing: task completion progress (e.g., "3 of 5 tasks done") or time remaining in a scheduled block (e.g., "1h 23m left")
  - Popup asks "Do you want to allow usage of this app?" with a slide-to-confirm gesture (swipe left-to-right) to prevent accidental unlocks
  - If user confirms, the app opens normally. After exiting, it returns to greyed-out state until all tasks/time conditions are met
  - Users are not fully prevented from using apps — they can override at their own pace
- Time-based task type: block selected apps during a defined schedule (e.g., 8am-4pm)
- Goal-based task type: block selected apps until a user-defined task is marked complete
- Ability to change enforcement level or disable blocking at any time
- Local data persistence via SQLite (app selections, tasks, enforcement settings, basic usage tracking)
- Onboarding survey: why are you using this app? (student/studying, work, general reduction)
- Habit tracking calendar with color-coded days:
  - **Full success** (e.g., green): user met their goals without overriding any blocked apps
  - **Partial success** (e.g., yellow/amber): user met their goals but used blocked apps a few times via override
  - **Not met** (e.g., red or unmarked): goals were not completed
  - Tapping a day opens a detail view showing: tasks completed, number of times blocked apps were overridden, and time-based goal adherence
- Flexible success criteria:
  - Time-based goals: binary pass/fail (respected the scheduled block or didn't)
  - Goal-based tasks: user-defined completion threshold (e.g., "complete at least 3 of 5 tasks" to count as a successful day). Allows partial credit — spending some time on a task still counts if the user configures it that way
- Override tracking: when a user bypasses a block via slide-to-confirm, the event is logged (app name, timestamp) for calendar stats — not to punish, but to help users see their progress over time

**Excluded (Explicitly Out of Scope for MVP):**
- User accounts / authentication
- Backend server (FastAPI is in the tech stack but deferred)
- Cloud sync or cross-device support
- iOS support
- Play Store listing or purchase flow
- Social features (leaderboards, accountability partners)
- Detailed analytics dashboards
- Automated task detection (e.g., GPS-based "arrived at gym")

**Future Enhancements:**
- FastAPI backend for server-based features (cloud backup, analytics, personalization)
- iOS port (subject to platform API constraints)
- One-time purchase model via Play Store
- Onboarding survey data feeding into personalized blocking suggestions
- Usage analytics and trend reports
- Recurring task templates
- Escalating enforcement mode (warning → hard block after repeated dismissals)

## 4. Constraints

- **Technical:** Android first. Must use `UsageStatsManager`, `AccessibilityService`, and/or `SYSTEM_ALERT_WINDOW` for blocking. Expo Go is UI development only — native features require `expo-dev-client` builds.
- **Tech Stack:** React Native + TypeScript (frontend), Python/FastAPI (backend, deferred), SQLite (local storage), Expo managed workflow with dev-client.
- **Budget:** Free/open-source tooling only for MVP. No paid services.
- **Timeline:** No fixed deadline. Quality and architecture soundness over speed.
- **Compliance:** No user data leaves the device in MVP. Future server features will need to consider privacy regulations (GDPR, etc.) when implemented.

## 5. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Android permission complexity (accessibility services, overlay permissions) — difficult to get working reliably across Android versions and OEMs | High | High | Research permission patterns early. Build a minimal proof-of-concept for blocking before full UI development. Test across multiple Android versions. |
| UX feels punishing rather than motivating — users disable the app instead of engaging with it | Medium | High | Tiered enforcement gives users control. "Reward" framing (unlock access) rather than "punishment" framing (block access). User can always change or turn off restrictions. |
| Expo managed workflow limitations with native modules | Medium | Medium | Use `expo-dev-client` for native features. Evaluate whether ejecting to bare workflow is needed early. |
| Scope creep — feature list grows beyond achievable MVP | Medium | Medium | This problem statement and the subsequent PRD define a clear MVP boundary. Defer all server-side features. |
| OEM-specific battery optimization kills background service | High | High | See detailed mitigation in Section 5a below. |

### 5a. OEM Background Service Killing — Detailed Mitigation

Android OEMs aggressively kill background services to improve battery benchmarks. Since Healthy Media's core blocking service must run continuously, this is a first-class concern.

**Severity by OEM** (per dontkillmyapp.com, scale 0-5):

| OEM | Severity | Kill Mechanism | Key User Action Required |
|-----|----------|---------------|--------------------------|
| Huawei/Honor | 5/5 | "PowerGenie" service actively kills background apps even with optimization disabled | Battery > App Launch > disable "Manage automatically" > enable all three toggles |
| Xiaomi (MIUI) | 5/5 | Autostart disabled by default for all third-party apps | Security Center > Autostart > enable + lock app in recents |
| OnePlus | 5/5 | Battery optimization settings randomly revert after updates | Battery Optimization > Don't optimize (must re-check after updates) |
| Samsung | 5/5 | "Put unused apps to sleep" re-sleeps apps after ~3 days | Battery > Background usage limits > disable auto-sleep + add to "won't be put to sleep" list |
| Oppo/Realme/Vivo | 3/5 | Autostart managers, "App Quick Freeze" | Enable autostart + disable quick freeze |
| Stock Android/Pixel/Nokia | 0/5 | Standard Doze behavior — no issues | Standard battery optimization exemption |

**Programmatic mitigations (what the app handles automatically):**
1. **Foreground service with persistent notification** — via `react-native-background-actions`. A visible notification significantly reduces the chance of being killed
2. **Run blocking service in a separate process** — dontkillmyapp.com's top recommendation. OEM task killers are less likely to target isolated processes
3. **Request battery optimization exemption** — standard Android API (`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`). Google Play allows this for app-blocking/focus apps
4. **Detect OEM and open correct settings screen** — `@notifee/react-native` maintains an internal database of OEM-specific intents via `getPowerManagerInfo()` and `openPowerManagerSettings()`. Alternatively, `expo-device` (`Device.manufacturer`) can be used with manual intent mapping
5. **Periodic re-check** — verify battery optimization exemption is still active (especially for OnePlus/Samsung which silently revert) and re-prompt if needed

**User-facing mitigations (onboarding setup wizard):**
1. Detect device manufacturer on first launch
2. Check battery optimization status
3. Walk the user through their OEM-specific steps with clear instructions
4. Explain *why* these steps are needed (framing: "so the app can protect your focus time")
5. Periodically verify settings haven't reverted and gently re-prompt if they have

**Key libraries for this mitigation:**
- `react-native-background-actions` — foreground service for the blocking monitor
- `@notifee/react-native` — battery optimization detection + OEM-specific settings navigation
- `expo-device` — manufacturer detection

**Note:** All of these require `expo-dev-client` builds, not Expo Go — consistent with the existing technical constraint.

## 6. Dependencies

**External Systems:**
- Android UsageStats API — for detecting which app is in the foreground
- Android AccessibilityService or SYSTEM_ALERT_WINDOW — for overlay/blocking behavior
- Expo SDK and expo-dev-client — for React Native build tooling
- SQLite (via expo-sqlite) — for local data persistence
- `react-native-background-actions` — foreground service for persistent background blocking monitor
- `@notifee/react-native` — battery optimization detection and OEM-specific settings navigation
- `expo-device` — device manufacturer detection for OEM-specific onboarding guidance

**Internal Systems:**
- None for MVP (FastAPI backend is deferred)

## 7. Visual Assets

**Required:**
- Architecture diagram: React Native app → native modules → Android APIs
- UI flow: Onboarding → App selection → Task creation → Blocking in action → Task completion → Unlock
- Wireframes for key screens: app list, task creation, blocking overlay, reward/unlock state, habit calendar view

**Location:** `docs/visuals/`

## 8. Next Steps

1. Review this problem statement
2. Validate feasibility of Android blocking approach (proof-of-concept for overlay/accessibility service with expo-dev-client)
3. Proceed to `process/create-prd.md` to formalize functional requirements
