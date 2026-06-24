package com.primebeats.carmedia

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Bridges the JS library to the Android Auto media service: JS pushes a JSON
 * snapshot of the playable tracks, which we persist to the app's files dir so
 * `PrimeBeatsMediaService` can browse/search/play them — even when started cold
 * by the car.
 */
class CarMediaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CarMedia")

    Function("isSupported") { true }

    // json: array of { id, title, artist, album, uri }
    Function("setLibrary") { json: String ->
      try {
        val ctx = appContext.reactContext ?: return@Function false
        File(ctx.filesDir, PrimeBeatsMediaService.LIB_FILE).writeText(json)
        true
      } catch (e: Throwable) {
        false
      }
    }
  }
}
