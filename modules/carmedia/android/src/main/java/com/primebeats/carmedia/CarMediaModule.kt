package com.primebeats.carmedia

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Bridges JS and the Android Auto media service: pushes the browse snapshot,
 * mirrors phone playback into the car session (`setNowPlaying`), relays car
 * playback state + Auto commands to JS, and forwards transport commands.
 */
class CarMediaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CarMedia")

    Events("onCarPlayback", "onCarCommand")

    Function("isSupported") { true }

    // json: { songs:[...], playlists:[{id,name,trackIds}], smart:[...] }
    Function("setLibrary") { json: String ->
      try {
        val ctx = appContext.reactContext ?: return@Function false
        File(ctx.filesDir, PrimeBeatsMediaService.LIB_FILE).writeText(json)
        true
      } catch (e: Throwable) {
        false
      }
    }

    /** Mirror what the phone (RNTP) is playing into the car session. */
    Function("setNowPlaying") { state: Map<String, Any?> ->
      PrimeBeatsMediaService.instance?.applyProxyState(state)
      Unit
    }

    /** Latest local car playback state, for seeding the in-app banner. */
    Function("getNowPlaying") { CarPlaybackBus.latest }

    /** Forward a transport command to the car's local playback (from the banner). */
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

    OnStartObserving("onCarCommand") {
      CarPlaybackBus.onCommand = { command -> sendEvent("onCarCommand", mapOf("command" to command)) }
    }
    OnStopObserving("onCarCommand") {
      CarPlaybackBus.onCommand = null
    }
  }
}
