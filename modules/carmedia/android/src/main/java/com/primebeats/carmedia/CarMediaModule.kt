package com.primebeats.carmedia

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Bridges the JS library to the Android Auto media service: JS pushes a JSON
 * snapshot of the playable library (songs + playlists + smart playlists), which
 * we persist so `PrimeBeatsMediaService` can browse/search/play them — even when
 * started cold by the car. It also relays car playback state to JS and forwards
 * transport commands so the phone UI can stay in sync with the car.
 */
class CarMediaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CarMedia")

    Events("onCarPlayback")

    Function("isSupported") { true }

    // json: { songs:[{id,title,artist,album,uri}], playlists:[{id,name,trackIds}], smart:[...] }
    Function("setLibrary") { json: String ->
      try {
        val ctx = appContext.reactContext ?: return@Function false
        File(ctx.filesDir, PrimeBeatsMediaService.LIB_FILE).writeText(json)
        true
      } catch (e: Throwable) {
        false
      }
    }

    /** Latest car playback state, for seeding the UI when the app opens. */
    Function("getNowPlaying") { CarPlaybackBus.latest }

    /** Forwards a transport command to the running car service. */
    Function("sendCommand") { command: String ->
      PrimeBeatsMediaService.instance?.handleCommand(command)
      Unit
    }

    OnStartObserving("onCarPlayback") {
      CarPlaybackBus.onState = { state -> sendEvent("onCarPlayback", state) }
    }

    OnStopObserving("onCarPlayback") {
      CarPlaybackBus.onState = null
    }
  }
}
