"use client";

import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;
