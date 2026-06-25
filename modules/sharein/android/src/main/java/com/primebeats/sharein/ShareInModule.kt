package com.primebeats.sharein

import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.core.content.FileProvider
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Peer-to-peer music sharing via the Android Sharesheet. PrimeBeats can SEND
 * selected local tracks to another PrimeBeats user (over Nearby Share, Bluetooth,
 * etc.) and RECEIVE shared audio: the launching/new intent's streams are exposed
 * to JS, which copies them in and imports them into the library.
 */
class ShareInModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ShareIn")

    Events("onShareReceived")

    Function("isSupported") { true }

    /** Shares one or more local file paths via the OS Sharesheet. */
    AsyncFunction("shareTracks") { paths: List<String> ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      val context = activity
      val authority = "${context.packageName}.sharein.fileprovider"

      val uris = ArrayList<Uri>()
      for (p in paths) {
        try {
          val raw = if (p.startsWith("file://")) Uri.parse(p).path ?: p else p
          val file = File(Uri.decode(raw))
          if (file.exists()) {
            uris.add(FileProvider.getUriForFile(context, authority, file))
          }
        } catch (e: Throwable) {
          // skip a file we can't resolve
        }
      }
      if (uris.isEmpty()) return@AsyncFunction false

      val action = if (uris.size > 1) Intent.ACTION_SEND_MULTIPLE else Intent.ACTION_SEND
      val intent = Intent(action).apply {
        type = "audio/*"
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        if (uris.size > 1) {
          putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
        } else {
          putExtra(Intent.EXTRA_STREAM, uris[0])
        }
        // ClipData carries the grant to every receiver app.
        clipData = ClipData.newRawUri("", uris[0]).apply {
          for (i in 1 until uris.size) addItem(ClipData.Item(uris[i]))
        }
      }
      activity.startActivity(Intent.createChooser(intent, "Share music"))
      true
    }

    /** Returns the audio stream URIs the app was launched with, if any. */
    Function("getInitialShare") {
      val activity = appContext.currentActivity ?: return@Function emptyList<String>()
      extractShareUris(activity.intent)
    }

    /** Copies a (content://) shared URI into the app cache; returns {uri,name}. */
    AsyncFunction("importToCache") { uriString: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("No context")
      val uri = Uri.parse(uriString)
      val name = queryDisplayName(context, uri) ?: "shared_${System.currentTimeMillis()}.mp3"
      val dir = File(context.cacheDir, "primebeats_in").apply { mkdirs() }
      val dest = File(dir, "${System.currentTimeMillis()}_${sanitize(name)}")
      context.contentResolver.openInputStream(uri).use { input ->
        if (input == null) throw IllegalStateException("Could not open shared file")
        dest.outputStream().use { output -> input.copyTo(output) }
      }
      mapOf("uri" to "file://${dest.absolutePath}", "name" to name)
    }

    // Fired when a share arrives while the app is already running.
    OnNewIntent { intent ->
      val uris = extractShareUris(intent)
      if (uris.isNotEmpty()) sendEvent("onShareReceived", mapOf("uris" to uris))
    }
  }

  private fun extractShareUris(intent: Intent?): List<String> {
    if (intent == null) return emptyList()
    val type = intent.type ?: ""
    val uris = ArrayList<String>()
    when (intent.action) {
      Intent.ACTION_SEND -> {
        @Suppress("DEPRECATION")
        val u = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
        if (u != null) uris.add(u.toString())
      }
      Intent.ACTION_SEND_MULTIPLE -> {
        @Suppress("DEPRECATION")
        val list = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
        list?.forEach { uris.add(it.toString()) }
      }
      Intent.ACTION_VIEW -> {
        if (type.startsWith("audio") || type == "*/*") intent.data?.let { uris.add(it.toString()) }
      }
    }
    return uris
  }

  private fun queryDisplayName(context: android.content.Context, uri: Uri): String? {
    if (uri.scheme == "file") return uri.lastPathSegment
    return try {
      context.contentResolver.query(uri, null, null, null, null)?.use { c ->
        val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (idx >= 0 && c.moveToFirst()) c.getString(idx) else null
      }
    } catch (e: Throwable) {
      null
    }
  }

  private fun sanitize(name: String): String = name.replace(Regex("[^a-zA-Z0-9._-]"), "_").take(80)
}
