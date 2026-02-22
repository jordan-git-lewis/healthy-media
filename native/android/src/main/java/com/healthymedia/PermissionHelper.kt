package com.healthymedia

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * React Native native module that checks and requests system-level permissions
 * required by Healthy Media's monitoring and overlay features.
 *
 * Accessible from JavaScript as NativeModules.PermissionHelper.
 *
 * Implements (TDD §4):
 *   hasUsageStatsPermission()         → Promise<boolean>
 *   requestUsageStatsPermission()     → Promise<boolean>
 *   hasOverlayPermission()            → Promise<boolean>
 *   requestOverlayPermission()        → Promise<boolean>
 *   isBatteryOptimizationEnabled()    → Promise<boolean>
 *   requestBatteryOptimizationExemption() → Promise<void>
 */
class PermissionHelper(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val REQUEST_CODE_USAGE_STATS = 1001
        private const val REQUEST_CODE_OVERLAY = 1002
    }

    override fun getName(): String = "PermissionHelper"

    // Activity result listeners — set when a permission request is in-flight.
    // Only one permission request can be active at a time.
    private var pendingUsageStatsPromise: Promise? = null
    private var pendingOverlayPromise: Promise? = null

    private val activityEventListener: ActivityEventListener =
        object : BaseActivityEventListener() {
            override fun onActivityResult(
                activity: android.app.Activity?,
                requestCode: Int,
                resultCode: Int,
                data: Intent?
            ) {
                when (requestCode) {
                    REQUEST_CODE_USAGE_STATS -> {
                        pendingUsageStatsPromise?.resolve(checkUsageStatsPermission())
                        pendingUsageStatsPromise = null
                    }
                    REQUEST_CODE_OVERLAY -> {
                        pendingOverlayPromise?.resolve(checkOverlayPermission())
                        pendingOverlayPromise = null
                    }
                }
            }
        }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    // ---------- Usage Stats Permission ----------------------------------------

    /**
     * Checks whether the app has been granted PACKAGE_USAGE_STATS access.
     * Uses AppOpsManager.checkOpNoThrow() with OPSTR_GET_USAGE_STATS.
     */
    @ReactMethod
    fun hasUsageStatsPermission(promise: Promise) {
        try {
            promise.resolve(checkUsageStatsPermission())
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Failed to check UsageStats permission: ${e.message}", e)
        }
    }

    /**
     * Navigates the user to the Usage Access settings screen.
     * Resolves with the permission state once the user returns to the app.
     * Rejects if the settings intent cannot be resolved.
     */
    @ReactMethod
    fun requestUsageStatsPermission(promise: Promise) {
        try {
            val activity = currentActivity
                ?: return promise.reject(
                    "PERMISSION_ERROR",
                    "Activity is not available to launch UsageStats settings"
                )
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            if (intent.resolveActivity(reactContext.packageManager) == null) {
                return promise.reject(
                    "PERMISSION_ERROR",
                    "Device does not support ACTION_USAGE_ACCESS_SETTINGS"
                )
            }
            pendingUsageStatsPromise = promise
            activity.startActivityForResult(intent, REQUEST_CODE_USAGE_STATS)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Failed to request UsageStats permission: ${e.message}", e)
        }
    }

    // ---------- Overlay Permission --------------------------------------------

    /**
     * Checks whether the app can draw over other apps (SYSTEM_ALERT_WINDOW).
     * Uses Settings.canDrawOverlays(context).
     */
    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        try {
            promise.resolve(checkOverlayPermission())
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Failed to check overlay permission: ${e.message}", e)
        }
    }

    /**
     * Navigates the user to the Manage Overlay Permission settings screen.
     * Resolves with the permission state once the user returns to the app.
     * Rejects if the settings intent cannot be resolved.
     */
    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            val activity = currentActivity
                ?: return promise.reject(
                    "PERMISSION_ERROR",
                    "Activity is not available to launch overlay settings"
                )
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactContext.packageName}")
            )
            if (intent.resolveActivity(reactContext.packageManager) == null) {
                return promise.reject(
                    "PERMISSION_ERROR",
                    "Device does not support ACTION_MANAGE_OVERLAY_PERMISSION"
                )
            }
            pendingOverlayPromise = promise
            activity.startActivityForResult(intent, REQUEST_CODE_OVERLAY)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Failed to request overlay permission: ${e.message}", e)
        }
    }

    // ---------- Battery Optimization -----------------------------------------

    /**
     * Returns true when battery optimization IS enabled for this app
     * (i.e. the app is NOT on the battery optimization whitelist).
     *
     * Note: PowerManager.isIgnoringBatteryOptimizations() returns true when
     * the app IS exempt (NOT optimized), so we invert the result.
     */
    @ReactMethod
    fun isBatteryOptimizationEnabled(promise: Promise) {
        try {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            val packageName = reactContext.packageName
            // isIgnoringBatteryOptimizations returns true when EXEMPT (not optimized)
            val isExempt = pm.isIgnoringBatteryOptimizations(packageName)
            promise.resolve(!isExempt)
        } catch (e: Exception) {
            promise.reject(
                "PERMISSION_ERROR",
                "Failed to check battery optimization state: ${e.message}",
                e
            )
        }
    }

    /**
     * Launches the system dialog that requests the user to exempt this app from
     * battery optimization (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).
     * Rejects if the intent cannot be resolved on this device.
     */
    @ReactMethod
    fun requestBatteryOptimizationExemption(promise: Promise) {
        try {
            val activity = currentActivity
                ?: return promise.reject(
                    "PERMISSION_ERROR",
                    "Activity is not available to launch battery optimization settings"
                )
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${reactContext.packageName}")
            }
            if (intent.resolveActivity(reactContext.packageManager) == null) {
                return promise.reject(
                    "PERMISSION_ERROR",
                    "Device does not support ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"
                )
            }
            activity.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(
                "PERMISSION_ERROR",
                "Failed to request battery optimization exemption: ${e.message}",
                e
            )
        }
    }

    // ---------- Private helpers -----------------------------------------------

    private fun checkUsageStatsPermission(): Boolean {
        val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            reactContext.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun checkOverlayPermission(): Boolean {
        return Settings.canDrawOverlays(reactContext)
    }
}
