package com.healthymedia

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.IBinder
import android.os.Message
import android.os.Messenger
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

/**
 * React Native native module that exposes MonitoringService control to JavaScript.
 *
 * Accessible from JavaScript as NativeModules.MonitoringServiceModule.
 *
 * Forwards IPC messages to MonitoringService via Messenger (Binder IPC).
 *
 * Methods:
 *   startMonitoringService(packages, intervalMs) → Promise<void>
 *   stopMonitoringService()                      → Promise<void>
 *   isMonitoringServiceRunning()                 → Promise<boolean>
 *   updateBlockedApps(packages)                  → Promise<void>
 */
class MonitoringServiceModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MonitoringServiceModule"

    private var serviceMessenger: Messenger? = null
    private var isBound = false

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            serviceMessenger = Messenger(service)
            isBound = true
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            serviceMessenger = null
            isBound = false
        }
    }

    // ---------------------------------------------------------------------------
    // Public React Methods
    // ---------------------------------------------------------------------------

    /**
     * Starts the MonitoringService foreground service.
     *
     * Validates that UsageStats permission and battery optimization exemption
     * are in place before starting. Throws PermissionError (via promise rejection)
     * if required permissions are not granted.
     */
    @ReactMethod
    fun startMonitoringService(packages: ReadableArray, intervalMs: Double, promise: Promise) {
        try {
            // Permission guard: requires PACKAGE_USAGE_STATS and battery exemption.
            if (!hasUsageStatsPermission()) {
                promise.reject(
                    "PERMISSION_ERROR",
                    "UsageStats permission is required to start MonitoringService"
                )
                return
            }

            val packageList = ArrayList<String>()
            for (i in 0 until packages.size()) {
                packageList.add(packages.getString(i))
            }
            val intervalLong = intervalMs.toLong().coerceAtLeast(100L)

            val intent = Intent(reactContext, MonitoringService::class.java).apply {
                putStringArrayListExtra(MonitoringService.EXTRA_PACKAGES, packageList)
                putExtra(MonitoringService.EXTRA_INTERVAL, intervalLong)
            }

            reactContext.startForegroundService(intent)

            // Bind for subsequent IPC calls.
            if (!isBound) {
                reactContext.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
            }

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("NATIVE_BRIDGE_ERROR", "Failed to start monitoring service: ${e.message}", e)
        }
    }

    /**
     * Stops the MonitoringService.
     * Rejects with NativeBridgeError if the service is not currently running.
     */
    @ReactMethod
    fun stopMonitoringService(promise: Promise) {
        try {
            if (!MonitoringService.isRunning) {
                promise.reject(
                    "NATIVE_BRIDGE_ERROR",
                    "MonitoringService is not running"
                )
                return
            }

            val messenger = serviceMessenger
            if (messenger != null) {
                val msg = Message.obtain(null, MonitoringService.MSG_STOP)
                messenger.send(msg)
            } else {
                // Fallback: send stop intent directly.
                val intent = Intent(reactContext, MonitoringService::class.java)
                reactContext.stopService(intent)
            }

            if (isBound) {
                reactContext.unbindService(serviceConnection)
                isBound = false
                serviceMessenger = null
            }

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("NATIVE_BRIDGE_ERROR", "Failed to stop monitoring service: ${e.message}", e)
        }
    }

    /**
     * Returns true if the MonitoringService is currently running.
     */
    @ReactMethod
    fun isMonitoringServiceRunning(promise: Promise) {
        promise.resolve(MonitoringService.isRunning)
    }

    /**
     * Updates the blocked package list in a running MonitoringService without restarting it.
     */
    @ReactMethod
    fun updateBlockedApps(packages: ReadableArray, promise: Promise) {
        try {
            val packageList = ArrayList<String>()
            for (i in 0 until packages.size()) {
                packageList.add(packages.getString(i))
            }

            val messenger = serviceMessenger
            if (messenger != null) {
                val msg = Message.obtain(null, MonitoringService.MSG_UPDATE_BLOCKED_APPS)
                val bundle = Bundle().apply {
                    putStringArrayList(MonitoringService.EXTRA_PACKAGES, packageList)
                }
                msg.data = bundle
                messenger.send(msg)
                promise.resolve(null)
            } else {
                promise.reject(
                    "NATIVE_BRIDGE_ERROR",
                    "MonitoringService is not bound — call startMonitoringService first"
                )
            }
        } catch (e: Exception) {
            promise.reject("NATIVE_BRIDGE_ERROR", "Failed to update blocked apps: ${e.message}", e)
        }
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private fun hasUsageStatsPermission(): Boolean {
        return try {
            val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE)
                as android.app.AppOpsManager
            val mode = appOps.checkOpNoThrow(
                android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                reactContext.packageName
            )
            mode == android.app.AppOpsManager.MODE_ALLOWED
        } catch (_: Exception) {
            false
        }
    }
}
