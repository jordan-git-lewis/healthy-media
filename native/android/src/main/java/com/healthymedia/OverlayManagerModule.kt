package com.healthymedia

import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

/**
 * React Native native module that exposes OverlayManager to JavaScript.
 *
 * Accessible from JavaScript as NativeModules.OverlayManagerModule.
 *
 * Methods:
 *   showBlockingOverlay(appName, packageName, taskProgressJson, timeRemainingJson, enforcementLevel) → Promise<void>
 *   dismissBlockingOverlay() → Promise<void>
 */
class OverlayManagerModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "OverlayManagerModule"

    /**
     * Shows the blocking overlay using the provided configuration.
     *
     * @param appName          Display name of the blocked app.
     * @param packageName      Package name of the blocked app.
     * @param taskProgressJson JSON string of { completed, total, threshold } or null.
     * @param timeRemainingJson JSON string of { minutes } or null.
     * @param enforcementLevel "hard_block" or "soft_warning".
     */
    @ReactMethod
    fun showBlockingOverlay(
        appName: String,
        packageName: String,
        taskProgressJson: String?,
        timeRemainingJson: String?,
        enforcementLevel: String,
        promise: Promise
    ) {
        try {
            if (!Settings.canDrawOverlays(reactContext)) {
                promise.reject(
                    "PERMISSION_ERROR",
                    "SYSTEM_ALERT_WINDOW permission is required to show the blocking overlay"
                )
                return
            }

            val taskProgress = taskProgressJson?.let {
                val json = JSONObject(it)
                OverlayConfig.TaskProgress(
                    completed = json.getInt("completed"),
                    total = json.getInt("total"),
                    threshold = json.getInt("threshold")
                )
            }

            val timeRemaining = timeRemainingJson?.let {
                val json = JSONObject(it)
                OverlayConfig.TimeRemaining(minutes = json.getInt("minutes"))
            }

            val config = OverlayConfig(
                appName = appName,
                packageName = packageName,
                taskProgress = taskProgress,
                timeRemaining = timeRemaining,
                enforcementLevel = enforcementLevel
            )

            OverlayManager.show(reactContext, config, onOverrideConfirmed = { pkg, name ->
                emitOverrideConfirmed(pkg, name)
            })

            promise.resolve(null)
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_ERROR", e.message, e)
        } catch (e: Exception) {
            promise.reject("NATIVE_BRIDGE_ERROR", "Failed to show overlay: ${e.message}", e)
        }
    }

    /**
     * Dismisses the currently-displayed blocking overlay.
     */
    @ReactMethod
    fun dismissBlockingOverlay(promise: Promise) {
        try {
            OverlayManager.dismiss()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("NATIVE_BRIDGE_ERROR", "Failed to dismiss overlay: ${e.message}", e)
        }
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private fun emitOverrideConfirmed(packageName: String, appName: String) {
        try {
            val timestamp = java.time.Instant.now().toString()
            val params = com.facebook.react.bridge.Arguments.createMap().apply {
                putString("packageName", packageName)
                putString("appName", appName)
                putString("timestamp", timestamp)
            }
            reactContext
                .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onOverrideConfirmed", params)
        } catch (_: Exception) {
            // Best-effort.
        }
    }
}
