import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants/theme';
import { resolveUrl } from '@/utils/platformUrl';

const RESOLVED_SOCKET_URL = resolveUrl(SOCKET_URL);

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  socket = io(RESOLVED_SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
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
