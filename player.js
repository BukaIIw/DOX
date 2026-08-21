/* ============================================================
   DOX MUSIC — Liquid Glass Player
   - YouTube IFrame API + local WAV playback
   - Auto-skip + visual marking of blocked tracks (101/150)
   - Auto-mix by mood (analyzes track title/artist)
   - RU/EN i18n with localStorage persistence
   - Random track generator (regenerates my_track.wav)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Track library with mood tags ----------
     Each track gets analyzed into: { mood, energy, bpm }
     based on keywords in title/artist. YouTube tracks keep
     their ID; local tracks reference the WAV files. */
  const TRACKS = [
    // Local procedural tracks
    { id: "myown",   local: true, src: "my_track.wav",        title: "My Own Track (DOX)",     artist: "AI Agent",     cover: "art_balance.jpg", preset: "rave" },
    { id: "gen_phonk",    local: true, src: "track_phonk.wav",    title: "Phonk — Procedural",    artist: "DOX Generator", cover: "art_balance.jpg", preset: "phonk" },
    { id: "gen_jump",     local: true, src: "track_jumpstyle.wav", title: "Jumpstyle — Procedural", artist: "DOX Generator", cover: "art_balance.jpg", preset: "jumpstyle" },
    { id: "gen_lofi",     local: true, src: "track_lofi.wav",     title: "Lo-Fi — Procedural",    artist: "DOX Generator", cover: "art_balance.jpg", preset: "lofi" },
    { id: "gen_ambient",  local: true, src: "track_ambient.wav",  title: "Ambient — Procedural",  artist: "DOX Generator", cover: "art_balance.jpg", preset: "ambient" },
    { id: "gen_rave",     local: true, src: "track_rave.wav",     title: "Rave — Procedural",     artist: "DOX Generator", cover: "art_balance.jpg", preset: "rave" },
    { id: "gen_darktrap", local: true, src: "track_darktrap.wav", title: "Dark Trap — Procedural", artist: "DOX Generator", cover: "art_balance.jpg", preset: "darktrap" },

    // YouTube tracks
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

  /* ---------- Mood analyzer ----------
     Maps track title/artist to a mood category + energy score. */
  const PRESET_META = {
    phonk:    { mood: "dark",      energy: 0.55, color: "#9b59b6", labelRu: "Тёмный",    labelEn: "Dark" },
    jumpstyle:{ mood: "energetic", energy: 0.85, color: "#e67e22", labelRu: "Энергичный", labelEn: "Energetic" },
    lofi:     { mood: "chill",     energy: 0.30, color: "#3498db", labelRu: "Чилл",      labelEn: "Chill" },
    ambient:  { mood: "calm",      energy: 0.10, color: "#1abc9c", labelRu: "Спокойный", labelEn: "Calm" },
    rave:     { mood: "energetic", energy: 0.95, color: "#e74c3c", labelRu: "Энергичный", labelEn: "Energetic" },
    darktrap: { mood: "dark",      energy: 0.60, color: "#8e44ad", labelRu: "Тёмный",    labelEn: "Dark" },
  };

  const MOOD_KEYWORDS = [
    { match: ["phonk","kordhell","scopin","murder","ghost","metamorphosis","rapture","neon blade","slay","override","crystals","favela","montagem"], mood: "dark",      energy: 0.7, color: "#9b59b6" },
    { match: ["jumpstyle","jump","heavenly","священная","step back"],                                                mood: "energetic", energy: 0.85, color: "#e67e22" },
    { match: ["rave","dxrk","midnight","playamane","eternxlkz"],                                                     mood: "energetic", energy: 0.95, color: "#e74c3c" },
    { match: ["dream space","close eyes","sea of problems","dvrst","memory reboot","glichery","narvent","voj"],     mood: "chill",     energy: 0.35, color: "#3498db" },
    { match: ["грусный","реп","ярче","звёзд","speed","lida","luciyashi","tenderlybae"],                              mood: "chill",     energy: 0.45, color: "#f472b6" },
    { match: ["ambient","calm","meditation","relax"],                                                                mood: "calm",      energy: 0.10, color: "#1abc9c" },
  ];

  function analyzeTrack(t) {
    if (t.preset && PRESET_META[t.preset]) {
      return PRESET_META[t.preset];
    }
    const hay = ((t.title || "") + " " + (t.artist || "")).toLowerCase();
    for (const k of MOOD_KEYWORDS) {
      if (k.match.some((m) => hay.includes(m))) {
        return k;
      }
    }
    return { mood: "chill", energy: 0.4, color: "#6b7286" };
  }

  /* Attach analysis */
  TRACKS.forEach((t) => { t.analysis = analyzeTrack(t); });

  /* ---------- i18n ---------- */
  const I18N = {
    ru: {
      nowPlaying:      "сейчас играет",
      playlist:         "Плейлист",
      autoMix:          "Авто-микс",
      off:              "выкл",
      on:               "вкл",
      tracks:           "треков",
      searchPlaceholder:"Поиск по трекам…",
      notFound:         "Ничего не найдено",
      startAutoMix:     "Запустить авто-микс",
      stopAutoMix:      "Остановить авто-микс",
      regenerate:       "Сгенерировать новый",
      regenerating:     "Генерация…",
      regenerated:      "Новый трек сгенерирован",
      blockedHint:      "⚠ — трек недоступен и пропущен автоматически",
      blockedToast:     "Трек недоступен — авто-пропуск",
      blockedStatus:    "Этот трек нельзя встроить — помечен и пропущен",
      mutedLabel:       "Звук",
      shuffleLabel:     "Перемешать",
      repeatLabel:      "Повтор",
      prevLabel:        "Предыдущий",
      nextLabel:        "Следующий",
      rewindLabel:      "Назад 10 сек",
      forwardLabel:     "Вперёд 10 сек",
      shareLabel:       "Скопировать ссылку",
      copiedLabel:      "Скопировано!",
      localTrackLabel:  "Локальный трек",
      connectError:     "Не удалось подключиться к YouTube. Проверьте интернет/блокировщик.",
      moodAll:           "Все",
      langLabel:         "RU",
    },
    en: {
      nowPlaying:      "now playing",
      playlist:         "Playlist",
      autoMix:          "Auto-Mix",
      off:              "off",
      on:               "on",
      tracks:           "tracks",
      searchPlaceholder:"Search tracks…",
      notFound:         "Nothing found",
      startAutoMix:     "Start auto-mix",
      stopAutoMix:      "Stop auto-mix",
      regenerate:       "Generate new",
      regenerating:     "Generating…",
      regenerated:      "New track generated",
      blockedHint:      "⚠ — track unavailable, auto-skipped",
      blockedToast:     "Track unavailable — auto-skipped",
      blockedStatus:    "This track can't be embedded — marked and skipped",
      mutedLabel:       "Volume",
      shuffleLabel:     "Shuffle",
      repeatLabel:      "Repeat",
      prevLabel:        "Previous",
      nextLabel:        "Next",
      rewindLabel:      "Back 10s",
      forwardLabel:     "Forward 10s",
      shareLabel:       "Copy link",
      copiedLabel:      "Copied!",
      localTrackLabel:  "Local track",
      connectError:     "Couldn't connect to YouTube. Check internet / blocker.",
      moodAll:           "All",
      langLabel:         "EN",
    },
  };

  /* ---------- localStorage helpers ---------- */
  const LS = {
    vol: "dox_vol", shuffle: "dox_shuffle", repeat: "dox_repeat",
    last: "dox_last", muted: "dox_muted", lang: "dox_lang", theme: "dox_theme",
    blocked: "dox_blocked", automix: "dox_automix_mood",
  };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  let lang = lsGet(LS.lang, "ru");
  let theme = lsGet(LS.theme, "dark");

  /* ---------- DOM ---------- */
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
  const trackTitle = $("trackTitle");
  const trackArtist = $("trackArtist");
  const trackListEl = $("trackList");
  const ytLink = $("ytLink");
  const buffering = $("buffering");
  const searchEl = $("search");
  const emptyMsg = $("emptyMsg");
  const statusEl = $("status");
  const moodBadge = $("moodBadge");
  const moodDot = $("moodDot");
  const moodLabel = $("moodLabel");
  const autoMixBtn = $("autoMixBtn");
  const autoMixStatus = $("autoMixStatus");
  const regenBtn = $("regenBtn");
  const langBtn = $("langBtn");
  const langLabel = $("langLabel");
  const themeBtn = $("themeBtn");
  const toastEl = $("toast");
  const moodChipsEl = $("moodChips");

  /* ---------- State ---------- */
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
  let autoMixMood = lsGet(LS.automix, "off"); // off | all | dark | energetic | chill | calm
  let autoMixActive = false;
  let autoMixQueue = [];
  let autoMixIndex = 0;
  let blockedIds = JSON.parse(lsGet(LS.blocked, "[]"));
  const durations = {};

  /* Restore last played */
  (function () {
    const lastId = lsGet(LS.last, "");
    const idx = TRACKS.findIndex((t) => t.id === lastId);
    if (idx >= 0) current = idx;
  })();

  function thumb(id) { return "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg"; }
  const MEME_COVER = "art_balance.jpg";

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function t(key) { return I18N[lang][key] || key; }

  function applyI18n() {
    document.documentElement.setAttribute("data-lang", lang);
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        // skip; placeholder handled separately
      } else {
        el.textContent = t(key);
      }
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const key = el.getAttribute("data-i18n-ph");
      el.setAttribute("placeholder", t(key));
    });
    langLabel.textContent = lang.toUpperCase();
    if (autoMixActive) {
      autoMixBtn.querySelector("span").textContent = t("stopAutoMix");
      autoMixStatus.textContent = t("on");
    } else {
      autoMixBtn.querySelector("span").textContent = t("startAutoMix");
      autoMixStatus.textContent = t("off");
    }
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", theme);
    const sun = themeBtn.querySelector(".icon-sun");
    const moon = themeBtn.querySelector(".icon-moon");
    if (sun && moon) {
      sun.hidden = theme === "dark";
      moon.hidden = theme === "light";
    }
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(msg, type) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = "toast show" + (type ? " " + type : "");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.className = "toast"; }, 2600);
  }

  /* ---------- Playback abstraction ---------- */
  function isLocal() { return TRACKS[current] && TRACKS[current].local; }
  function pDuration() { return isLocal() ? (audio ? audio.duration || 0 : 0) : (player ? player.getDuration() : 0); }
  function pTime() { return isLocal() ? (audio ? audio.currentTime || 0 : 0) : (player ? player.getCurrentTime() : 0); }
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
    audio.addEventListener("play",     () => { setPlayingUI(true);  buffering.hidden = true;  if (window.DOX_SHADER) DOX_SHADER.setPlaying(true); });
    audio.addEventListener("pause",    () => { setPlayingUI(false); buffering.hidden = true;  if (window.DOX_SHADER) DOX_SHADER.setPlaying(false); });
    audio.addEventListener("ended",   () => next(true));
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
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("span");
      s.style.animationDelay = (Math.random() * 2.4).toFixed(2) + "s";
      viz.appendChild(s);
    }
  }

  function applyMoodBadge(analysis) {
    if (!analysis) { moodBadge.hidden = true; return; }
    moodBadge.hidden = false;
    moodDot.style.background = analysis.color;
    moodDot.style.color = analysis.color;
    const label = lang === "ru"
      ? (PRESET_META[Object.keys(PRESET_META).find((k) => PRESET_META[k].mood === analysis.mood && PRESET_META[k].energy === analysis.energy)] || {}).labelRu
        || analysis.mood.charAt(0).toUpperCase() + analysis.mood.slice(1)
      : analysis.mood.charAt(0).toUpperCase() + analysis.mood.slice(1);
    moodLabel.textContent = label;
    if (window.DOX_SHADER) DOX_SHADER.setEnergy(analysis.energy);
  }

  function applyMeta(i) {
    const tr = TRACKS[i];
    trackTitle.textContent = tr.title;
    trackArtist.textContent = tr.artist;
    if (tr.local) { coverImg.onerror = null; coverImg.src = tr.cover || MEME_COVER; }
    else setCoverImg(tr.id);
    if (tr.local) { ytLink.href = "#"; ytLink.textContent = t("localTrackLabel"); }
    else { ytLink.href = "https://youtu.be/" + tr.id; ytLink.textContent = "YouTube ↗"; }
    ytLink.style.display = "";
    lsSet(LS.last, tr.id);
    if (statusEl) statusEl.hidden = true;
    applyMoodBadge(tr.analysis);
    highlightActive();
  }

  function highlightActive() {
    [...trackListEl.children].forEach((li) => {
      const idx = parseInt(li.dataset.index, 10);
      li.classList.toggle("active", idx === current);
    });
  }

  function isBlocked(idx) {
    const tr = TRACKS[idx];
    return !tr.local && blockedIds.indexOf(tr.id) >= 0;
  }

  function renderPlaylist() {
    const countEl = $("trackCount");
    if (countEl) countEl.textContent = TRACKS.length;
    const q = filter.trim().toLowerCase();
    const list = TRACKS.map((tr, i) => ({ tr, i })).filter(
      ({ tr }) => !q || tr.title.toLowerCase().includes(q) || tr.artist.toLowerCase().includes(q)
    );
    trackListEl.innerHTML = "";
    emptyMsg.hidden = list.length > 0;
    list.forEach(({ tr, i }) => {
      const li = document.createElement("li");
      li.className = "track" + (i === current ? " active" : "") + (isBlocked(i) ? " blocked" : "");
      li.dataset.index = i;
      const dur = durations[tr.id] ? fmt(durations[tr.id]) : "—";
      const thumbSrc = tr.local ? (tr.cover || MEME_COVER) : thumb(tr.id);
      const onerr = tr.local ? "" : "onerror=\"this.onerror=null;this.src='" + MEME_COVER + "'\"";
      const warnHtml = isBlocked(i) ? '<span class="track-warn" title="' + t("blockedStatus") + '">⚠</span>' : "";
      li.innerHTML =
        '<img class="track-thumb" src="' + thumbSrc + '" alt="" loading="lazy" ' + onerr + ">" +
        '<div class="track-info"><div class="track-name">' + tr.title +
        '</div><div class="track-artist">' + tr.artist + "</div></div>" +
        warnHtml +
        '<span class="track-dur">' + dur + "</span>" +
        '<div class="track-eq"><span></span><span></span><span></span><span></span></div>';
      li.addEventListener("click", () => {
        if (isBlocked(i)) { toast(t("blockedToast"), "warn"); return; }
        selectTrack(i, true);
      });
      trackListEl.appendChild(li);
    });
  }

  /* ---------- Playback selection ---------- */
  function selectTrack(index, autoplay) {
    current = (index % TRACKS.length + TRACKS.length) % TRACKS.length;
    applyMeta(current);
    const tr = TRACKS[current];
    if (tr.local) {
      if (player) player.pauseVideo();
      ensureAudio();
      audio.src = tr.src;
      audio.volume = (muted ? 0 : volumeVal) / 100;
      if (autoplay) audio.play().catch(() => {});
    } else {
      if (audio) audio.pause();
      if (player && ready) {
        if (autoplay) player.loadVideoById(tr.id);
        else player.cueVideoById(tr.id);
      }
    }
  }

  function nextIndex() {
    if (autoMixActive && autoMixQueue.length > 0) {
      autoMixIndex = (autoMixIndex + 1) % autoMixQueue.length;
      return autoMixQueue[autoMixIndex];
    }
    if (shuffle && TRACKS.length > 1) {
      let r; do { r = Math.floor(Math.random() * TRACKS.length); } while (r === current || isBlocked(r));
      return r;
    }
    let nxt = (current + 1) % TRACKS.length;
    while (isBlocked(nxt) && nxt !== current) nxt = (nxt + 1) % TRACKS.length;
    return nxt;
  }
  function prevIndex() {
    if (autoMixActive && autoMixQueue.length > 0) {
      autoMixIndex = (autoMixIndex - 1 + autoMixQueue.length) % autoMixQueue.length;
      return autoMixQueue[autoMixIndex];
    }
    if (shuffle && TRACKS.length > 1) {
      let r; do { r = Math.floor(Math.random() * TRACKS.length); } while (r === current || isBlocked(r));
      return r;
    }
    let prv = (current - 1 + TRACKS.length) % TRACKS.length;
    while (isBlocked(prv) && prv !== current) prv = (prv - 1 + TRACKS.length) % TRACKS.length;
    return prv;
  }

  function next(auto) {
    if (auto && repeat === "one") {
      if (isLocal()) { ensureAudio(); audio.currentTime = 0; audio.play().catch(() => {}); }
      else if (player) player.loadVideoById(TRACKS[current].id);
      return;
    }
    const nxt = nextIndex();
    if (auto && repeat === "off" && nxt === 0 && !autoMixActive) { setPlayingUI(false); return; }
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
    if (isLocal()) { ensureAudio(); if (audio.paused) audio.play().catch(() => {}); else audio.pause(); return; }
    if (!player) return;
    const st = player.getPlayerState();
    if (st === YT.PlayerState.PLAYING) rampVolume(0, () => player.pauseVideo());
    else if (ready) { player.setVolume(0); player.playVideo(); rampVolume(muted ? 0 : volumeVal); }
  }

  /* ---------- Toggles / volume ---------- */
  function syncToggles() {
    shuffleBtn.classList.toggle("active", shuffle);
    repeatBtn.classList.toggle("active", repeat !== "off");
    repeatBtn.classList.toggle("repeat-one-on", repeat === "one");
  }
  function applyVolume() {
    const v = muted ? 0 : volumeVal;
    pVolume(v);
    volume.value = v;
    muteBtn.querySelector(".vol-on").hidden = muted;
    muteBtn.querySelector(".vol-off").hidden = !muted;
  }
  function toggleMute() { muted = !muted; lsSet(LS.muted, muted ? "1" : "0"); applyVolume(); }

  /* ---------- Share ---------- */
  function flashCopied() {
    shareBtn.classList.add("copied");
    const old = shareBtn.title;
    shareBtn.title = t("copiedLabel");
    setTimeout(() => { shareBtn.classList.remove("copied"); shareBtn.title = old; }, 1400);
  }
  function copyText(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(flashCopied).catch(() => fallbackCopy(url));
    } else fallbackCopy(url);
  }
  function fallbackCopy(url) {
    const ta = document.createElement("textarea");
    ta.value = url; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); flashCopied(); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---------- YouTube API ---------- */
  function firstYouTubeId() {
    const t = TRACKS.find((x) => !x.local && blockedIds.indexOf(x.id) < 0);
    return t ? t.id : "";
  }

  /* Mark a track as blocked */
  function markBlocked(id) {
    if (blockedIds.indexOf(id) >= 0) return;
    blockedIds.push(id);
    lsSet(LS.blocked, JSON.stringify(blockedIds));
    renderPlaylist();
    toast(t("blockedToast"), "warn");
  }

  /* Reset blocked list (long-press / shift-click on warn icon would call this) */
  function resetBlocked() {
    blockedIds = [];
    lsSet(LS.blocked, "[]");
    renderPlaylist();
    toast(lang === "ru" ? "Список недоступных сброшен" : "Blocked list reset", "warn");
  }

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
          if (e.data === YT.PlayerState.PLAYING) { setPlayingUI(true);  buffering.hidden = true;  if (window.DOX_SHADER) DOX_SHADER.setPlaying(true); }
          else if (e.data === YT.PlayerState.BUFFERING) { buffering.hidden = false; }
          else if (e.data === YT.PlayerState.PAUSED)   { setPlayingUI(false); buffering.hidden = true;  if (window.DOX_SHADER) DOX_SHADER.setPlaying(false); }
          else if (e.data === YT.PlayerState.ENDED)    { buffering.hidden = true; next(true); }
        },
        onError: function (e) {
          if (e.data === 101 || e.data === 150) {
            const tr = TRACKS[current];
            if (tr && !tr.local) {
              markBlocked(tr.id);
              setPlayingUI(false); buffering.hidden = true;
              ytLink.textContent = t("blockedStatus");
              ytLink.style.display = "block";
              if (statusEl) { statusEl.textContent = t("blockedStatus"); statusEl.hidden = false; }
              /* Auto-skip after a short delay */
              setTimeout(() => next(true), 600);
            }
          }
        },
      },
    });
    startPolling();
  };

  setTimeout(function () {
    if (!ready && statusEl) {
      statusEl.textContent = t("connectError");
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

  /* ---------- Auto-mix ---------- */
  function buildAutoMixQueue(mood) {
    let pool = TRACKS.map((tr, i) => ({ tr, i }));
    if (mood !== "all") {
      pool = pool.filter(({ tr }) => tr.analysis.mood === mood);
    }
    /* Sort by energy (ascending — soft start, peak, then cool-down) */
    pool.sort((a, b) => a.tr.analysis.energy - b.tr.analysis.energy);

    /* Build a curve: ascending -> peak -> descending */
    const asc = pool.slice();
    const desc = asc.slice().reverse();
    const half = Math.floor(asc.length / 2);
    const queue = [];
    for (let k = 0; k < asc.length; k++) {
      if (k <= half) queue.push(asc[k].i);
    }
    for (let k = desc.length - 1; k > half; k--) {
      queue.push(desc[k].i);
    }
    /* De-duplicate */
    return [...new Set(queue)];
  }

  function startAutoMix() {
    autoMixActive = true;
    autoMixQueue = buildAutoMixQueue(autoMixMood);
    autoMixIndex = 0;
    autoMixBtn.classList.add("active");
    autoMixStatus.classList.add("active");
    applyI18n();
    if (autoMixQueue.length === 0) {
      toast(lang === "ru" ? "Нет треков в этом настроении" : "No tracks in this mood", "warn");
      stopAutoMix();
      return;
    }
    selectTrack(autoMixQueue[0], true);
    toast(lang === "ru" ? "Авто-микс запущен (" + autoMixMood + ")" : "Auto-mix started (" + autoMixMood + ")");
  }

  function stopAutoMix() {
    autoMixActive = false;
    autoMixBtn.classList.remove("active");
    autoMixStatus.classList.remove("active");
    applyI18n();
  }

  function toggleAutoMix() {
    if (autoMixActive) stopAutoMix();
    else startAutoMix();
  }

  function setAutoMixMood(mood) {
    autoMixMood = mood;
    lsSet(LS.automix, mood);
    [...moodChipsEl.querySelectorAll(".mood-chip")].forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.mood === mood);
    });
    if (autoMixActive) {
      /* Rebuild queue with new mood */
      autoMixQueue = buildAutoMixQueue(mood);
      autoMixIndex = 0;
      if (autoMixQueue.length > 0) selectTrack(autoMixQueue[0], true);
    }
  }

  /* ---------- Regenerate local track (calls Python script via dev server) ---------- */
  /* In a static deployment, this falls back to cycling through the 6 generated presets. */
  function regenerateTrack() {
    regenBtn.classList.add("loading");
    const span = regenBtn.querySelector("span");
    if (span) span.textContent = t("regenerating");

    /* Try to invoke the generator via a local endpoint (if served by Python).
       Otherwise, rotate through preset tracks. */
    fetch("/api/regenerate", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.ok) {
          /* Force reload of the audio src */
          const tr = TRACKS.find((x) => x.id === "myown");
          if (tr) {
            tr.src = "my_track.wav?v=" + Date.now();
            toast(t("regenerated"));
            if (current === TRACKS.indexOf(tr)) {
              ensureAudio();
              audio.src = tr.src;
              audio.play().catch(() => {});
            }
          }
        } else {
          rotateLocalPreset();
        }
      })
      .catch(() => {
        /* Static deployment fallback: pick a random preset track */
        rotateLocalPreset();
      })
      .finally(() => {
        regenBtn.classList.remove("loading");
        if (span) span.textContent = t("regenerate");
      });
  }

  function rotateLocalPreset() {
    const localTracks = TRACKS.filter((tr) => tr.local && tr.id !== "myown");
    const nextLocal = localTracks[Math.floor(Math.random() * localTracks.length)];
    if (nextLocal) {
      selectTrack(TRACKS.indexOf(nextLocal), true);
      toast(t("regenerated"));
    }
  }

  /* ---------- Events ---------- */
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

  /* Auto-mix events */
  autoMixBtn.addEventListener("click", toggleAutoMix);
  regenBtn.addEventListener("click", regenerateTrack);
  moodChipsEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".mood-chip");
    if (chip) setAutoMixMood(chip.dataset.mood);
  });

  /* Lang & theme toggles */
  langBtn.addEventListener("click", () => {
    lang = lang === "ru" ? "en" : "ru";
    lsSet(LS.lang, lang);
    applyI18n();
    renderPlaylist();
  });
  themeBtn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    lsSet(LS.theme, theme);
    applyTheme();
  });

  /* Keyboard shortcuts */
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    switch (e.key) {
      case " ":  e.preventDefault(); toggle(); break;
      case "ArrowRight": pSeek(pTime() + 5); break;
      case "ArrowLeft":  pSeek(Math.max(0, pTime() - 5)); break;
      case "n": case "N": next(false); break;
      case "p": case "P": prev(); break;
      case "m": case "M": toggleMute(); break;
      case "s": case "S": shuffleBtn.click(); break;
      case "r": case "R": repeatBtn.click(); break;
      case "a": case "A": toggleAutoMix(); break;
      case "g": case "G": regenerateTrack(); break;
      case "l": case "L": langBtn.click(); break;
    }
  });

  /* ---------- Init ---------- */
  applyTheme();
  applyI18n();
  buildViz();
  applyVolume();
  syncToggles();
  setAutoMixMood(autoMixMood);
  renderPlaylist();
  selectTrack(current, false);
})();
