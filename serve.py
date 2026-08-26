#!/usr/bin/env python3
"""Static file server for local dev that disables caching, so edited JS/CSS
modules are always picked up on reload instead of being served stale from
the browser's HTTP cache."""
import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8734
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    handler = functools.partial(NoCacheHandler, directory=DIRECTORY)
    http.server.test(HandlerClass=handler, port=PORT)
