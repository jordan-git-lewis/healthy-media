package com.healthymedia

/**
 * Interface abstracting foreground app detection.
 *
 * Current implementation: UsageStatsDetector (UsageStatsManager polling).
 * Future implementation: AccessibilityServiceDetector (swap without changing MonitoringService).
 */
interface ForegroundAppDetector {

    /**
     * Returns the package name of the app currently in the foreground,
     * or null if it cannot be determined.
     */
    fun getCurrentForegroundApp(): String?

    /**
     * Called once when the service starts monitoring. Implementations may start
     * background threads or register system callbacks here.
     */
    fun start()

    /**
     * Called when the service stops. Implementations must clean up any resources
     * (threads, system callbacks) acquired in [start].
     */
    fun stop()
}
