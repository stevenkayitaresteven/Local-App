import { io, type Socket } from "socket.io-client";
import { REALTIME_URL } from "./config";
import { getAccessToken } from "./api";

let socket: Socket | null = null;

/** Lazily connect an authenticated realtime socket. Safe to call repeatedly. */
export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io(REALTIME_URL, {
      path: "/realtime",
      transports: ["websocket"],
      autoConnect: false,
      auth: (cb) => cb({ token: getAccessToken() ?? "" }),
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
