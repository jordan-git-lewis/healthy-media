package com.healthymedia

import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import java.io.File
import java.io.FileOutputStream

/**
 * React Native native module that scans installed user applications.
 *
 * Accessible from JavaScript as NativeModules.AppScannerModule.
 *
 * Implements:
 *   scanInstalledApps() → Promise<InstalledApp[]>
 *
 * where InstalledApp = { packageName, appName, iconUri }
 *
 * Only non-system apps are returned. Icons are cached as PNGs under
 * the application's cache directory and returned as file:// URIs.
 */
class AppScannerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppScannerModule"

    /**
     * Returns all user-installed apps with package name, display label, and
     * a file:// URI pointing to the cached app icon.
     *
     * Throws NativeBridgeError (via promise rejection) if PackageManager fails.
     */
    @ReactMethod
    fun scanInstalledApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val installedApps = pm.getInstalledApplications(0)

            val result: WritableArray = Arguments.createArray()

            for (appInfo in installedApps) {
                // Filter out system apps — only include user-installed apps
                if ((appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0) continue

                val packageName = appInfo.packageName
                val appName = pm.getApplicationLabel(appInfo).toString()
                val iconUri = cacheAppIcon(packageName, pm.getApplicationIcon(appInfo))

                val appMap: WritableMap = Arguments.createMap()
                appMap.putString("packageName", packageName)
                appMap.putString("appName", appName)
                appMap.putString("iconUri", iconUri)

                result.pushMap(appMap)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("NATIVE_BRIDGE_ERROR", "PackageManager query failed: ${e.message}", e)
        }
    }

    /**
     * Converts a Drawable icon to a Bitmap, writes it as PNG to the app's
     * cache directory, and returns a file:// URI string.
     */
    private fun cacheAppIcon(packageName: String, drawable: Drawable): String {
        val bitmap = drawableToBitmap(drawable)
        val cacheDir = reactContext.cacheDir
        val iconDir = File(cacheDir, "app_icons")
        iconDir.mkdirs()
        val iconFile = File(iconDir, "$packageName.png")
        FileOutputStream(iconFile).use { out ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        }
        return "file://${iconFile.absolutePath}"
    }

    /**
     * Converts any Drawable to a Bitmap. Handles BitmapDrawable directly to
     * avoid unnecessary redraws.
     */
    private fun drawableToBitmap(drawable: Drawable): Bitmap {
        if (drawable is BitmapDrawable && drawable.bitmap != null) {
            return drawable.bitmap
        }
        val width = drawable.intrinsicWidth.takeIf { it > 0 } ?: 96
        val height = drawable.intrinsicHeight.takeIf { it > 0 } ?: 96
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return bitmap
    }
}
