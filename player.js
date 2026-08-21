/* DOX MUSIC — спокойный плеер-плейлист (YouTube IFrame API + локальное аудио). */
(function () {
  "use strict";

  const TRACKS = [
    { id: "myown", local: true, src: "my_track.wav", title: "My Own Track (DOX)", artist: "AI Agent", cover: "art_balance.jpg" },
    { id: "JjPtDl6EJ3o", title: "MONTAGEM XONADA", artist: "MXZI, DJ SAMIR, DJ JAVI26" },
    { id: "3lj2hlUWxhM", title: "священная война (Jumpstyle Slowed)", artist: "home4circus" },
    { id: "etN1MFbmzg0", title: "Jumpstyle Phonk", artist: "ZERO PAIN" },
    { id: "6HJjhZ-jloI", title: "HEAVENLY JUMPSTYLE", artist: "The Vibe Guide" },
    { id: "RXRWE_XQ8aE", title: "Murder In My Mind", artist: "Kordhell" },
    { id: "317RHaFF7Xk", title: "METAMORPHOSIS", artist: "INTERWORLD" },
    { id: "PoikYn_-vSU", title: "Грусный реп (speed songs)", artist: "Lida & Tenderlybae" },
    { id: "W7Pofomc7ZU", title: "ярче звёзд (speed up)", artist: "Luciyashi" },
    { id: "OSbhFr5TzkQ", title: "Close Eyes", artist: "DVRST" },
    { id: "n9nLkGx81gk", title: "SCOPIN", artist: "Kordhell" },
    { id: "AqHlQL3PoD8", title: "RAVE", artist: "Dxrk ダーク" },
    { id: "iBv6kB7WxYg", title: "MIDNIGHT", artist: "PLAYAMANE, Nateki" },
    { id: "YLWbZ7nwooU", title: "NEON BLADE", artist: "MoonDeity" },
    { id: "AQvTGVAv4-g", title: "RAPTURE", artist: "INTERWORLD" },
    { id: "EIk5zIifNTY", title: "SLAY!", artist: "Eternxlkz" },
    { id: "E4GHq_yP-ro", title: "Step Back!", artist: "1nonly, SXMPRA" },
    { id: "BX7exLYSEy8", title: "Memory Reboot", artist: "VØJ, Narvent" },
    { id: "8xkCWjah1Oc", title: "Override", artist: "KSLV Noh" },
    { id: "1LmLBtRJwFk", title: "Crystals", artist: "Isolate.exe" },
    { id: "WCOnNcfCvhk", title: "GHOST!", artist: "phonk.me, KIIXSHI" },
    { id: "FLdGZTSs9Dw", title: "Sea Of Problems", artist: "glichery" },
    { id: "2ZmeRMW4Gj8", title: "Dream Space", artist: "DVRST" },
    { id: "k37f1Ldi4BI", title: "FAVELA", artist: "MXZI, Deno" },
  ];

  const LS = { vol: "dox_vol", shuffle: "dox_shuffle", repeat: "dox_repeat", last: "dox_last", muted: "dox_muted" };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  const $ = (id) => document.getElementById(id);
  const cover = $("cover");
  const coverImg = $("coverImg");
  const playBtn = $("playBtn");
  const mainBtn = $("mainBtn");
  const prevBtn = $("prevBtn");
  const nextBtn = $("nextBtn");
  const rewindBtn = $("rewindBtn");
  const forwardBtn = $("forwardBtn");
  const shuffleBtn = $("shuffleBtn");
  const repeatBtn = $("repeatBtn");
  const muteBtn = $("muteBtn");
  const shareBtn = $("shareBtn");
  const progress = $("progress");
  const progressBar = $("progressBar");
  const progressBuffer = $("progressBuffer");
  const progressKnob = $("progressKnob");
  const currentTimeEl = $("currentTime");
  const durationEl = $("duration");
  const volume = $("volume");
  const volVal = $("volVal");
  const trackTitle = $("trackTitle");
  const trackArtist = $("trackArtist");
  const trackListEl = $("trackList");
  const ytLink = $("ytLink");
  const buffering = $("buffering");
  const searchEl = $("search");
  const emptyMsg = $("emptyMsg");
  const statusEl = $("status");

  let player = null;
  let audio = null;
  let current = 0;
  let seeking = false;
  let ready = false;
  let filter = "";
  let muted = lsGet(LS.muted, "0") === "1";
  let volumeVal = parseInt(lsGet(LS.vol, "80"), 10);
  let shuffle = lsGet(LS.shuffle, "0") === "1";
  let repeat = lsGet(LS.repeat, "off");
  const durations = {};

  (function () {
    const lastId = lsGet(LS.last, "");
    const idx = TRACKS.findIndex((t) => t.id === lastId);
    if (idx >= 0) current = idx;
  })();

  function thumb(id) { return "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg"; }
  const MEME_COVER = "cover_meme.jpg";

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function isLocal() { return TRACKS[current] && TRACKS[current].local; }
  function pDuration() { return isLocal() ? (audio ? audio.duration || 0 : 0) : (player ? player.getDuration() : 0); }
  function pTime() { return isLocal() ? (audio ? audio.currentTime || 0 : 0) : (player ? player.getCurrentTime() : 0); }
  function pState() { if (isLocal()) { if (!audio) return 0; return audio.paused ? 2 : 1; } return player ? player.getPlayerState() : 0; }
  function pPlay() { if (isLocal()) { if (audio) audio.play(); } else if (player && ready) player.playVideo(); }
  function pPause() { if (isLocal()) { if (audio) audio.pause(); } else if (player) player.pauseVideo(); }
  function pSeek(sec) { if (isLocal()) { if (audio) audio.currentTime = sec; } else if (player) player.seekTo(sec, true); }
  function pVolume(v) { if (isLocal()) { if (audio) audio.volume = v / 100; } else if (player && ready) player.setVolume(v); }
  function pBuffer() {
    if (isLocal()) return (audio && audio.buffered && audio.buffered.length) ? audio.buffered.end(audio.buffered.length - 1) / (audio.duration || 1) : 0;
    return player && player.getVideoLoadedFraction ? player.getVideoLoadedFraction() : 0;
  }

  function ensureAudio() {
    if (audio) return;
    audio = new Audio();
    audio.preload = "auto";
    audio.addEventListener("play", () => { setPlayingUI(true); buffering.hidden = true; });
    audio.addEventListener("pause", () => { setPlayingUI(false); buffering.hidden = true; });
    audio.addEventListener("ended", () => next(true));
    audio.addEventListener("loadedmetadata", () => {
      const d = audio.duration;
      if (d) { durations[TRACKS[current].id] = d; durationEl.textContent = fmt(d); updateRowDuration(current); }
    });
  }

  function setCoverImg(id) {
    coverImg.onerror = function () {
      coverImg.onerror = function () {
        coverImg.onerror = function () {
          coverImg.onerror = null;
          coverImg.src = MEME_COVER;
        };
        coverImg.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
      };
      coverImg.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
    };
    coverImg.src = "https://i.ytimg.com/vi/" + id + "/maxresdefault.jpg";
  }

  function setPlayingUI(isPlaying) {
    document.body.classList.toggle("playing", isPlaying);
    cover.classList.toggle("playing", isPlaying);
    [playBtn, mainBtn].forEach((btn) => {
      const p = btn.querySelector(".icon-play");
      const q = btn.querySelector(".icon-pause");
      if (p) p.hidden = isPlaying;
      if (q) q.hidden = !isPlaying;
    });
    const activeEl = trackListEl.querySelector(".track.active");
    if (activeEl) activeEl.classList.toggle("playing", isPlaying);
  }

  function buildViz() {
    const viz = $("viz");
    for (let i = 0; i < 22; i++) {
      const s = document.createElement("span");
      s.style.animationDelay = (Math.random() * 2.4).toFixed(2) + "s";
      viz.appendChild(s);
    }
  }

  function applyMeta(i) {
    const t = TRACKS[i];
    trackTitle.textContent = t.title;
    trackArtist.textContent = t.artist;
    if (t.local) { coverImg.onerror = null; coverImg.src = t.cover || MEME_COVER; }
    else setCoverImg(t.id);
    if (t.local) { ytLink.href = "#"; ytLink.textContent = "Локальный трек (мой)"; }
    else { ytLink.href = "https://youtu.be/" + t.id; ytLink.textContent = "YouTube ↗"; }
    ytLink.style.display = "";
    lsSet(LS.last, t.id);
    if (statusEl) statusEl.hidden = true;
    highlightActive();
  }

  function highlightActive() {
    [...trackListEl.children].forEach((li) => {
      const idx = parseInt(li.dataset.index, 10);
      li.classList.toggle("active", idx === current);
    });
  }

  function renderPlaylist() {
    const countEl = $("trackCount");
    if (countEl) countEl.textContent = TRACKS.length;
    const q = filter.trim().toLowerCase();
    const list = TRACKS.map((t, i) => ({ t, i })).filter(
      ({ t }) => !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
    trackListEl.innerHTML = "";
    emptyMsg.hidden = list.length > 0;
    list.forEach(({ t, i }) => {
      const li = document.createElement("li");
      li.className = "track" + (i === current ? " active" : "");
      li.dataset.index = i;
      const dur = durations[t.id] ? fmt(durations[t.id]) : (t.local ? "—" : "—");
      const thumbSrc = t.local ? (t.cover || MEME_COVER) : thumb(t.id);
      const onerr = t.local ? "" : "onerror=\"this.onerror=null;this.src='" + MEME_COVER + "'\"";
      li.innerHTML =
        '<img class="track-thumb" src="' + thumbSrc + '" alt="" loading="lazy" ' + onerr + ">" +
        '<div class="track-info"><div class="track-name">' + t.title +
        '</div><div class="track-artist">' + t.artist + "</div></div>" +
        '<span class="track-dur">' + dur + "</span>" +
        '<div class="track-eq"><span></span><span></span><span></span><span></span></div>';
      li.addEventListener("click", () => selectTrack(i, true));
      trackListEl.appendChild(li);
    });
  }

  /* ---------- playback ---------- */
  function selectTrack(index, autoplay) {
    current = (index % TRACKS.length + TRACKS.length) % TRACKS.length;
    applyMeta(current);
    const t = TRACKS[current];
    if (t.local) {
      if (player) player.pauseVideo();
      ensureAudio();
      audio.src = t.src;
      audio.volume = (muted ? 0 : volumeVal) / 100;
      if (autoplay) audio.play();
    } else {
      if (audio) audio.pause();
      if (player && ready) {
        if (autoplay) player.loadVideoById(t.id);
        else player.cueVideoById(t.id);
      }
    }
  }

  function nextIndex() {
    if (shuffle && TRACKS.length > 1) {
      let r; do { r = Math.floor(Math.random() * TRACKS.length); } while (r === current);
      return r;
    }
    return (current + 1) % TRACKS.length;
  }
  function prevIndex() {
    if (shuffle && TRACKS.length > 1) {
      let r; do { r = Math.floor(Math.random() * TRACKS.length); } while (r === current);
      return r;
    }
    return (current - 1 + TRACKS.length) % TRACKS.length;
  }

  function next(auto) {
    if (auto && repeat === "one") {
      if (isLocal()) { ensureAudio(); audio.currentTime = 0; audio.play(); }
      else if (player) player.loadVideoById(TRACKS[current].id);
      return;
    }
    const nxt = nextIndex();
    if (auto && repeat === "off" && nxt === 0) { setPlayingUI(false); return; }
    selectTrack(nxt, true);
  }
  function prev() {
    if (pTime() > 3) pSeek(0);
    else selectTrack(prevIndex(), true);
  }

  let fadeTimer = null;
  function rampVolume(to, done) {
    if (!player || !ready) { done && done(); return; }
    if (fadeTimer) clearInterval(fadeTimer);
    const start = player.getVolume();
    const step = (to - start) / 18;
    let n = 0;
    fadeTimer = setInterval(function () {
      n++;
      const v = start + step * n;
      if (n >= 18) { clearInterval(fadeTimer); fadeTimer = null; player.setVolume(to); done && done(); }
      else player.setVolume(v);
    }, 28);
  }

  function toggle() {
    if (isLocal()) { ensureAudio(); if (audio.paused) audio.play(); else audio.pause(); return; }
    if (!player) return;
    const st = player.getPlayerState();
    if (st === YT.PlayerState.PLAYING) rampVolume(0, () => player.pauseVideo());
    else if (ready) { player.setVolume(0); player.playVideo(); rampVolume(muted ? 0 : volumeVal); }
  }

  /* ---------- toggles / volume ---------- */
  function syncToggles() {
    shuffleBtn.classList.toggle("active", shuffle);
    repeatBtn.classList.toggle("active", repeat !== "off");
    repeatBtn.classList.toggle("repeat-one-on", repeat === "one");
  }
  function applyVolume() {
    const v = muted ? 0 : volumeVal;
    pVolume(v);
    volume.value = v;
    volVal.textContent = v;
    muteBtn.querySelector(".vol-on").hidden = muted;
    muteBtn.querySelector(".vol-off").hidden = !muted;
  }
  function toggleMute() { muted = !muted; lsSet(LS.muted, muted ? "1" : "0"); applyVolume(); }

  /* ---------- share ---------- */
  function flashCopied() {
    shareBtn.classList.add("copied");
    const old = shareBtn.title;
    shareBtn.title = "Скопировано!";
    setTimeout(() => { shareBtn.classList.remove("copied"); shareBtn.title = old; }, 1400);
  }
  function copyText(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(flashCopied).catch(() => fallbackCopy(url));
    } else fallbackCopy(url);
  }
  function fallbackCopy(url) {
    const t = document.createElement("textarea");
    t.value = url; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); flashCopied(); } catch (e) {}
    document.body.removeChild(t);
  }

  /* ---------- YouTube API ---------- */
  function firstYouTubeId() { const t = TRACKS.find((x) => !x.local); return t ? t.id : ""; }

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("ytMount", {
      height: "1", width: "1",
      videoId: firstYouTubeId(),
      playerVars: {
        autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1,
        playsinline: 1, rel: 0, origin: window.location.origin, host: "https://www.youtube.com",
      },
      events: {
        onReady: function (e) {
          ready = true;
          applyVolume();
          const d = e.target.getDuration();
          if (d) { durations[TRACKS[current].id] = d; durationEl.textContent = fmt(d); updateRowDuration(current); }
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) { setPlayingUI(true); buffering.hidden = true; }
          else if (e.data === YT.PlayerState.BUFFERING) { buffering.hidden = false; }
          else if (e.data === YT.PlayerState.PAUSED) { setPlayingUI(false); buffering.hidden = true; }
          else if (e.data === YT.PlayerState.ENDED) { buffering.hidden = true; next(true); }
        },
        onError: function (e) {
          if (e.data === 101 || e.data === 150) {
            setPlayingUI(false); buffering.hidden = true;
            ytLink.textContent = "Этот трек нельзя встроить — открыть на YouTube ↗";
            ytLink.style.display = "block";
            if (statusEl) { statusEl.textContent = "Этот трек заблокирован для встраивания — откройте его на YouTube ↓"; statusEl.hidden = false; }
          }
        },
      },
    });
    startPolling();
  };

  setTimeout(function () {
    if (!ready && statusEl) {
      statusEl.textContent = "Не удалось подключиться к YouTube. Проверьте интернет/блокировщик или откройте трек по ссылке ниже ↓";
      statusEl.hidden = false;
      ytLink.style.display = "block";
    }
  }, 12000);

  function updateRowDuration(i) {
    const li = [...trackListEl.children].find((el) => parseInt(el.dataset.index, 10) === i);
    if (li) { const d = li.querySelector(".track-dur"); if (d) d.textContent = fmt(durations[TRACKS[i].id]); }
  }

  function startPolling() {
    setInterval(function () {
      if (seeking) return;
      const d = pDuration();
      const c = pTime();
      const pct = d ? (c / d) * 100 : 0;
      progressBar.style.width = pct + "%";
      progressKnob.style.left = pct + "%";
      currentTimeEl.textContent = fmt(c);
      if (d) durationEl.textContent = fmt(d);
      const bf = pBuffer();
      progressBuffer.style.width = (d ? bf * 100 : 0) + "%";
    }, 250);
  }

  /* ---------- events ---------- */
  playBtn.addEventListener("click", toggle);
  mainBtn.addEventListener("click", toggle);
  nextBtn.addEventListener("click", () => next(false));
  prevBtn.addEventListener("click", prev);
  rewindBtn.addEventListener("click", () => pSeek(Math.max(0, pTime() - 10)));
  forwardBtn.addEventListener("click", () => pSeek(pTime() + 10));

  shuffleBtn.addEventListener("click", () => { shuffle = !shuffle; lsSet(LS.shuffle, shuffle ? "1" : "0"); syncToggles(); });
  repeatBtn.addEventListener("click", () => { repeat = repeat === "off" ? "all" : repeat === "all" ? "one" : "off"; lsSet(LS.repeat, repeat); syncToggles(); });
  muteBtn.addEventListener("click", toggleMute);
  shareBtn.addEventListener("click", () => copyText(ytLink.href));
  volume.addEventListener("input", () => {
    volumeVal = parseInt(volume.value, 10);
    if (volumeVal > 0) muted = false;
    lsSet(LS.vol, String(volumeVal)); lsSet(LS.muted, muted ? "1" : "0");
    applyVolume();
  });

  function seekFromEvent(ev) {
    const d = pDuration();
    if (!d) return;
    const rect = progress.getBoundingClientRect();
    const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
    const ratio = Math.min(1, Math.max(0, x / rect.width));
    pSeek(ratio * d);
    progressBar.style.width = ratio * 100 + "%";
    progressKnob.style.left = ratio * 100 + "%";
    currentTimeEl.textContent = fmt(ratio * d);
  }
  progress.addEventListener("mousedown", (e) => { seeking = true; seekFromEvent(e); });
  progress.addEventListener("touchstart", (e) => { seeking = true; seekFromEvent(e); }, { passive: true });
  window.addEventListener("mousemove", (e) => { if (seeking) seekFromEvent(e); });
  window.addEventListener("touchmove", (e) => { if (seeking) seekFromEvent(e); }, { passive: true });
  window.addEventListener("mouseup", () => { seeking = false; });
  window.addEventListener("touchend", () => { seeking = false; });

  searchEl.addEventListener("input", () => { filter = searchEl.value; renderPlaylist(); });

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    switch (e.key) {
      case " ": e.preventDefault(); toggle(); break;
      case "ArrowRight": pSeek(pTime() + 5); break;
      case "ArrowLeft": pSeek(Math.max(0, pTime() - 5)); break;
      case "n": case "N": next(false); break;
      case "p": case "P": prev(); break;
      case "m": case "M": toggleMute(); break;
      case "s": case "S": shuffleBtn.click(); break;
      case "r": case "R": repeatBtn.click(); break;
    }
  });

  /* ---------- init ---------- */
  buildViz();
  applyVolume();
  syncToggles();
  renderPlaylist();
  selectTrack(current, false);
})();
