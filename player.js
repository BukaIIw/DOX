/* ============================================================
   DOX MUSIC — Liquid Glass Player v2
   Features:
   - Loads track library from tracks.json (160 base tracks)
   - YouTube Data API v3 integration for auto-loading up to 1000+ tracks
   - List virtualization for 1000+ tracks performance
   - Auto-skip + visual marking of blocked tracks (101/150)
   - Auto-mix by mood
   - RU/EN i18n
   ============================================================ */
(function () {
  "use strict";

  /* Will be loaded from tracks.json */
  let TRACKS = [];
  let TRACKS_LOADED = false;

  /* Mood analyzer — used both for static tracks and API-loaded ones */
  const PRESET_META = {
    phonk:    { mood: "dark",      energy: 0.55, color: "#9b59b6" },
    jumpstyle:{ mood: "energetic", energy: 0.85, color: "#e67e22" },
    lofi:     { mood: "chill",     energy: 0.30, color: "#3498db" },
    ambient:  { mood: "calm",      energy: 0.10, color: "#1abc9c" },
    rave:     { mood: "energetic", energy: 0.95, color: "#e74c3c" },
    darktrap: { mood: "dark",      energy: 0.60, color: "#8e44ad" },
  };

  const MOOD_KEYWORDS = [
    { match: ["phonk","kordhell","scopin","murder","ghost","metamorphosis","rapture","neon blade","slay","override","crystals","favela","montagem","dark phonk","drift"], mood: "dark",      energy: 0.7,  color: "#9b59b6" },
    { match: ["jumpstyle","jump","heavenly","священная","step back"],                                                                                 mood: "energetic", energy: 0.85, color: "#e67e22" },
    { match: ["rave","dxrk","midnight","playamane","eternxlkz","hardstyle","hardbass"],                                                                mood: "energetic", energy: 0.95, color: "#e74c3c" },
    { match: ["dream space","close eyes","sea of problems","dvrst","memory reboot","glichery","narvent","voj","lo-fi","lofi","chill"],                 mood: "chill",     energy: 0.35, color: "#3498db" },
    { match: ["грусный","реп","ярче","звёзд","speed","lida","luciyashi","tenderlybae","sped up"],                                                    mood: "chill",     energy: 0.45, color: "#f472b6" },
    { match: ["ambient","calm","meditation","relax"],                                                                                                  mood: "calm",      energy: 0.10, color: "#1abc9c" },
  ];

  function analyzeTrack(t) {
    if (t.preset && PRESET_META[t.preset]) return PRESET_META[t.preset];
    const hay = ((t.title || "") + " " + (t.artist || "")).toLowerCase();
    for (const k of MOOD_KEYWORDS) {
      if (k.match.some((m) => hay.includes(m))) return k;
    }
    return { mood: "chill", energy: 0.4, color: "#6b7286" };
  }

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
      localTrackLabel:  "Локальный трек",
      connectError:     "Не удалось подключиться к YouTube. Проверьте интернет/блокировщик.",
      moodAll:           "Все",
      loadMore:          "Загрузить ещё",
      loading:           "Загрузка…",
      loadAll:           "Загрузить до 1000 (Data API)",
      settings:          "Настройки",
      apiKeyLabel:       "YouTube Data API v3 ключ",
      apiKeyPlaceholder: "Вставьте API ключ",
      apiKeySave:        "Сохранить",
      apiKeyHelp:        "Без ключа доступно ~160 треков. С ключом — до 1000+",
      apiKeyHelpLink:    "Получить ключ →",
      loadMoreSuccess:   "Загружено новых треков: ",
      loadMoreError:     "Ошибка загрузки. Проверьте API ключ.",
      loadMoreNoKey:     "Введите API ключ в настройках",
      loadMoreEmpty:     "Больше нет треков по запросу",
      loadedAll:         "Загружены все доступные треки",
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
      localTrackLabel:  "Local track",
      connectError:     "Couldn't connect to YouTube. Check internet / blocker.",
      moodAll:           "All",
      loadMore:          "Load more",
      loading:           "Loading…",
      loadAll:           "Load up to 1000 (Data API)",
      settings:          "Settings",
      apiKeyLabel:       "YouTube Data API v3 key",
      apiKeyPlaceholder: "Paste API key",
      apiKeySave:        "Save",
      apiKeyHelp:        "Without key: ~160 tracks. With key: up to 1000+",
      apiKeyHelpLink:    "Get a key →",
      loadMoreSuccess:   "New tracks loaded: ",
      loadMoreError:     "Load error. Check your API key.",
      loadMoreNoKey:     "Enter API key in settings",
      loadMoreEmpty:     "No more tracks found",
      loadedAll:         "All available tracks loaded",
    },
  };

  /* ---------- localStorage helpers ---------- */
  const LS = {
    vol: "dox_vol", shuffle: "dox_shuffle", repeat: "dox_repeat",
    last: "dox_last", muted: "dox_muted", lang: "dox_lang", theme: "dox_theme",
    blocked: "dox_blocked", automix: "dox_automix_mood", apiKey: "dox_yt_apikey",
    nextToken: "dox_yt_nexttoken", searchQuery: "dox_yt_searchq",
  };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  let lang = lsGet(LS.lang, "ru");
  let theme = lsGet(LS.theme, "dark");
  let ytApiKey = lsGet(LS.apiKey, "");
  let ytNextPageToken = lsGet(LS.nextToken, "");
  let ytSearchQuery = lsGet(LS.searchQuery, "phonk OR jumpstyle OR rave phonk");

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
  const loadMoreBtn = $("loadMoreBtn");
  const loadAllBtn = $("loadAllBtn");
  const settingsBtn = $("settingsBtn");
  const settingsModal = $("settingsModal");
  const apiKeyInput = $("apiKeyInput");
  const apiKeySaveBtn = $("apiKeySaveBtn");
  const apiKeyStatus = $("apiKeyStatus");
  const settingsCloseBtn = $("settingsCloseBtn");
  const trackCountEl = $("trackCount");

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
  let autoMixMood = lsGet(LS.automix, "off");
  let autoMixActive = false;
  let autoMixQueue = [];
  let autoMixIndex = 0;
  let blockedIds = JSON.parse(lsGet(LS.blocked, "[]"));
  let durations = {};
  let loadingMore = false;

  /* ---------- List virtualization ---------- */
  const VIZ_ROW_HEIGHT = 64;       // approx height of a track row in px
  const VIZ_BUFFER = 6;            // extra rows above/below viewport
  let vizFirst = 0;
  let vizLast = 0;
  let vizFiltered = [];            // currently visible filtered list

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
      el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
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
    if (sun && moon) { sun.hidden = theme === "dark"; moon.hidden = theme === "light"; }
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
  function pTime()    { return isLocal() ? (audio ? audio.currentTime || 0 : 0) : (player ? player.getCurrentTime() : 0); }
  function pPlay()    { if (isLocal()) { if (audio) audio.play().catch(()=>{}); } else if (player && ready) player.playVideo(); }
  function pPause()   { if (isLocal()) { if (audio) audio.pause(); } else if (player) player.pauseVideo(); }
  function pSeek(sec) { if (isLocal()) { if (audio) audio.currentTime = sec; } else if (player) player.seekTo(sec, true); }
  function pVolume(v) { if (isLocal()) { if (audio) audio.volume = v / 100; } else if (player && ready) player.setVolume(v); }
  function pBuffer()  {
    if (isLocal()) return (audio && audio.buffered && audio.buffered.length) ? audio.buffered.end(audio.buffered.length - 1) / (audio.duration || 1) : 0;
    return player && player.getVideoLoadedFraction ? player.getVideoLoadedFraction() : 0;
  }

  function ensureAudio() {
    if (audio) return;
    audio = new Audio();
    audio.preload = "auto";
    audio.addEventListener("play",     () => { setPlayingUI(true);  buffering.hidden = true;  if (window.DOX_SHADER) DOX_SHADER.setPlaying(true); });
    audio.addEventListener("pause",    () => { setPlayingUI(false); buffering.hidden = true;  if (window.DOX_SHADER) DOX_SHADER.setPlaying(false); });
    audio.addEventListener("ended",    () => next(true));
    audio.addEventListener("loadedmetadata", () => {
      const d = audio.duration;
      if (d) { durations[TRACKS[current].id] = d; durationEl.textContent = fmt(d); updateRowDuration(current); }
    });
  }

  function setCoverImg(id) {
    coverImg.onerror = function () {
      coverImg.onerror = function () {
        coverImg.onerror = null;
        coverImg.src = MEME_COVER;
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
    moodLabel.textContent = analysis.mood.charAt(0).toUpperCase() + analysis.mood.slice(1);
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
    /* Update existing DOM rows — used for active state change without full re-render */
    [...trackListEl.querySelectorAll(".track")].forEach((li) => {
      const idx = parseInt(li.dataset.index, 10);
      li.classList.toggle("active", idx === current);
    });
  }

  function isBlocked(idx) {
    const tr = TRACKS[idx];
    return !tr.local && blockedIds.indexOf(tr.id) >= 0;
  }

  function thumb(id) { return "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg"; }
  const MEME_COVER = "art_balance.jpg";

  /* ---------- Render playlist (virtualized) ----------
     For performance with 1000+ tracks, we only render rows that are
     visible in the scroll viewport + a buffer of VIZ_BUFFER rows. */
  function computeFiltered() {
    const q = filter.trim().toLowerCase();
    vizFiltered = TRACKS.map((tr, i) => ({ tr, i })).filter(({ tr }) =>
      !q || tr.title.toLowerCase().includes(q) || tr.artist.toLowerCase().includes(q)
    );
  }

  function renderPlaylist() {
    if (trackCountEl) trackCountEl.textContent = TRACKS.length;
    computeFiltered();
    emptyMsg.hidden = vizFiltered.length > 0;
    renderVisibleRows();
  }

  function renderVisibleRows() {
    const listH = trackListEl.clientHeight;
    const scrollTop = trackListEl.scrollTop;
    const startIdx = Math.max(0, Math.floor(scrollTop / VIZ_ROW_HEIGHT) - VIZ_BUFFER);
    const endIdx = Math.min(vizFiltered.length, Math.ceil((scrollTop + listH) / VIZ_ROW_HEIGHT) + VIZ_BUFFER);

    /* Spacer top/bottom to keep scrollbar accurate */
    const topSpacer = startIdx * VIZ_ROW_HEIGHT;
    const bottomSpacer = Math.max(0, (vizFiltered.length - endIdx) * VIZ_ROW_HEIGHT);

    /* Build rows */
    const rows = [];
    if (topSpacer > 0) rows.push('<div class="viz-spacer" style="height:' + topSpacer + 'px"></div>');
    for (let k = startIdx; k < endIdx; k++) {
      const { tr, i } = vizFiltered[k];
      const dur = durations[tr.id] ? fmt(durations[tr.id]) : "—";
      const thumbSrc = tr.local ? (tr.cover || MEME_COVER) : thumb(tr.id);
      const onerr = tr.local ? "" : "onerror=\"this.onerror=null;this.src='" + MEME_COVER + "'\"";
      const warnHtml = isBlocked(i) ? '<span class="track-warn" title="' + t("blockedStatus") + '">⚠</span>' : "";
      rows.push(
        '<li class="track' + (i === current ? " active" : "") + (isBlocked(i) ? " blocked" : "") + '" data-index="' + i + '">' +
          '<img class="track-thumb" src="' + thumbSrc + '" alt="" loading="lazy" ' + onerr + ">" +
          '<div class="track-info"><div class="track-name">' + tr.title +
          '</div><div class="track-artist">' + tr.artist + "</div></div>" +
          warnHtml +
          '<span class="track-dur">' + dur + "</span>" +
          '<div class="track-eq"><span></span><span></span><span></span><span></span></div>' +
        "</li>"
      );
    }
    if (bottomSpacer > 0) rows.push('<div class="viz-spacer" style="height:' + bottomSpacer + 'px"></div>');

    trackListEl.innerHTML = rows.join("");

    /* Attach click handlers */
    [...trackListEl.querySelectorAll(".track")].forEach((li) => {
      li.addEventListener("click", () => {
        const idx = parseInt(li.dataset.index, 10);
        if (isBlocked(idx)) { toast(t("blockedToast"), "warn"); return; }
        selectTrack(idx, true);
      });
    });
  }

  function updateRowDuration(i) {
    const li = trackListEl.querySelector('.track[data-index="' + i + '"]');
    if (li) {
      const d = li.querySelector(".track-dur");
      if (d) d.textContent = fmt(durations[TRACKS[i].id]);
    }
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
    let guard = 0;
    while (isBlocked(nxt) && nxt !== current && guard < TRACKS.length) { nxt = (nxt + 1) % TRACKS.length; guard++; }
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
    let guard = 0;
    while (isBlocked(prv) && prv !== current && guard < TRACKS.length) { prv = (prv - 1 + TRACKS.length) % TRACKS.length; guard++; }
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

  /* ---------- YouTube IFrame API ---------- */
  function firstYouTubeId() {
    const t = TRACKS.find((x) => !x.local && blockedIds.indexOf(x.id) < 0);
    return t ? t.id : "";
  }

  function markBlocked(id) {
    if (blockedIds.indexOf(id) >= 0) return;
    blockedIds.push(id);
    lsSet(LS.blocked, JSON.stringify(blockedIds));
    renderVisibleRows();
    toast(t("blockedToast"), "warn");
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
      pool = pool.filter(({ tr }) => tr.analysis && tr.analysis.mood === mood);
    }
    pool.sort((a, b) => (a.tr.analysis ? a.tr.analysis.energy : 0.5) - (b.tr.analysis ? b.tr.analysis.energy : 0.5));
    const asc = pool;
    const desc = asc.slice().reverse();
    const half = Math.floor(asc.length / 2);
    const queue = [];
    for (let k = 0; k < asc.length; k++) if (k <= half) queue.push(asc[k].i);
    for (let k = desc.length - 1; k > half; k--) queue.push(desc[k].i);
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
  function toggleAutoMix() { if (autoMixActive) stopAutoMix(); else startAutoMix(); }

  function setAutoMixMood(mood) {
    autoMixMood = mood;
    lsSet(LS.automix, mood);
    [...moodChipsEl.querySelectorAll(".mood-chip")].forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.mood === mood);
    });
    if (autoMixActive) {
      autoMixQueue = buildAutoMixQueue(mood);
      autoMixIndex = 0;
      if (autoMixQueue.length > 0) selectTrack(autoMixQueue[0], true);
    }
  }

  /* ---------- Regenerate local track ---------- */
  function regenerateTrack() {
    regenBtn.classList.add("loading");
    const span = regenBtn.querySelector("span");
    if (span) span.textContent = t("regenerating");

    fetch("/api/regenerate", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.ok) {
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
        } else rotateLocalPreset();
      })
      .catch(() => rotateLocalPreset())
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

  /* ---------- YouTube Data API v3 — auto-load more tracks ---------- */
  /* Loads up to ~50 tracks per call using the search API.
     Continues from nextPageToken to reach 1000+ total. */
  async function loadMoreTracks(maxPages = 1) {
    if (loadingMore) return;
    if (!ytApiKey) {
      toast(t("loadMoreNoKey"), "warn");
      openSettings();
      return;
    }
    loadingMore = true;
    if (loadMoreBtn) {
      const span = loadMoreBtn.querySelector("span");
      if (span) span.textContent = t("loading");
    }

    let added = 0;
    let pages = 0;
    let pageToken = ytNextPageToken;

    try {
      while (pages < maxPages) {
        const url = "https://www.googleapis.com/youtube/v3/search"
          + "?part=snippet&type=video&videoEmbeddable=true"
          + "&videoCategoryId=10"   // Music
          + "&maxResults=50"
          + "&q=" + encodeURIComponent(ytSearchQuery)
          + "&key=" + encodeURIComponent(ytApiKey)
          + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");

        const resp = await fetch(url);
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error && errData.error.message ? errData.error.message : ("HTTP " + resp.status));
        }
        const data = await resp.json();

        if (!data.items || data.items.length === 0) {
          if (pages === 0) toast(t("loadMoreEmpty"), "warn");
          break;
        }

        const existingIds = new Set(TRACKS.map((t) => t.id));
        const newTracks = data.items
          .map((it) => ({
            id: it.id.videoId,
            title: (it.snippet.title || "").replace(/\s*\|\s*YouTube\s*$/i, "").trim(),
            artist: (it.snippet.channelTitle || "").replace(/\s*-\s*Topic$/i, "").trim(),
          }))
          .filter((tr) => tr.id && !existingIds.has(tr.id));

        newTracks.forEach((tr) => { tr.analysis = analyzeTrack(tr); });
        TRACKS = TRACKS.concat(newTracks);
        added += newTracks.length;

        pageToken = data.nextPageToken || "";
        pages++;
        if (!pageToken) break;
        if (TRACKS.length >= 1000) break;
      }

      ytNextPageToken = pageToken;
      lsSet(LS.nextToken, pageToken);
      renderPlaylist();

      if (added > 0) toast(t("loadMoreSuccess") + added + (pageToken ? "" : " (" + t("loadedAll") + ")"));
      else if (pages === 0) toast(t("loadMoreEmpty"), "warn");

      if (!pageToken && loadMoreBtn) loadMoreBtn.disabled = true;

    } catch (e) {
      console.error("[loadMore]", e);
      toast(t("loadMoreError"), "error");
      if (apiKeyStatus) apiKeyStatus.textContent = "Error: " + e.message;
    } finally {
      loadingMore = false;
      if (loadMoreBtn) {
        const span = loadMoreBtn.querySelector("span");
        if (span) span.textContent = t("loadMore");
      }
    }
  }

  async function loadUpTo1000() {
    /* Calculate how many pages of 50 we need to reach 1000 */
    const remaining = Math.max(0, 1000 - TRACKS.length);
    const pagesNeeded = Math.ceil(remaining / 50);
    if (pagesNeeded > 0) await loadMoreTracks(pagesNeeded);
  }

  /* ---------- Settings modal ---------- */
  function openSettings() {
    apiKeyInput.value = ytApiKey;
    if (apiKeyStatus) apiKeyStatus.textContent = ytApiKey ? "✓ " + (lang === "ru" ? "Ключ сохранён" : "Key saved") : "";
    settingsModal.classList.add("open");
  }
  function closeSettings() { settingsModal.classList.remove("open"); }

  function saveApiKey() {
    ytApiKey = apiKeyInput.value.trim();
    lsSet(LS.apiKey, ytApiKey);
    if (apiKeyStatus) apiKeyStatus.textContent = ytApiKey ? "✓ " + (lang === "ru" ? "Ключ сохранён" : "Key saved") : "";
    if (ytApiKey) {
      if (loadMoreBtn) loadMoreBtn.disabled = false;
      toast(lang === "ru" ? "Ключ сохранён — теперь можно загружать до 1000 треков" : "Key saved — load up to 1000 tracks now");
    }
  }

  /* ---------- Scroll handler for virtualization ---------- */
  let scrollRaf = null;
  function onPlaylistScroll() {
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(() => {
      renderVisibleRows();
      scrollRaf = null;
    });
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

  /* Load more events */
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", () => loadMoreTracks(1));
  if (loadAllBtn) loadAllBtn.addEventListener("click", loadUpTo1000);

  /* Settings events */
  if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
  if (settingsCloseBtn) settingsCloseBtn.addEventListener("click", closeSettings);
  if (apiKeySaveBtn) apiKeySaveBtn.addEventListener("click", saveApiKey);
  if (apiKeyInput) {
    apiKeyInput.addEventListener("keydown", (e) => { if (e.key === "Enter") saveApiKey(); });
  }
  /* Close modal on backdrop click */
  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) closeSettings();
    });
  }

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

  /* Playlist scroll for virtualization */
  trackListEl.addEventListener("scroll", onPlaylistScroll, { passive: true });

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
      case "+": loadMoreTracks(1); break;
      case "Escape": closeSettings(); break;
    }
  });

  /* ---------- Init: load tracks.json ---------- */
  function restoreLastIndex() {
    const lastId = lsGet(LS.last, "");
    const idx = TRACKS.findIndex((t) => t.id === lastId);
    if (idx >= 0) current = idx;
  }

  async function init() {
    applyTheme();
    applyI18n();
    buildViz();
    applyVolume();
    syncToggles();
    setAutoMixMood(autoMixMood);

    /* Try to load tracks.json */
    try {
      const resp = await fetch("tracks.json");
      if (resp.ok) {
        const data = await resp.json();
        TRACKS = data.tracks || [];
        TRACKS.forEach((tr) => { tr.analysis = analyzeTrack(tr); });
        TRACKS_LOADED = true;
        console.log("[dox] loaded " + TRACKS.length + " tracks from tracks.json");
      } else throw new Error("HTTP " + resp.status);
    } catch (e) {
      console.warn("[dox] tracks.json not found, using empty library", e);
      TRACKS = [];
    }

    if (TRACKS.length === 0) {
      if (statusEl) {
        statusEl.textContent = lang === "ru"
          ? "Не удалось загрузить tracks.json. Запустите python build_tracks.py"
          : "Failed to load tracks.json. Run python build_tracks.py";
        statusEl.hidden = false;
      }
      return;
    }

    restoreLastIndex();
    renderPlaylist();
    selectTrack(current, false);
  }

  init();
})();
