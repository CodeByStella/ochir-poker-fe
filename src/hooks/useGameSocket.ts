import { useEffect } from "react";
import { useSocket } from "@/context/socket-context";
import { ITable } from "@/models/table";
import { IPlayer } from "@/models/player";

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
