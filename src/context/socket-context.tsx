"use client";

import { siteApi } from "@/config/site";
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useEffect } from "react";
import { useSocket } from "./SocketProvider";
import { ITable } from "@/models/table";
import { IPlayer } from "@/models/player";

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io(`${siteApi}`);
    setSocket(socketInstance);

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

export const useGameSocket = (
  tableId: string,
  setTable: (t: ITable) => void,
  setCurrentPlayer: (p: IPlayer) => void
) => {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.emit("join", { tableId });

    socket.on("gameUpdate", (data) => {
      setTable(data.table);
      setCurrentPlayer(data.currentPlayer);
    });

    return () => {
      socket.off("gameUpdate");
    };
  }, [socket, tableId]);

  const sendAction = (action: string, amount?: number) => {
    if (socket) {
      socket.emit("playerAction", { tableId, action, amount });
    }
  };

  return { sendAction };
};


