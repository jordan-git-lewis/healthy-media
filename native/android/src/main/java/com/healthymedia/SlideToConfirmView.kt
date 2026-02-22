package com.healthymedia

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View

/**
 * Custom view that implements a left-to-right slide gesture for override confirmation.
 *
 * Visual elements:
 *   - A rounded track bar (full width)
 *   - A draggable thumb that the user slides right to confirm
 *   - Thumb changes colour as progress increases
 *
 * Behaviour:
 *   hard_block  → requires slide to reach ≥95% of track width to confirm
 *   soft_warning → requires slide to reach ≥40% of track width to confirm (lower friction)
 *
 * On completion, [onConfirmed] is called exactly once.
 */
class SlideToConfirmView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    // ---------------------------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------------------------

    /** Slide completion threshold (0.0 – 1.0). Set based on enforcement level. */
    var completionThreshold: Float = 0.95f

    /** Called once when the user successfully slides to the threshold. */
    var onConfirmed: (() -> Unit)? = null

    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------

    private var thumbX: Float = 0f
    private var isDragging = false
    private var hasConfirmed = false

    // ---------------------------------------------------------------------------
    // Paint
    // ---------------------------------------------------------------------------

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#44FFFFFF")
        style = Paint.Style.FILL
    }

    private val thumbPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.FILL
    }

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#88FFFFFF")
        textSize = 36f
        textAlign = Paint.Align.CENTER
    }

    // ---------------------------------------------------------------------------
    // Draw
    // ---------------------------------------------------------------------------

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        val radius = h / 2f
        val thumbRadius = radius - 8f
        val thumbCenterX = radius + thumbX.coerceIn(0f, w - radius * 2)

        // Track
        val trackRect = RectF(0f, 0f, w, h)
        canvas.drawRoundRect(trackRect, radius, radius, trackPaint)

        // Thumb colour: interpolate from white → green as progress increases
        val progress = (thumbX / (w - radius * 2f)).coerceIn(0f, 1f)
        val green = (progress * 200).toInt()
        thumbPaint.color = Color.rgb(255 - green, 255, 255 - green)
        canvas.drawCircle(thumbCenterX, h / 2f, thumbRadius, thumbPaint)

        // Arrow hint text inside thumb
        if (!hasConfirmed) {
            canvas.drawText("→", thumbCenterX, h / 2f + textPaint.textSize / 3f, textPaint)
        }
    }

    // ---------------------------------------------------------------------------
    // Touch
    // ---------------------------------------------------------------------------

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (hasConfirmed) return false
        val w = width.toFloat()
        val h = height.toFloat()
        val radius = h / 2f
        val maxThumbX = w - radius * 2f

        return when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                val touchInThumb = event.x < radius * 2 + thumbX && event.x > thumbX
                if (touchInThumb) {
                    isDragging = true
                    true
                } else {
                    false
                }
            }
            MotionEvent.ACTION_MOVE -> {
                if (isDragging) {
                    thumbX = (event.x - radius).coerceIn(0f, maxThumbX)
                    invalidate()
                    // Check completion
                    val progress = thumbX / maxThumbX
                    if (progress >= completionThreshold) {
                        confirm()
                    }
                    true
                } else {
                    false
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (isDragging) {
                    isDragging = false
                    if (!hasConfirmed) {
                        // Spring back to start
                        thumbX = 0f
                        invalidate()
                    }
                }
                true
            }
            else -> false
        }
    }

    // ---------------------------------------------------------------------------
    // Confirm
    // ---------------------------------------------------------------------------

    private fun confirm() {
        hasConfirmed = true
        thumbX = width.toFloat() - height.toFloat() // snap to end
        invalidate()
        onConfirmed?.invoke()
    }

    /**
     * Programmatically trigger confirmation (used by soft_warning tap-to-proceed).
     */
    fun triggerConfirm() {
        if (!hasConfirmed) confirm()
    }

    /**
     * Reset the view to initial state (e.g. after overlay is dismissed).
     */
    fun reset() {
        hasConfirmed = false
        thumbX = 0f
        isDragging = false
        invalidate()
    }
}
