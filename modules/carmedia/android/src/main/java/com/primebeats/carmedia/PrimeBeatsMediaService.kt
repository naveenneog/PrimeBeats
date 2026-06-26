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
import android.os.SystemClock
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
import kotlin.math.abs

data class CarTrack(val id: String, val title: String, val artist: String, val album: String, val uri: String)
data class CarGroup(val id: String, val name: String, val trackIds: List<String>)
data class CarSnapshot(
  val songs: List<CarTrack>,
  val byId: Map<String, CarTrack>,
  val playlists: List<CarGroup>,
  val smart: List<CarGroup>,
)

/** Two-way bridge between the car service and the JS module (when the app is alive). */
object CarPlaybackBus {
  /** Local car playback state -> phone banner. */
  var onState: ((Map<String, Any?>) -> Unit)? = null
  /** Auto transport/custom-action commands -> phone (RNTP) while proxying. */
  var onCommand: ((String) -> Unit)? = null
  var latest: Map<String, Any?>? = null

  fun emitState(state: Map<String, Any?>) {
    latest = state
    onState?.invoke(state)
  }

  fun emitCommand(command: String) {
    onCommand?.invoke(command)
  }
}

/**
 * MediaBrowserService for Android Auto / Assistant. It serves a browseable
 * snapshot (songs/playlists/smart) and is the **single Auto-facing session**:
 *
 * - *Local* mode: it plays files itself (Auto-initiated playback).
 * - *Proxy* mode: the phone (react-native-track-player) is the audio source and
 *   we just mirror its metadata/state (`applyProxyState`) and forward Auto's
 *   controls back to the phone (`CarPlaybackBus.emitCommand`). This keeps the
 *   phone and the car perfectly in sync regardless of where playback started.
 */
class PrimeBeatsMediaService : MediaBrowserServiceCompat() {
  companion object {
    const val ROOT_ID = "primebeats_root"
    const val SONGS_ID = "songs"
    const val PLAYLISTS_ID = "playlists_root"
    const val LIB_FILE = "primebeats_carlib.json"
    const val CHANNEL_ID = "primebeats_auto"
    const val NOTIFICATION_ID = 4242

    const val ACTION_LIKE = "primebeats.like"
    const val ACTION_LOOP = "primebeats.loop"
    const val ACTION_RADIO = "primebeats.radio"

    var instance: PrimeBeatsMediaService? = null
  }

  private lateinit var session: MediaSessionCompat
  private var player: MediaPlayer? = null
  private var queue: List<CarTrack> = emptyList()
  private var index = -1
  private var audioManager: AudioManager? = null
  private var focusRequest: AudioFocusRequest? = null

  // Guards against stale callbacks from a released player (fixes switch->stop).
  private var playToken = 0

  // Proxy = the phone is the source; we only mirror + forward.
  private var proxyMode = false
  private var current: CarTrack? = null
  private var liked = false
  private var repeatOn = false
  private var stateInt = PlaybackStateCompat.STATE_NONE
  private var positionMs = 0L
  private var durationMs = 0L

  override fun onCreate() {
    super.onCreate()
    instance = this
    audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager

    val activityIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentPi =
      if (activityIntent != null) PendingIntent.getActivity(this, 0, activityIntent, pendingFlags()) else null

    session = MediaSessionCompat(this, "PrimeBeatsAuto").apply {
      setSessionActivity(contentPi)
      setCallback(SessionCallback())
      isActive = true
    }
    sessionToken = session.sessionToken
    createChannel()
    pushState()
  }

  /* ----------------------------- Browsing ----------------------------- */

  override fun onGetRoot(clientPackageName: String, clientUid: Int, rootHints: Bundle?): BrowserRoot {
    // Grid layout in Android Auto.
    val extras = Bundle().apply {
      putInt("android.media.browse.CONTENT_STYLE_BROWSABLE_HINT", 2)
      putInt("android.media.browse.CONTENT_STYLE_PLAYABLE_HINT", 2)
    }
    return BrowserRoot(ROOT_ID, extras)
  }

  override fun onLoadChildren(
    parentId: String,
    result: Result<MutableList<MediaBrowserCompat.MediaItem>>,
  ) {
    val snap = loadSnapshot()
    val items = ArrayList<MediaBrowserCompat.MediaItem>()
    when {
      parentId == ROOT_ID -> {
        for (g in snap.smart) {
          if (g.trackIds.isNotEmpty()) items.add(browsable("smart:${g.id}", g.name, categoryIcon("smart:${g.id}")))
        }
        if (snap.playlists.isNotEmpty()) items.add(browsable(PLAYLISTS_ID, "Playlists", "ic_cat_playlists"))
        items.add(browsable(SONGS_ID, "All Songs", "ic_cat_songs"))
      }
      parentId == PLAYLISTS_ID -> {
        for (p in snap.playlists) items.add(browsable("playlist:${p.id}", p.name, "ic_cat_playlists"))
      }
      parentId == SONGS_ID -> for (t in snap.songs) items.add(playable(SONGS_ID, t))
      else -> for (t in resolveList(parentId, snap)) items.add(playable(parentId, t))
    }
    result.sendResult(items)
  }

  private fun resUri(name: String): Uri = Uri.parse("android.resource://$packageName/drawable/$name")

  private fun categoryIcon(listId: String): String = when {
    listId.endsWith("forYou") -> "ic_cat_foryou"
    listId.endsWith("mostPlayed") -> "ic_cat_most"
    listId.endsWith("recentlyPlayed") -> "ic_cat_recent"
    else -> "ic_cat_songs"
  }

  private fun artFor(id: String): String = "ic_art_${abs(id.hashCode()) % 6}"

  private fun browsable(mediaId: String, title: String, iconName: String): MediaBrowserCompat.MediaItem {
    val desc = MediaDescriptionCompat.Builder()
      .setMediaId(mediaId)
      .setTitle(title)
      .setIconUri(resUri(iconName))
      .build()
    return MediaBrowserCompat.MediaItem(desc, MediaBrowserCompat.MediaItem.FLAG_BROWSABLE)
  }

  private fun playable(listId: String, t: CarTrack): MediaBrowserCompat.MediaItem {
    val desc = MediaDescriptionCompat.Builder()
      .setMediaId("$listId|${t.id}")
      .setTitle(t.title)
      .setSubtitle(t.artist)
      .setIconUri(resUri(artFor(t.id)))
      .build()
    return MediaBrowserCompat.MediaItem(desc, MediaBrowserCompat.MediaItem.FLAG_PLAYABLE)
  }

  private fun resolveList(listId: String, snap: CarSnapshot): List<CarTrack> = when {
    listId == SONGS_ID -> snap.songs
    listId.startsWith("smart:") ->
      snap.smart.firstOrNull { it.id == listId.removePrefix("smart:") }?.trackIds?.mapNotNull { snap.byId[it] } ?: emptyList()
    listId.startsWith("playlist:") ->
      snap.playlists.firstOrNull { it.id == listId.removePrefix("playlist:") }?.trackIds?.mapNotNull { snap.byId[it] } ?: emptyList()
    else -> snap.songs
  }

  private fun loadSnapshot(): CarSnapshot {
    return try {
      val f = File(filesDir, LIB_FILE)
      if (!f.exists()) return empty()
      val text = f.readText().trim()
      val songs = ArrayList<CarTrack>()
      val playlists = ArrayList<CarGroup>()
      val smart = ArrayList<CarGroup>()
      if (text.startsWith("[")) {
        parseTracks(JSONArray(text), songs)
      } else {
        val o = JSONObject(text)
        parseTracks(o.optJSONArray("songs") ?: JSONArray(), songs)
        parseGroups(o.optJSONArray("playlists"), playlists)
        parseGroups(o.optJSONArray("smart"), smart)
      }
      val byId = HashMap<String, CarTrack>()
      for (t in songs) byId[t.id] = t
      CarSnapshot(songs, byId, playlists, smart)
    } catch (e: Throwable) {
      empty()
    }
  }

  private fun parseTracks(arr: JSONArray, out: ArrayList<CarTrack>) {
    for (i in 0 until arr.length()) {
      val o = arr.optJSONObject(i) ?: continue
      val uri = o.optString("uri")
      if (uri.isNullOrEmpty()) continue
      out.add(CarTrack(o.optString("id", uri), o.optString("title", "Unknown"), o.optString("artist", ""), o.optString("album", ""), uri))
    }
  }

  private fun parseGroups(arr: JSONArray?, out: ArrayList<CarGroup>) {
    if (arr == null) return
    for (i in 0 until arr.length()) {
      val o = arr.optJSONObject(i) ?: continue
      val ids = ArrayList<String>()
      val a = o.optJSONArray("trackIds") ?: JSONArray()
      for (j in 0 until a.length()) ids.add(a.optString(j))
      out.add(CarGroup(o.optString("id"), o.optString("name", "Playlist"), ids))
    }
  }

  private fun empty() = CarSnapshot(emptyList(), emptyMap(), emptyList(), emptyList())

  /* ----------------------------- Session callback ----------------------------- */

  private inner class SessionCallback : MediaSessionCompat.Callback() {
    override fun onPlay() {
      if (proxyMode) { CarPlaybackBus.emitCommand("play"); return }
      if (player == null && queue.isNotEmpty()) playAt(if (index >= 0) index else 0) else resume()
    }

    override fun onPause() {
      if (proxyMode) { CarPlaybackBus.emitCommand("pause"); return }
      pause()
    }

    override fun onStop() {
      if (proxyMode) { CarPlaybackBus.emitCommand("stop"); return }
      stopPlayback()
    }

    override fun onSkipToNext() {
      if (proxyMode) { CarPlaybackBus.emitCommand("next"); return }
      if (queue.isNotEmpty()) playAt((index + 1) % queue.size)
    }

    override fun onSkipToPrevious() {
      if (proxyMode) { CarPlaybackBus.emitCommand("previous"); return }
      if (queue.isNotEmpty()) playAt(if (index <= 0) queue.size - 1 else index - 1)
    }

    override fun onSeekTo(pos: Long) {
      if (proxyMode) { CarPlaybackBus.emitCommand("seek:$pos"); return }
      try {
        player?.seekTo(pos.toInt())
        positionMs = pos
        pushState()
      } catch (e: Throwable) {
      }
    }

    override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
      val snap = loadSnapshot()
      proxyMode = false
      val parts = (mediaId ?: "").split("|", limit = 2)
      if (parts.size == 2) {
        queue = resolveList(parts[0], snap)
        val i = queue.indexOfFirst { it.id == parts[1] }
        if (i >= 0) { playAt(i); return }
      }
      queue = snap.songs
      val i = queue.indexOfFirst { it.id == mediaId }
      if (i >= 0) playAt(i) else if (queue.isNotEmpty()) playAt(0)
    }

    override fun onPlayFromSearch(query: String?, extras: Bundle?) {
      val snap = loadSnapshot()
      proxyMode = false
      queue = snap.songs
      if (queue.isEmpty()) return
      val m = findMatch(query)
      playAt(if (m >= 0) m else 0)
    }

    override fun onCustomAction(action: String?, extras: Bundle?) {
      when (action) {
        ACTION_LIKE -> CarPlaybackBus.emitCommand("like")
        ACTION_LOOP -> {
          CarPlaybackBus.emitCommand("loop")
          if (!proxyMode) { repeatOn = !repeatOn; player?.isLooping = repeatOn; pushState() }
        }
        ACTION_RADIO -> CarPlaybackBus.emitCommand("radio")
      }
    }
  }

  /** Phone -> car: control local car playback (from the in-app CarBanner). */
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

  /** Phone (RNTP) -> car: mirror what's playing on the phone so Auto stays in sync. */
  fun applyProxyState(state: Map<String, Any?>) {
    proxyMode = true
    // The phone owns the audio now; release any local player.
    releasePlayer()
    current = CarTrack(
      id = state["id"] as? String ?: "",
      title = state["title"] as? String ?: "Unknown",
      artist = state["artist"] as? String ?: "",
      album = state["album"] as? String ?: "",
      uri = "",
    )
    durationMs = (state["durationMs"] as? Number)?.toLong() ?: 0L
    positionMs = (state["positionMs"] as? Number)?.toLong() ?: 0L
    liked = state["liked"] as? Boolean ?: false
    repeatOn = state["repeat"] as? Boolean ?: false
    val playing = state["playing"] as? Boolean ?: false
    stateInt = if (playing) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
    if (!session.isActive) session.isActive = true
    setMetadata()
    pushState()
  }

  private fun findMatch(query: String?): Int {
    val q = query?.trim()?.lowercase() ?: return -1
    if (q.isEmpty()) return -1
    val words = q.split(Regex("\\s+")).filter { it.length > 1 }
    var best = -1
    var bestScore = 0
    queue.forEachIndexed { i, t ->
      val hay = "${t.title} ${t.artist} ${t.album}".lowercase()
      var score = 0
      if (hay.contains(q)) score += 10
      for (w in words) if (hay.contains(w)) score += 1
      if (score > bestScore) { bestScore = score; best = i }
    }
    return if (bestScore > 0) best else -1
  }

  /* ----------------------------- Local playback ----------------------------- */

  private fun releasePlayer() {
    player?.let {
      try {
        it.setOnPreparedListener(null)
        it.setOnCompletionListener(null)
        it.setOnErrorListener(null)
        it.reset()
        it.release()
      } catch (e: Throwable) {
      }
    }
    player = null
  }

  private fun playAt(i: Int) {
    if (i < 0 || i >= queue.size) return
    index = i
    proxyMode = false
    val t = queue[i]
    current = t
    val token = ++playToken
    releasePlayer()
    try {
      val mp = MediaPlayer()
      mp.setAudioAttributes(
        AudioAttributes.Builder()
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .build(),
      )
      mp.setDataSource(applicationContext, Uri.parse(t.uri))
      mp.setOnPreparedListener { prepared ->
        if (token != playToken) { try { prepared.release() } catch (e: Throwable) {}; return@setOnPreparedListener }
        if (requestFocus()) {
          prepared.isLooping = repeatOn
          prepared.start()
          durationMs = prepared.duration.toLong()
          positionMs = 0
          stateInt = PlaybackStateCompat.STATE_PLAYING
          setMetadata()
          pushState()
          startForeground(NOTIFICATION_ID, buildNotification(t, true))
          emitLocalState(true)
        }
      }
      mp.setOnCompletionListener { if (token == playToken && !it.isLooping) onTrackComplete() }
      mp.setOnErrorListener { _, _, _ -> if (token == playToken) onTrackComplete(); true }
      player = mp
      mp.prepareAsync()
    } catch (e: Throwable) {
      if (queue.size > 1 && token == playToken) playAt((i + 1) % queue.size)
    }
  }

  private fun onTrackComplete() {
    if (queue.isNotEmpty()) playAt((index + 1) % queue.size)
  }

  private fun resume() {
    try {
      if (requestFocus()) {
        player?.start()
        stateInt = PlaybackStateCompat.STATE_PLAYING
        pushState()
        current?.let { startForeground(NOTIFICATION_ID, buildNotification(it, true)) }
        emitLocalState(true)
      }
    } catch (e: Throwable) {
    }
  }

  private fun pause() {
    try {
      player?.pause()
      positionMs = player?.currentPosition?.toLong() ?: positionMs
      stateInt = PlaybackStateCompat.STATE_PAUSED
      pushState()
      current?.let {
        getSystemService(NotificationManager::class.java)?.notify(NOTIFICATION_ID, buildNotification(it, false))
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_DETACH)
      else @Suppress("DEPRECATION") stopForeground(false)
      emitLocalState(false)
    } catch (e: Throwable) {
    }
  }

  private fun stopPlayback() {
    try {
      abandonFocus()
      releasePlayer()
      stateInt = PlaybackStateCompat.STATE_STOPPED
      pushState()
      session.isActive = false
      CarPlaybackBus.emitState(mapOf("active" to false))
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE)
      else @Suppress("DEPRECATION") stopForeground(true)
      stopSelf()
    } catch (e: Throwable) {
    }
  }

  /** Emit local car playback to the phone banner (only meaningful in local mode). */
  private fun emitLocalState(playing: Boolean) {
    val t = current ?: return
    CarPlaybackBus.emitState(
      mapOf(
        "active" to true,
        "id" to t.id, "title" to t.title, "artist" to t.artist, "album" to t.album,
        "durationMs" to durationMs, "playing" to playing,
      ),
    )
  }

  /* ----------------------------- Session state ----------------------------- */

  private fun setMetadata() {
    val t = current ?: return
    session.setMetadata(
      MediaMetadataCompat.Builder()
        .putString(MediaMetadataCompat.METADATA_KEY_MEDIA_ID, t.id)
        .putString(MediaMetadataCompat.METADATA_KEY_TITLE, t.title)
        .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, t.artist)
        .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, t.album)
        .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON_URI, resUri(artFor(t.id)).toString())
        .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, if (durationMs > 0) durationMs else -1L)
        .build(),
    )
  }

  private fun pushState() {
    val livePos = if (!proxyMode && player?.isPlaying == true) {
      try { player?.currentPosition?.toLong() ?: positionMs } catch (e: Throwable) { positionMs }
    } else positionMs
    val speed = if (stateInt == PlaybackStateCompat.STATE_PLAYING) 1f else 0f
    val b = PlaybackStateCompat.Builder()
      .setActions(
        PlaybackStateCompat.ACTION_PLAY or PlaybackStateCompat.ACTION_PAUSE or
          PlaybackStateCompat.ACTION_PLAY_PAUSE or PlaybackStateCompat.ACTION_STOP or
          PlaybackStateCompat.ACTION_SKIP_TO_NEXT or PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
          PlaybackStateCompat.ACTION_SEEK_TO or PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID or
          PlaybackStateCompat.ACTION_PLAY_FROM_SEARCH,
      )
      .setState(stateInt, livePos, speed, SystemClock.elapsedRealtime())
      .addCustomAction(
        PlaybackStateCompat.CustomAction.Builder(
          ACTION_LIKE, "Like", if (liked) R.drawable.ic_pb_like_on else R.drawable.ic_pb_like,
        ).build(),
      )
      .addCustomAction(
        PlaybackStateCompat.CustomAction.Builder(
          ACTION_LOOP, "Loop", if (repeatOn) R.drawable.ic_pb_loop_on else R.drawable.ic_pb_loop,
        ).build(),
      )
      .addCustomAction(
        PlaybackStateCompat.CustomAction.Builder(ACTION_RADIO, "Smart Radio", R.drawable.ic_pb_radio).build(),
      )
    session.setPlaybackState(b.build())
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
            AudioManager.AUDIOFOCUS_LOSS, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> if (!proxyMode) pause()
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
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) focusRequest?.let { am.abandonAudioFocusRequest(it) }
    else @Suppress("DEPRECATION") am.abandonAudioFocus(null)
  }

  /* ----------------------------- Notification ----------------------------- */

  private fun createChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val mgr = getSystemService(NotificationManager::class.java)
      if (mgr?.getNotificationChannel(CHANNEL_ID) == null) {
        mgr?.createNotificationChannel(NotificationChannel(CHANNEL_ID, "PrimeBeats (Auto)", NotificationManager.IMPORTANCE_LOW))
      }
    }
  }

  private fun buildNotification(t: CarTrack, playing: Boolean): Notification {
    val playPause = if (playing)
      NotificationCompat.Action(android.R.drawable.ic_media_pause, "Pause", MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_PAUSE))
    else
      NotificationCompat.Action(android.R.drawable.ic_media_play, "Play", MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_PLAY))
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(t.title)
      .setContentText(t.artist)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentIntent(session.controller.sessionActivity)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .addAction(NotificationCompat.Action(android.R.drawable.ic_media_previous, "Prev", MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)))
      .addAction(playPause)
      .addAction(NotificationCompat.Action(android.R.drawable.ic_media_next, "Next", MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_SKIP_TO_NEXT)))
      .setStyle(MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0, 1, 2))
      .build()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    MediaButtonReceiver.handleIntent(session, intent)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    abandonFocus()
    releasePlayer()
    session.release()
    if (instance === this) instance = null
    super.onDestroy()
  }

  private fun pendingFlags(): Int =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    else PendingIntent.FLAG_UPDATE_CURRENT
}
