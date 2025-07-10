#!/usr/bin/env python3
"""
Simple HTTP server for CNC Panel
Serves the static files and allows access from other computers on the network
"""

import http.server
import socketserver
import socket
import sys
import os

class CNCPanelHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(__file__), **kwargs)
    
    def end_headers(self):
        # Add CORS headers to allow cross-origin requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def get_local_ip():
    """Get the local IP address of this machine"""
    try:
        # Connect to a remote address (doesn't actually connect)
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(('8.8.8.8', 80))
            local_ip = s.getsockname()[0]
        return local_ip
    except Exception:
        return 'localhost'

def main():
    PORT = 8080
    
    # Allow custom port via command line
    if len(sys.argv) > 1:
        try:
            PORT = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port number: {sys.argv[1]}")
            sys.exit(1)
    
    local_ip = get_local_ip()
    
    with socketserver.TCPServer(("", PORT), CNCPanelHandler) as httpd:
        print(f"CNC Panel Server Starting...")
        print(f"Local access: http://localhost:{PORT}")
        print(f"Network access: http://{local_ip}:{PORT}")
        print(f"Serving files from: {os.path.dirname(__file__)}")
        print(f"Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()
