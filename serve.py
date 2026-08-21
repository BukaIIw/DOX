#!/usr/bin/env python3
"""
DOX MUSIC — Local development server with track regeneration API.

Usage:
  python serve.py                  # serves on http://localhost:8000
  python serve.py --port 8080      # custom port

Endpoints:
  GET  /                  → static files (index.html, *.wav, etc.)
  POST /api/regenerate    → runs gen_track.py with random preset, returns JSON

This lets the "Regenerate" button in the UI actually invoke the Python
generator and produce a brand new WAV on each click.
"""

import http.server
import socketserver
import json
import subprocess
import os
import sys
from urllib.parse import urlparse

PORT = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 8000

HERE = os.path.dirname(os.path.abspath(__file__))
GEN_SCRIPT = os.path.join(os.path.dirname(HERE), "scripts", "gen_track.py")
# Fallback to scripts dir alongside server
if not os.path.exists(GEN_SCRIPT):
    GEN_SCRIPT = os.path.join(HERE, "gen_track.py")
if not os.path.exists(GEN_SCRIPT):
    GEN_SCRIPT = "/home/z/my-project/scripts/gen_track.py"


class DOXHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=HERE, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/regenerate":
            try:
                # Run generator with random preset
                result = subprocess.run(
                    [sys.executable, GEN_SCRIPT],
                    cwd=HERE,
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if result.returncode == 0:
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "ok": True,
                        "output": result.stdout.strip(),
                        "preset": result.stdout.split("preset=")[1].split()[0] if "preset=" in result.stdout else "unknown",
                    }).encode())
                else:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "ok": False,
                        "error": result.stderr.strip()[:500],
                    }).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()


def main():
    with socketserver.TCPServer(("0.0.0.0", PORT), DOXHandler) as httpd:
        print(f"🎵 DOX MUSIC server running on http://localhost:{PORT}")
        print(f"   Serving from: {HERE}")
        print(f"   Generator script: {GEN_SCRIPT}")
        print(f"   Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped.")
            sys.exit(0)


if __name__ == "__main__":
    main()
