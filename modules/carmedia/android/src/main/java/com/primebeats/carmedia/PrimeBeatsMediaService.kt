package com.primebeats.carmedia

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.MediaBrowserServiceCompat
import androidx.media.app.NotificationCompat.MediaStyle
import androidx.media.session.MediaButtonReceiver
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/** A single browsable/playable track, mirrored from the JS library snapshot. */
data class CarTrack(
  val id: String,
  val title: String,
  val artist: String,
  val album: String,
  val uri: String,
)

/** A named group of track ids (a playlist or a smart playlist). */
data class CarGroup(val id: String, val name: String, val trackIds: List<String>)

/** The full browseable snapshot pushed from JS. */
data class CarSnapshot(
  val songs: List<CarTrack>,
  val byId: Map<String, CarTrack>,
  val playlists: List<CarGroup>,
  val smart: List<CarGroup>,
)

/**
 * Bridges car playback state to the JS module (when the app process is alive) so
 * the phone UI can mirror what's playing in the car.
 */
object CarPlaybackBus {
  var onState: ((Map<String, Any?>) -> Unit)? = null
  var latest: Map<String, Any?>? = null
  fun emit(state: Map<String, Any?>) {
    latest = state
    onState?.invoke(state)
  }
}

/**
 * MediaBrowserService that exposes the PrimeBeats library to Android Auto /
 * Google Assistant and plays local files. It reads a JSON snapshot written by
 * JS (CarMediaModule) — songs, playlists and smart playlists — so it can browse,
 * search and play even when started cold by the car. Playback state is published
 * via [CarPlaybackBus] so the running app can stay in sync.
 */
class PrimeBeatsMediaService : MediaBrowserServiceCompat() {
  companion object {
    const val ROOT_ID = "primebeats_root"
    const val SONGS_ID = "songs"
    const val PLAYLISTS_ID = "playlists_root"
    const val LIB_FILE = "primebeats_carlib.json"
    const val CHANNEL_ID = "primebeats_auto"
    const val NOTIFICATION_ID = 4242

    /** Live instance so the module can forward transport commands from the app. */
    var instance: PrimeBeatsMediaService? = null
  }

  private lateinit var session: MediaSessionCompat
  private val stateBuilder = PlaybackStateCompat.Builder().setActions(
    PlaybackStateCompat.ACTION_PLAY or
      PlaybackStateCompat.ACTION_PLAY_PAUSE or
      PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID or
      PlaybackStateCompat.ACTION_PLAY_FROM_SEARCH or
      PlaybackStateCompat.ACTION_PAUSE or
      PlaybackStateCompat.ACTION_STOP or
      PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
      PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
      PlaybackStateCompat.ACTION_SEEK_TO,
  )

  private var player: MediaPlayer? = null
  private var queue: List<CarTrack> = emptyList()
  private var index = -1
  private var audioManager: AudioManager? = null
  private var focusRequest: AudioFocusRequest? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager

    val activityIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentPi =
      if (activityIntent != null)
        PendingIntent.getActivity(this, 0, activityIntent, pendingFlags())
      else null

    session = MediaSessionCompat(this, "PrimeBeatsAuto").apply {
      setSessionActivity(contentPi)
      setPlaybackState(stateBuilder.setState(PlaybackStateCompat.STATE_NONE, 0, 1f).build())
      setCallback(SessionCallback())
      isActive = true
    }
    sessionToken = session.sessionToken
    createChannel()
  }

  /* ----------------------------- Browsing ----------------------------- */

  override fun onGetRoot(
    clientPackageName: String,
    clientUid: Int,
    rootHints: Bundle?,
  ): BrowserRoot {
    return BrowserRoot(ROOT_ID, null)
  }

  override fun onLoadChildren(
    parentId: String,
    result: Result<MutableList<MediaBrowserCompat.MediaItem>>,
  ) {
    val snap = loadSnapshot()
    val items = ArrayList<MediaBrowserCompat.MediaItem>()

    when {
      parentId == ROOT_ID -> {
        // Smart playlists first, then user playlists, then all songs.
        for (g in snap.smart) {
          if (g.trackIds.isNotEmpty()) items.add(browsable("smart:${g.id}", g.name))
        }
        if (snap.playlists.isNotEmpty()) items.add(browsable(PLAYLISTS_ID, "Playlists"))
        items.add(browsable(SONGS_ID, "All Songs"))
      }
      parentId == PLAYLISTS_ID -> {
        for (p in snap.playlists) items.add(browsable("playlist:${p.id}", p.name))
      }
      parentId == SONGS_ID -> {
        for (t in snap.songs) items.add(playable(SONGS_ID, t))
      }
      else -> {
        for (t in resolveList(parentId, snap)) items.add(playable(parentId, t))
      }
    }
    result.sendResult(items)
  }

  private fun browsable(mediaId: String, title: String): MediaBrowserCompat.MediaItem {
    val desc = MediaDescriptionCompat.Builder().setMediaId(mediaId).setTitle(title).build()
    return MediaBrowserCompat.MediaItem(desc, MediaBrowserCompat.MediaItem.FLAG_BROWSABLE)
  }

  private fun playable(listId: String, t: CarTrack): MediaBrowserCompat.MediaItem {
    // Hierarchy-aware media id so playback knows which list to queue.
    val desc = MediaDescriptionCompat.Builder()
      .setMediaId("$listId|${t.id}")
      .setTitle(t.title)
      .setSubtitle(t.artist)
      .build()
    return MediaBrowserCompat.MediaItem(desc, MediaBrowserCompat.MediaItem.FLAG_PLAYABLE)
  }

  /** Resolves a list id ("songs" / "smart:x" / "playlist:x") to its tracks. */
  private fun resolveList(listId: String, snap: CarSnapshot): List<CarTrack> {
    return when {
      listId == SONGS_ID -> snap.songs
      listId.startsWith("smart:") ->
        snap.smart.firstOrNull { it.id == listId.removePrefix("smart:") }
          ?.trackIds?.mapNotNull { snap.byId[it] } ?: emptyList()
      listId.startsWith("playlist:") ->
        snap.playlists.firstOrNull { it.id == listId.removePrefix("playlist:") }
          ?.trackIds?.mapNotNull { snap.byId[it] } ?: emptyList()
      else -> snap.songs
    }
  }

  private fun loadSnapshot(): CarSnapshot {
    return try {
      val f = File(filesDir, LIB_FILE)
      if (!f.exists()) return emptySnapshot()
      val text = f.readText().trim()
      val songs = ArrayList<CarTrack>()
      val playlists = ArrayList<CarGroup>()
      val smart = ArrayList<CarGroup>()

      if (text.startsWith("[")) {
        parseTracks(JSONArray(text), songs)
      } else {
        val obj = JSONObject(text)
        parseTracks(obj.optJSONArray("songs") ?: JSONArray(), songs)
        parseGroups(obj.optJSONArray("playlists"), playlists)
        parseGroups(obj.optJSONArray("smart"), smart)
      }
      val byId = HashMap<String, CarTrack>()
      for (t in songs) byId[t.id] = t
      CarSnapshot(songs, byId, playlists, smart)
    } catch (e: Throwable) {
      emptySnapshot()
    }
  }

  private fun parseTracks(arr: JSONArray, out: ArrayList<CarTrack>) {
    for (i in 0 until arr.length()) {
      val o = arr.optJSONObject(i) ?: continue
      val uri = o.optString("uri")
      if (uri.isNullOrEmpty()) continue
      out.add(
        CarTrack(
          id = o.optString("id", uri),
          title = o.optString("title", "Unknown"),
          artist = o.optString("artist", ""),
          album = o.optString("album", ""),
          uri = uri,
        ),
      )
    }
  }

  private fun parseGroups(arr: JSONArray?, out: ArrayList<CarGroup>) {
    if (arr == null) return
    for (i in 0 until arr.length()) {
      val o = arr.optJSONObject(i) ?: continue
      val ids = ArrayList<String>()
      val idsArr = o.optJSONArray("trackIds") ?: JSONArray()
      for (j in 0 until idsArr.length()) ids.add(idsArr.optString(j))
      out.add(CarGroup(o.optString("id"), o.optString("name", "Playlist"), ids))
    }
  }

  private fun emptySnapshot() = CarSnapshot(emptyList(), emptyMap(), emptyList(), emptyList())

  /* ----------------------------- Session callback ----------------------------- */

  private inner class SessionCallback : MediaSessionCompat.Callback() {
    override fun onPlay() {
      if (player == null && queue.isNotEmpty()) playAt(if (index >= 0) index else 0) else resume()
    }

    override fun onPause() = pause()

    override fun onStop() = stopPlayback()

    override fun onSkipToNext() {
      if (queue.isNotEmpty()) playAt((index + 1) % queue.size)
    }

    override fun onSkipToPrevious() {
      if (queue.isNotEmpty()) playAt(if (index <= 0) queue.size - 1 else index - 1)
    }

    override fun onSeekTo(pos: Long) {
      try {
        player?.seekTo(pos.toInt())
        updateState(if (player?.isPlaying == true) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED)
      } catch (e: Throwable) {
      }
    }

    override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
      val snap = loadSnapshot()
      val parts = (mediaId ?: "").split("|", limit = 2)
      if (parts.size == 2) {
        queue = resolveList(parts[0], snap)
        val i = queue.indexOfFirst { it.id == parts[1] }
        if (i >= 0) { playAt(i); return }
      }
      // Fallback: treat the whole id as a track id within all songs.
      queue = snap.songs
      val i = queue.indexOfFirst { it.id == mediaId }
      if (i >= 0) playAt(i) else if (queue.isNotEmpty()) playAt(0)
    }

    override fun onPlayFromSearch(query: String?, extras: Bundle?) {
      val snap = loadSnapshot()
      queue = snap.songs
      if (queue.isEmpty()) return
      val match = findMatch(query)
      playAt(if (match >= 0) match else 0)
    }
  }

  /** Public entry point so the app (via the module) can drive car playback. */
  fun handleCommand(command: String) {
    when (command) {
      "play" -> if (player == null && queue.isNotEmpty()) playAt(if (index >= 0) index else 0) else resume()
      "pause" -> pause()
      "playpause" -> if (player?.isPlaying == true) pause() else handleCommand("play")
      "next" -> if (queue.isNotEmpty()) playAt((index + 1) % queue.size)
      "previous" -> if (queue.isNotEmpty()) playAt(if (index <= 0) queue.size - 1 else index - 1)
      "stop" -> stopPlayback()
    }
  }

  private fun findMatch(query: String?): Int {
    val q = query?.trim()?.lowercase() ?: return -1
    if (q.isEmpty()) return -1
    val words = q.split(Regex("\\s+")).filter { it.length > 1 }
    var bestIdx = -1
    var bestScore = 0
    queue.forEachIndexed { i, t ->
      val hay = "${t.title} ${t.artist} ${t.album}".lowercase()
      var score = 0
      if (hay.contains(q)) score += 10
      for (w in words) if (hay.contains(w)) score += 1
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }
    return if (bestScore > 0) bestIdx else -1
  }

  /* ----------------------------- Playback ----------------------------- */

  private fun playAt(i: Int) {
    if (i < 0 || i >= queue.size) return
    index = i
    val t = queue[i]
    try {
      player?.release()
      player = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .build(),
        )
        setDataSource(applicationContext, Uri.parse(t.uri))
        setOnPreparedListener {
          if (requestFocus()) {
            start()
            updateMetadata(t, duration.toLong())
            updateState(PlaybackStateCompat.STATE_PLAYING)
            startForeground(NOTIFICATION_ID, buildNotification(t, true))
            emitState(true)
          }
        }
        setOnCompletionListener { onTrackComplete() }
        setOnErrorListener { _, _, _ -> onTrackComplete(); true }
        prepareAsync()
      }
    } catch (e: Throwable) {
      if (queue.size > 1) playAt((i + 1) % queue.size)
    }
  }

  private fun onTrackComplete() {
    if (queue.isNotEmpty()) playAt((index + 1) % queue.size)
  }

  private fun resume() {
    try {
      if (requestFocus()) {
        player?.start()
        updateState(PlaybackStateCompat.STATE_PLAYING)
        queue.getOrNull(index)?.let { startForeground(NOTIFICATION_ID, buildNotification(it, true)) }
        emitState(true)
      }
    } catch (e: Throwable) {
    }
  }

  private fun pause() {
    try {
      player?.pause()
      updateState(PlaybackStateCompat.STATE_PAUSED)
      queue.getOrNull(index)?.let {
        getSystemService(NotificationManager::class.java)?.notify(NOTIFICATION_ID, buildNotification(it, false))
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_DETACH)
      else @Suppress("DEPRECATION") stopForeground(false)
      emitState(false)
    } catch (e: Throwable) {
    }
  }

  private fun stopPlayback() {
    try {
      abandonFocus()
      player?.release()
      player = null
      updateState(PlaybackStateCompat.STATE_STOPPED)
      session.isActive = false
      CarPlaybackBus.emit(mapOf("active" to false))
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE)
      else @Suppress("DEPRECATION") stopForeground(true)
      stopSelf()
    } catch (e: Throwable) {
    }
  }

  private fun emitState(playing: Boolean) {
    val t = queue.getOrNull(index)
    if (t == null) {
      CarPlaybackBus.emit(mapOf("active" to false))
      return
    }
    val dur = try {
      player?.duration ?: 0
    } catch (e: Throwable) {
      0
    }
    CarPlaybackBus.emit(
      mapOf(
        "active" to true,
        "id" to t.id,
        "title" to t.title,
        "artist" to t.artist,
        "album" to t.album,
        "durationMs" to dur,
        "playing" to playing,
      ),
    )
  }

  private fun updateState(state: Int) {
    val pos = try {
      player?.currentPosition?.toLong() ?: 0L
    } catch (e: Throwable) {
      0L
    }
    session.setPlaybackState(stateBuilder.setState(state, pos, 1f).build())
  }

  private fun updateMetadata(t: CarTrack, durationMs: Long) {
    session.setMetadata(
      MediaMetadataCompat.Builder()
        .putString(MediaMetadataCompat.METADATA_KEY_MEDIA_ID, t.id)
        .putString(MediaMetadataCompat.METADATA_KEY_TITLE, t.title)
        .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, t.artist)
        .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, t.album)
        .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs)
        .build(),
    )
  }

  /* ----------------------------- Audio focus ----------------------------- */

  private fun requestFocus(): Boolean {
    val am = audioManager ?: return true
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .build(),
        )
        .setOnAudioFocusChangeListener { change ->
          when (change) {
            AudioManager.AUDIOFOCUS_LOSS, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> pause()
          }
        }
        .build()
      focusRequest = req
      am.requestAudioFocus(req) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    } else {
      @Suppress("DEPRECATION")
      am.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN) ==
        AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }
  }

  private fun abandonFocus() {
    val am = audioManager ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { am.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION") am.abandonAudioFocus(null)
    }
  }

  /* ----------------------------- Notification ----------------------------- */

  private fun createChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val mgr = getSystemService(NotificationManager::class.java)
      if (mgr?.getNotificationChannel(CHANNEL_ID) == null) {
        mgr?.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "PrimeBeats (Auto)", NotificationManager.IMPORTANCE_LOW),
        )
      }
    }
  }

  private fun buildNotification(t: CarTrack, playing: Boolean): Notification {
    val playPause =
      if (playing)
        NotificationCompat.Action(
          android.R.drawable.ic_media_pause,
          "Pause",
          MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_PAUSE),
        )
      else
        NotificationCompat.Action(
          android.R.drawable.ic_media_play,
          "Play",
          MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_PLAY),
        )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(t.title)
      .setContentText(t.artist)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentIntent(session.controller.sessionActivity)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .addAction(
        NotificationCompat.Action(
          android.R.drawable.ic_media_previous,
          "Prev",
          MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS),
        ),
      )
      .addAction(playPause)
      .addAction(
        NotificationCompat.Action(
          android.R.drawable.ic_media_next,
          "Next",
          MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_SKIP_TO_NEXT),
        ),
      )
      .setStyle(
        MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0, 1, 2),
      )
      .build()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    MediaButtonReceiver.handleIntent(session, intent)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    abandonFocus()
    player?.release()
    player = null
    session.release()
    if (instance === this) instance = null
    super.onDestroy()
  }

  private fun pendingFlags(): Int =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    else PendingIntent.FLAG_UPDATE_CURRENT
}
