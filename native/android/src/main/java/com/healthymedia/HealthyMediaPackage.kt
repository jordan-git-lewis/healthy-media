package com.healthymedia

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Native package that registers all Healthy Media native modules.
 *
 * Module registration follows the sequential build order defined in the
 * native bridge implementation plan (TDD §4):
 *   1. AppScannerModule   — queries installed user apps
 *   2. PermissionHelper   — UsageStats, Overlay, Battery permission checks/requests
 *   3. BatteryOptimizationHelper — OEM battery settings detection and navigation
 */
class HealthyMediaPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            AppScannerModule(reactContext),
            PermissionHelper(reactContext),
            BatteryOptimizationHelper(reactContext),
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
