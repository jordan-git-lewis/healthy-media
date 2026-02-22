package com.healthymedia

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * React Native native module for OEM-specific battery optimization settings.
 *
 * Accessible from JavaScript as NativeModules.BatteryOptimizationHelper.
 *
 * Different Android OEMs add proprietary battery management systems on top of
 * the standard Android battery optimization APIs. This module detects the device
 * manufacturer and navigates to the correct OEM-specific settings screen so users
 * can whitelist the Healthy Media app.
 *
 * Implements (TDD §4):
 *   getDeviceManufacturer() → string   (synchronous)
 *   openOEMPowerSettings()  → Promise<boolean>
 *
 * Note: For a JS-side Notifee fallback when OEM settings cannot be found,
 * see src/native-bridge/native-bridge.ts.
 *
 * Registered in HealthyMediaPackage.kt.
 */
class BatteryOptimizationHelper(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BatteryOptimizationHelper"

    /**
     * OEM-specific power / auto-start settings activity intents.
     * Key: lowercase manufacturer string (matches Build.MANUFACTURER.lowercase()).
     * Value: Pair(packageName, activityClassName)
     */
    private val oemIntents: Map<String, Pair<String, String>> = mapOf(
        "xiaomi" to Pair(
            "com.miui.securitycenter",
            "com.miui.securitycenter.AutoStartManagementActivity"
        ),
        "samsung" to Pair(
            "com.samsung.android.lool",
            "com.samsung.android.lool.activity.SleepingAppsActivity"
        ),
        "huawei" to Pair(
            "com.huawei.systemmanager",
            "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
        ),
        "oneplus" to Pair(
            "com.oneplus.security",
            "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"
        ),
        "oppo" to Pair(
            "com.coloros.safecenter",
            "com.coloros.safecenter.startupapp.StartupAppListActivity"
        ),
    )

    /**
     * Returns the device manufacturer string synchronously.
     * Normalizes to original casing (as provided by Build.MANUFACTURER).
     *
     * Note: @ReactMethod(isBlockingSynchronousMethod = true) is used for
     * synchronous access from the JS bridge.
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getDeviceManufacturer(): String {
        return Build.MANUFACTURER
    }

    /**
     * Attempts to open the OEM-specific battery / auto-start settings screen.
     *
     * Resolution order:
     *   1. Normalize Build.MANUFACTURER to lowercase.
     *   2. Look up the OEM intent in the mapping table.
     *   3. Verify the intent resolves to an installed activity.
     *   4. Launch the activity.
     *   5. Resolve with true on success, false if no OEM mapping or activity found.
     *
     * @returns Promise<Boolean> — true if OEM settings were opened, false otherwise.
     */
    @ReactMethod
    fun openOEMPowerSettings(promise: Promise) {
        try {
            val manufacturer = Build.MANUFACTURER.lowercase()
            val oemEntry = oemIntents[manufacturer]

            if (oemEntry == null) {
                // No OEM mapping for this manufacturer
                promise.resolve(false)
                return
            }

            val (packageName, activityClass) = oemEntry
            val intent = Intent().apply {
                setClassName(packageName, activityClass)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            // Verify the activity exists before attempting to launch
            if (intent.resolveActivity(reactContext.packageManager) == null) {
                promise.resolve(false)
                return
            }

            val activity = currentActivity
            if (activity != null) {
                activity.startActivity(intent)
            } else {
                // Fall back to application context with FLAG_ACTIVITY_NEW_TASK
                reactContext.startActivity(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            // Unexpected error — resolve false rather than reject to let caller
            // handle gracefully via the JS-side Notifee fallback.
            promise.resolve(false)
        }
    }
}
