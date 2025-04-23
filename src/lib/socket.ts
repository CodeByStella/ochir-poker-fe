import { siteApi,  } from "@/config/site";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (typeof window === "undefined") {
    // Avoid running on server-side (SSR)
    throw new Error("Socket.IO can only be initialized on the client side");
  }

  if (socket && socket.connected) {
    return socket;
  }

  // Initialize Socket.IO client
  socket = io(`${siteApi}`, {
    autoConnect: false, // Manual connection control
    reconnection: true, // Enable automatic reconnection
    reconnectionAttempts: 5, // Retry 5 times
    reconnectionDelay: 1000, // Wait 1s between retries,
  });

  // Handle connection events
  socket.on("connect", () => {
    console.log("Socket.IO connected:", socket?.id);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket.IO disconnected:", reason);
    if (reason === "io server disconnect") {
      // Server-initiated disconnect; try to reconnect
      socket?.connect();
    }
  });

  // Connect manually
  socket.connect();

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("Socket.IO disconnected manually");
  }
};