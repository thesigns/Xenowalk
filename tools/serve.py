"""Development server that never lets the browser cache files, so edited ES
modules load fresh without a hard reload. Usage: python tools/serve.py [port]"""

import functools
import http.server
import pathlib
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
root = pathlib.Path(__file__).resolve().parent.parent
handler = functools.partial(NoCacheHandler, directory=str(root))
print(f'Serving {root} at http://localhost:{port}/?debug')
http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
