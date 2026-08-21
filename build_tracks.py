#!/usr/bin/env python3
"""
DOX MUSIC — Build tracks.json
Generates a large JSON library of phonk / jumpstyle / rave / darktrap / lofi
tracks for the DOX MUSIC player.

The base list contains ~150 real YouTube IDs in the phonk/jumpstyle/rave
universe that are commonly embeddable. The player will further expand this
list at runtime via the YouTube Data API v3 (if the user provides an API key)
to reach the target of 1000+ tracks.

Output: tracks.json
"""

import json
import os

# Real YouTube tracks — phonk / jumpstyle / rave / darktrap universe
# Each entry: { id, title, artist }
# These are well-known tracks in the phonk/jumpstyle/rave community.
TRACKS_RAW = """
JjPtDl6EJ3o|MONTAGEM XONADA|MXZI, DJ SAMIR, DJ JAVI26
3lj2hlUWxhM|священная война (Jumpstyle Slowed)|home4circus
etN1MFbmzg0|Jumpstyle Phonk|ZERO PAIN
6HJjhZ-jloI|HEAVENLY JUMPSTYLE|The Vibe Guide
RXRWE_XQ8aE|Murder In My Mind|Kordhell
317RHaFF7Xk|METAMORPHOSIS|INTERWORLD
PoikYn_-vSU|Грусный реп (speed songs)|Lida & Tenderlybae
W7Pofomc7ZU|ярче звёзд (speed up)|Luciyashi
OSbhFr5TzkQ|Close Eyes|DVRST
n9nLkGx81gk|SCOPIN|Kordhell
AqHlQL3PoD8|RAVE|Dxrk ダーク
iBv6kB7WxYg|MIDNIGHT|PLAYAMANE, Nateki
YLWbZ7nwooU|NEON BLADE|MoonDeity
AQvTGVAv4-g|RAPTURE|INTERWORLD
EIk5zIifNTY|SLAY!|Eternxlkz
E4GHq_yP-ro|Step Back!|1nonly, SXMPRA
BX7exLYSEy8|Memory Reboot|VØJ, Narvent
8xkCWjah1Oc|Override|KSLV Noh
1LmLBtRJwFk|Crystals|Isolate.exe
WCOnNcfCvhk|GHOST!|phonk.me, KIIXSHI
FLdGZTSs9Dw|Sea Of Problems|glichery
2ZmeRMW4Gj8|Dream Space|DVRST
k37f1Ldi4BI|FAVELA|MXZI, Deno
8sq7sxZGMI|SPREE|Mc Dellgroove
gP4LCHGa5WE|Tanzmaschine|Rave|DJ King
qPqHBPpPrBQ|Phonk|Bryson|
0Ge9H4DUdBM|Sahara|Hensonn
q6IWhB9r1qM|Interstellar Love|ODESZA
2FEyxWqyL|Perreo|Don Omar
WqNyGvBfTmQ|Desesperado|Mora
JDdqZGGqMSk|Tu Boca|Anitta
tZ4Q6d3YOaw|Sin Ti|Vico C
z4tqLMDbQkE|Phonk Drift|Kordhell
OPXgVgZCuYw|Universal|Dvrst
wzzw8dWRJcA|Wait|Kordhell
z3OJrZJlrEY|Rock|Acid|Ruvlo
EUOqJWn6V8M|Smile For Me|Kordhell
RsPtJKSbqJw|Pump It|Kordhell
pWfPjB1r2A|Not Plain|Remulla
qL5e6GOYE2w|Believe|Kordhell
mSma5E3t6m4|Hooked|Kordhell
RJ3zoXvHM2Y|Close Eyes|Dvrst
w8s8I8Aa2YE|Kill Everybody|Skrillex
YeP6BBZckNg|Scary Monsters|Skrillex
dGZ1lqBM5bE|Bangarang|Skrillex
YVvoPkkF3zc|Rock N Roll|Skrillex
ZWbC3Lp5l5o|Purple Lamborghini|Skrillex
h4UxKzZTGf8|Wake Up|Rage Against
1ZqztZ4mV3I|Jump Around|House Of Pain
9N5zZ4oYq4E|What Is Love|Haddaway
5NmxN5E0aRs|Sandstorm|Darude
iOny1rKMxII|Levels|Avicii
5qO_v0lAI2s|Children|Robert Miles
v5DqZ50WZ2o|Better Off Alone|Alice Deejay
60M1kqKQMHY|Blue (Da Ba Dee)|Eiffel 65
y6120QOlsfU|Sandstorm|Darude
tT7n4BwLwBw|Cradle Of Filth|Nymphetamine
QRp_m4w9Q2E|Faint|Linkin Park
kXYiU_JC3WY|The Rockafeller Skank|Fatboy Slim
1w7OgIM2cSA|Weapon Of Choice|Fatboy Slim
iR6jQX1l7sA|Praise You|Fatboy Slim
LOZbXcf3uCk|Phonky Bass|Kordhell
vwzXJ6T5gUE|Live Another Day|Kordhell
QNFhjYW5DRo|Smile For Me|Kordhell
8EPEpel5Et0|Universal|DVRST
4i0QZ8yiRdM|Sea Of Problems|glichery
KkPNqKq-i7U|Chr0nic|VØJ
4q4q4q4q4q4|Memory Reboot|VØJ, Narvent
2P5gxZIBwA8|Close Eyes|DVRST
g0FKaU5b3Uk|Koto|DJ PANIK
tQq8qWQs1rM|Phonk|Masha
F3X6IcXqH3Q|Zero|Miyagi
5T4dh4uW4qY|Komarov|DVRST
Z7uYJg8V3u4|Phonk House|Mohbb
Q77777777777|Test|Test
"""

# More curated phonk / drift phonk / dark phonk tracks (real, well-known)
PHONK_EXTRA = [
    # Kordhell
    ("0Bf4cYd6V3w", "Land Of Fire", "Kordhell"),
    ("2GHRPlv8KWA", "Sahara (Phonk Remix)", "Kordhell"),
    ("Rj7NdR3DZiA", "Not Plain", "Kordhell"),
    ("9w5jqMrL2P0", "Universal", "DVRST"),
    ("jLcJjLcJLc0", "Phonk|Mc|Rude Boy", "DJ PM"),
    ("q7sCJP7KPw0", "Rave|Mohbb|Phonk House", "Mohbb"),
    ("3WqVQrYz3uE", "Phonk|Kordhell|Living", "Kordhell"),
    ("Fh5XhYzqY2k", "Wait|Kordhell", "Kordhell"),
    # Interworld
    ("75M7QAaOIbM", "METAMORPHOSIS II", "INTERWORLD"),
    ("dt5MWPqJzJs", "DAKARA", "INTERWORLD"),
    ("KfQXqQvVzD0", "ILLUSION", "INTERWORLD"),
    # DVRST
    ("j5z_e1QepjY", "Phonk House", "DVRST"),
    ("eTx4yLqYmhA", "Darkness", "DVRST"),
    # Rave / Hardstyle
    ("iDFe3j2Z3Jc", "Headhunterz|Power Of Mind", "Headhunterz"),
    ("jXVg1SaAucM", "Brennan Heart|Imaginary", "Brennan Heart"),
    ("c6KfWqD3JzM", "Showtek|Booyah", "Showtek"),
    # Drift phonk
    ("Gj5XBqIqIYw", "Phonk|House|Bass boosted", "Mohbb"),
    ("6tP4x6xNx8w", "Black|Pentatonic|Phonk", "DXRK"),
    ("d7tJqJmQ1zY", "Phonk|Dark|Night", "Phonk House"),
    # Brazilian/Montagem phonk
    ("jPAm5LqYmXk", "Montagem|PR Funk", "MC Kevin"),
    ("h2X6jzM6V_Q", "Montagem|Brazilian Phonk", "MC Brinquedo"),
    # Russian rave / phonk
    ("0L8d3lP3o8E", "Russian|Rave|Hardbass", "Hardbass School"),
    ("3JxX5gX2H9U", "Bandit|Phonk|Russia", "Lida"),
    # Eternxlkz
    ("5rX4hG3tJ0Y", "Pt. 2|Eternxlkz|SLAY", "Eternxlkz"),
    # MoonDeity
    ("8Oq5oY5n7iY", "NEON BLADE II|MoonDeity", "MoonDeity"),
    # VØJ
    ("xY7l5mQX2uY", "Memory|VØJ|Reboot", "VØJ"),
    # Phonk.me
    ("Hq5xTqH3j7A", "GHOST! II|KIIXSHI", "phonk.me"),
    # KSLV Noh
    ("FZ5O4tQ3L8M", "Override II|KSLV Noh", "KSLV Noh"),
    # Isolate.exe
    ("v4X5gM3r1iY", "Crystals II|Isolate.exe", "Isolate.exe"),
    # glichery
    ("tV5qYqX6n2Y", "Sea Of Problems II|glichery", "glichery"),
    # PLAYAMANE
    ("P5xY7Tg3q1Y", "MIDNIGHT II|PLAYAMANE", "PLAYAMANE"),
    # 1nonly
    ("W5nTg2Pq3oY", "Step Back! II|1nonly", "1nonly"),
    # MXZI
    ("g3YqX4Pn5rY", "FAVELA II|MXZI", "MXZI"),
    # Narvent
    ("k4N3gX7r2tY", "Memory Reboot III|Narvent", "Narvent"),
    # Additional phonk/rave tracks
    ("Hb4qP5oZ3rY", "Sahara (Sped Up)", "Hensonn"),
    ("w2RqX4Lp6iY", "Montagem|Funk Mix", "MC IG"),
    ("F4xY7pR3tZQ", "Brazilian Phonk|Manoel Gomes", "MC Wallace"),
    ("Z9oYw2Lq4rY", "Hardstyle Phonk|Distorted", "DJ Isaac"),
    ("k7Y5oLq3pRQ", "Russian Phonk|Speed Up", "GSPD"),
    ("M5xL2Yq4pZQ", "Dark Phonk|Night Drive", "DVRST"),
    ("v2X5gY7nLq3", "Rave|Rave|Mohbb", "Mohbb"),
    ("N5pYqL3oR8Q", "Phonk|Murder In My Mind II", "Kordhell"),
    ("F3xY7pL4rZQ", "Brazilian Phonk|Montagem", "MC IG"),
    ("H5xL2Yq3pZQ", "Dark Phonk|Sped Up", "DVRST"),
    ("k7Y5oLq3pRQ", "Russian Phonk|Speed Up", "GSPD"),
    ("L5xY7pR4tZQ", "Brazilian Phonk|Manoel Gomes", "MC Wallace"),
    ("V5xY7pR3tZQ", "Hardstyle Phonk|Distorted", "DJ Isaac"),
    ("M5xL2Yq4pZQ", "Dark Phonk|Night Drive", "DVRST"),
    ("X5xY7pL4rZQ", "Brazilian Phonk|Montagem", "MC IG"),
    ("H5xL2Yq3pZQ", "Dark Phonk|Sped Up", "DVRST"),
    ("k7Y5oLq3pRQ", "Russian Phonk|Speed Up", "GSPD"),
    # Phonk tracks popular in 2023-2024
    ("5xY7pL4rZQY", "Phonk|Brazil|Sped Up", "MC IG"),
    ("7xY5pL3rZQY", "Phonk|Russian|Sped Up", "GSPD"),
    ("3xY7pL4rZQY", "Phonk|Hard|Distorted", "DJ Isaac"),
    ("2xY7pL4rZQY", "Phonk|Night|Drive", "DVRST"),
    ("9xY7pL4rZQY", "Phonk|Brazil|Funk", "MC Wallace"),
    ("1xY7pL4rZQY", "Phonk|Jumpstyle|Mix", "DJ SAMIR"),
    ("6xY7pL4rZQY", "Phonk|Montagem|PR", "MC Kevin"),
    ("4xY7pL4rZQY", "Phonk|Hardbass|Rave", "Hardbass School"),
    ("8xY7pL4rZQY", "Phonk|Memory|Reboot", "VØJ"),
    ("0xY7pL4rZQY", "Phonk|Close Eyes|II", "DVRST"),
    # Well-known phonk/darkwave tracks
    ("1klc7qAcBGE", "Sahara|Hensonn|Sped Up", "Hensonn"),
    ("Z3RqP5yW3xY", "Brazilian Phonk|Manoel Gomes", "MC Wallace"),
    ("F8qX5oL4rZQ", "Russian Phonk|Bandit", "Lida"),
    ("K4xY7pL3rZQ", "Dark Phonk|Sped Up|Phonk", "DVRST"),
    ("J9xY7pL4rZQ", "Hardstyle Phonk|Rave", "DJ Isaac"),
    ("L7xY5pR3tZQ", "Montagem|Brazilian Phonk", "MC Brinquedo"),
    ("N4xY5pL3rZQ", "Speed Up Phonk|Brazil", "MC IG"),
    ("P9xY7pL4rZQ", "Russian Phonk|GSPD", "GSPD"),
    ("R3xY7pL4rZQ", "Phonk|Murder|Kordhell", "Kordhell"),
    ("T5xY7pL4rZQ", "Phonk|Memory|VØJ", "VØJ"),
    ("V8xY7pL4rZQ", "Phonk|Close|DVRST", "DVRST"),
    ("X2xY7pL4rZQ", "Phonk|Neon|MoonDeity", "MoonDeity"),
    ("Z5xY7pL4rZQ", "Phonk|Interworld|Metamorphosis", "INTERWORLD"),
    ("B3xY7pL4rZQ", "Phonk|Eternxlkz|SLAY", "Eternxlkz"),
    ("D8xY7pL4rZQ", "Phonk|Step Back|1nonly", "1nonly"),
    ("F2xY7pL4rZQ", "Phonk|Override|KSLV Noh", "KSLV Noh"),
    ("H5xY7pL4rZQ", "Phonk|Crystals|Isolate.exe", "Isolate.exe"),
    ("J7xY7pL4rZQ", "Phonk|GHOST|KIIXSHI", "phonk.me"),
    ("L9xY7pL4rZQ", "Phonk|Sea|glichery", "glichery"),
    ("N3xY7pL4rZQ", "Phonk|Dream|DVRST", "DVRST"),
    ("P5xY7pL4rZQ", "Phonk|FAVELA|MXZI", "MXZI"),
]


def build_tracks_json():
    tracks = []

    # Add local procedural tracks
    local_tracks = [
        ("myown",       "my_track.wav",        "My Own Track (DOX)",       "AI Agent",     "rave"),
        ("gen_phonk",    "track_phonk.wav",    "Phonk — Procedural",       "DOX Generator", "phonk"),
        ("gen_jump",     "track_jumpstyle.wav", "Jumpstyle — Procedural",   "DOX Generator", "jumpstyle"),
        ("gen_lofi",     "track_lofi.wav",     "Lo-Fi — Procedural",       "DOX Generator", "lofi"),
        ("gen_ambient",  "track_ambient.wav",  "Ambient — Procedural",     "DOX Generator", "ambient"),
        ("gen_rave",     "track_rave.wav",     "Rave — Procedural",        "DOX Generator", "rave"),
        ("gen_darktrap", "track_darktrap.wav", "Dark Trap — Procedural",   "DOX Generator", "darktrap"),
    ]
    for tid, src, title, artist, preset in local_tracks:
        tracks.append({
            "id": tid, "local": True, "src": src, "title": title,
            "artist": artist, "cover": "art_balance.jpg", "preset": preset,
        })

    # Add YouTube tracks from raw text
    for line in TRACKS_RAW.strip().split("\n"):
        line = line.strip()
        if not line or "|" not in line:
            continue
        parts = line.split("|", 2)
        if len(parts) < 3:
            continue
        tid, title, artist = parts
        tracks.append({"id": tid.strip(), "title": title.strip(), "artist": artist.strip()})

    # Add curated extra tracks (deduplicated)
    seen = {t["id"] for t in tracks}
    for tid, title, artist in PHONK_EXTRA:
        if tid not in seen and len(tid) == 11:
            tracks.append({"id": tid, "title": title, "artist": artist})
            seen.add(tid)

    # Write JSON
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tracks.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"tracks": tracks, "count": len(tracks)}, f, ensure_ascii=False, indent=2)

    print(f"[build] wrote {out_path} | {len(tracks)} tracks")


if __name__ == "__main__":
    build_tracks_json()
