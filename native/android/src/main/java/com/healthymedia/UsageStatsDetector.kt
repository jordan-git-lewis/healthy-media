package com.healthymedia

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context

/**
 * ForegroundAppDetector implementation that uses UsageStatsManager to detect
 * which app is currently in the foreground.
 *
 * Queries a ~2-second window of usage events and finds the most recent
 * MOVE_TO_FOREGROUND event to determine the current foreground app.
 *
 * @param context Application context used to access the UsageStatsManager.
 * @param pollingWindowMs The time window (in ms) to query for usage events. Default: 2000.
 */
class UsageStatsDetector(
    private val context: Context,
    private val pollingWindowMs: Long = 2000L
) : ForegroundAppDetector {

    private val usageStatsManager: UsageStatsManager by lazy {
        context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    }

    /**
     * Returns the package name of the most recently foregrounded application
     * within the polling window, or null if none found.
     */
    override fun getCurrentForegroundApp(): String? {
        val endTime = System.currentTimeMillis()
        val beginTime = endTime - pollingWindowMs

        val usageEvents = usageStatsManager.queryEvents(beginTime, endTime)
        val event = UsageEvents.Event()

        var lastForegroundPackage: String? = null
        var lastEventTime = 0L

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND &&
                event.timeStamp > lastEventTime
            ) {
                lastForegroundPackage = event.packageName
                lastEventTime = event.timeStamp
            }
        }

        return lastForegroundPackage
    }

    /**
     * No-op: UsageStatsDetector is stateless; all work happens in getCurrentForegroundApp().
     */
    override fun start() {
        // Stateless — no background threads or callbacks to initialise.
    }

    /**
     * No-op: UsageStatsDetector holds no resources to release.
     */
    override fun stop() {
        // Stateless — nothing to clean up.
    }
}
