"use client";
import { siteApi } from "@/config/site";
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// Create a context for socket
const SocketContext = createContext<Socket | null>(null);

// Custom hook to use socket context
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Replace this URL with the correct backend URL for WebSocket communication
    const socketInstance = io("https://fox.ochirpoker.online", {
      withCredentials: true, // Use this if your backend is set to allow credentials
    });

    setSocket(socketInstance);

    // Disconnect when component unmounts
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};