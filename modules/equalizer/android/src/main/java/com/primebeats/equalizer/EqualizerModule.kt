package com.primebeats.equalizer

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Wraps Android's global audio effects so PrimeBeats can offer a graphic
 * equalizer + bass boost. Effects are attached to audio session 0 (the global
 * output mix), so they apply to the app's playback. Everything is best-effort:
 * on devices where global effects aren't permitted, the create call throws and
 * `isAvailable` reports false so the UI can degrade gracefully.
 */
class EqualizerModule : Module() {
  private var equalizer: Equalizer? = null
  private var bassBoost: BassBoost? = null
  private val lock = Any()

  private fun ensureEqualizer(): Equalizer? {
    synchronized(lock) {
      if (equalizer == null) {
        equalizer = try {
          // priority 0, session 0 = global output mix.
          Equalizer(0, 0)
        } catch (e: Throwable) {
          null
        }
      }
      return equalizer
    }
  }

  private fun ensureBassBoost(): BassBoost? {
    synchronized(lock) {
      if (bassBoost == null) {
        bassBoost = try {
          BassBoost(0, 0)
        } catch (e: Throwable) {
          null
        }
      }
      return bassBoost
    }
  }

  override fun definition() = ModuleDefinition {
    Name("Equalizer")

    Function("isAvailable") {
      ensureEqualizer() != null
    }

    Function("setEnabled") { enabled: Boolean ->
      try {
        ensureEqualizer()?.enabled = enabled
      } catch (e: Throwable) {
        // ignore — effect engine may reject toggling on some devices
      }
    }

    Function("getInfo") {
      val eq = ensureEqualizer()
      if (eq == null) {
        null
      } else {
        try {
          val numBands = eq.numberOfBands.toInt()
          val range = eq.bandLevelRange // ShortArray [min, max] in millibels
          val centerFreqs = ArrayList<Int>()
          for (i in 0 until numBands) {
            centerFreqs.add(eq.getCenterFreq(i.toShort()) / 1000) // mHz -> Hz
          }
          val presets = ArrayList<String>()
          val numPresets = eq.numberOfPresets.toInt()
          for (i in 0 until numPresets) {
            presets.add(eq.getPresetName(i.toShort()))
          }
          val bb = ensureBassBoost()
          mapOf(
            "numberOfBands" to numBands,
            "minLevel" to range[0].toInt(),
            "maxLevel" to range[1].toInt(),
            "centerFreqs" to centerFreqs,
            "presets" to presets,
            "enabled" to eq.enabled,
            "bassBoostSupported" to (bb?.strengthSupported ?: false)
          )
        } catch (e: Throwable) {
          null
        }
      }
    }

    Function("getBandLevels") {
      val eq = ensureEqualizer()
      if (eq == null) {
        null
      } else {
        try {
          val numBands = eq.numberOfBands.toInt()
          val levels = ArrayList<Int>()
          for (i in 0 until numBands) {
            levels.add(eq.getBandLevel(i.toShort()).toInt())
          }
          levels
        } catch (e: Throwable) {
          null
        }
      }
    }

    Function("setBandLevel") { band: Int, level: Int ->
      try {
        ensureEqualizer()?.setBandLevel(band.toShort(), level.toShort())
      } catch (e: Throwable) {
        // ignore — out-of-range band/level on some engines
      }
    }

    Function("usePreset") { preset: Int ->
      try {
        ensureEqualizer()?.usePreset(preset.toShort())
      } catch (e: Throwable) {
        // ignore
      }
    }

    Function("setBassBoostEnabled") { enabled: Boolean ->
      try {
        val bb = ensureBassBoost()
        if (bb != null && bb.strengthSupported) {
          bb.enabled = enabled
        }
      } catch (e: Throwable) {
        // ignore
      }
    }

    Function("setBassBoostStrength") { strength: Int ->
      try {
        val bb = ensureBassBoost()
        if (bb != null && bb.strengthSupported) {
          val clamped = strength.coerceIn(0, 1000)
          bb.setStrength(clamped.toShort())
        }
      } catch (e: Throwable) {
        // ignore
      }
    }

    Function("release") {
      synchronized(lock) {
        try {
          equalizer?.release()
        } catch (e: Throwable) {
        }
        try {
          bassBoost?.release()
        } catch (e: Throwable) {
        }
        equalizer = null
        bassBoost = null
      }
    }
  }
}
