package com.healthymedia

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * BroadcastReceiver that restarts the MonitoringService after device reboot.
 *
 * Listens for android.intent.action.BOOT_COMPLETED (declared in the manifest).
 * Only restarts the service if a prior config was persisted to SharedPreferences —
 * this prevents any start attempt on first install.
 *
 * Config keys (same as MonitoringService constants):
 *   healthy_media_monitoring_config → blocked_packages  (Set<String>)
 *   healthy_media_monitoring_config → polling_interval_ms (Long)
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val prefs = context.getSharedPreferences(
            MonitoringService.PREFS_NAME,
            Context.MODE_PRIVATE
        )

        // Only restart if a prior config exists (i.e. the service was running before reboot).
        val savedPackages = prefs.getStringSet(MonitoringService.PREFS_KEY_PACKAGES, null)
        if (savedPackages.isNullOrEmpty()) {
            // No prior config — do not start the service on first boot.
            return
        }

        val pollingInterval = prefs.getLong(MonitoringService.PREFS_KEY_INTERVAL, 500L)

        val serviceIntent = Intent(context, MonitoringService::class.java).apply {
            putStringArrayListExtra(
                MonitoringService.EXTRA_PACKAGES,
                ArrayList(savedPackages)
            )
            putExtra(MonitoringService.EXTRA_INTERVAL, pollingInterval)
        }

        context.startForegroundService(serviceIntent)
    }
}
