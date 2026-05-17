"""Start uvicorn with a pre-bound socket to bypass Windows SO_EXCLUSIVEADDRUSE issue."""
import socket
import asyncio
import uvicorn

if __name__ == "__main__":
    # Bind socket here — before uvicorn touches it
    # This avoids the SO_EXCLUSIVEADDRUSE conflict uvicorn triggers on Windows
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("127.0.0.1", 8000))
    sock.set_inheritable(True)
    print(f"Socket bound to 127.0.0.1:8000")

    config = uvicorn.Config("server:app", host="127.0.0.1", port=8000, log_level="info")
    server = uvicorn.Server(config)
    asyncio.run(server.serve(sockets=[sock]))
