import { useSocket } from "@/context/socket-context";
import { IDealCardsData, IFlipCommunityCardData, IChipAdded, IChipAnimate, ICollectChip, IHandResult, IPlayerAction, IPotToWinnerData, IMessage } from "@/models/poker";
import { ITable } from "@/models/table";
import { useEffect } from "react";

interface PokerEventHandlers {
  onLobbyData?: (data: ITable[]) => void;
  onTableData?: (data: ITable) => void;
  onTableUpdate?: (data: ITable) => void;
  onRoundUpdate?: (data: any) => void;
  onPlayerDisconnected?: (data: any) => void;
  onPlayerRemoved?: (data: any) => void;
  onGameStarted?: (data: any) => void;
  onPlayerAction?: (data: IPlayerAction) => void;
  onDealCard?: (data: IDealCardsData) => void;
  onFlipCommunityCard?: (data: IFlipCommunityCardData) => void;
  onHandResult?: (data: IHandResult) => void;
  onChipsAdded?: (data: IChipAdded) => void;
  onError?: (msg: string) => void;
  onChipAnimate?: (data: IChipAnimate) => void;
  onPotToWinner?: (data: IPotToWinnerData) => void;
  onCollectChips?: (data: ICollectChip) => void;
  onClearChips?: () => void;
  onJoinedTable?: (data: any) => void;
  onNewMessage?: (data: IMessage) => void;
  onLobbyMessage?: (data: IMessage[]) => void;
  
  // Add other event handlers as needed
}

export const useSocketEvents = (handlers: PokerEventHandlers) => {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;
    // Register event listeners
    if (handlers.onLobbyData) socket.on("tableData", handlers.onLobbyData);
    if (handlers.onTableData) socket.on("tableData", handlers.onTableData);
    if (handlers.onTableUpdate) socket.on("tableUpdate", handlers.onTableUpdate);
    if (handlers.onRoundUpdate) socket.on("tableUpdate", handlers.onRoundUpdate);
    if (handlers.onPlayerDisconnected) socket.on("playerDisconnected", handlers.onPlayerDisconnected);
    if (handlers.onPlayerRemoved) socket.on("playerRemoved", handlers.onPlayerRemoved);
    if (handlers.onGameStarted) socket.on("gameStarted", handlers.onGameStarted);
    if (handlers.onPlayerAction) socket.on("playerAction", handlers.onPlayerAction);
    if (handlers.onDealCard) socket.on("dealCards", handlers.onDealCard);
    if (handlers.onFlipCommunityCard) socket.on("flipCommunityCard", handlers.onFlipCommunityCard);
    if (handlers.onHandResult) socket.on("handResult", handlers.onHandResult);
    if (handlers.onError) socket.on("error", handlers.onError);
    if (handlers.onChipsAdded) socket.on("chipsAdded", handlers.onChipsAdded);
    if (handlers.onChipAnimate) socket.on("chipAnimate", handlers.onChipAnimate);
    if (handlers.onPotToWinner) socket.on("potToWinner", handlers.onPotToWinner);
    if (handlers.onCollectChips) socket.on("collectChips", handlers.onCollectChips);
    if (handlers.onClearChips) socket.on("clearChips", handlers.onClearChips);
    if (handlers.onJoinedTable) socket.on("joinedTable", handlers.onJoinedTable);
    if (handlers.onNewMessage) socket.on("newMessage", handlers.onNewMessage);
    if (handlers.onLobbyMessage) socket.on("newMessage", handlers.onLobbyMessage);

    // Cleanup on unmount or socket change
    return () => {
      if (handlers.onTableData) socket.off("tableData", handlers.onTableData);
      if (handlers.onTableUpdate) socket.off("tableUpdate", handlers.onTableUpdate);
      if (handlers.onRoundUpdate) socket.off("tableUpdate", handlers.onRoundUpdate);
      if (handlers.onPlayerDisconnected) socket.off("playerDisconnected", handlers.onPlayerDisconnected);
      if (handlers.onPlayerRemoved) socket.off("playerRemoved", handlers.onPlayerRemoved);
      if (handlers.onGameStarted) socket.off("gameStarted", handlers.onGameStarted);
      if (handlers.onPlayerAction) socket.off("playerAction", handlers.onPlayerAction);
      if (handlers.onDealCard) socket.off("dealCards", handlers.onDealCard);
      if (handlers.onFlipCommunityCard) socket.on("flipCommunityCard", handlers.onFlipCommunityCard);
      if (handlers.onHandResult) socket.off("handResult", handlers.onHandResult);
      if (handlers.onError) socket.off("error", handlers.onError);
      if (handlers.onChipsAdded) socket.off("chipsAdded", handlers.onChipsAdded);
      if (handlers.onChipAnimate) socket.off("chipAnimate", handlers.onChipAnimate);
      if (handlers.onPotToWinner) socket.off("potToWinner", handlers.onPotToWinner);
      if (handlers.onCollectChips) socket.off("collectChips", handlers.onCollectChips);
      if (handlers.onClearChips) socket.off("clearChips", handlers.onClearChips);
      if (handlers.onJoinedTable) socket.off("joinedTable", handlers.onJoinedTable);
      if (handlers.onNewMessage) socket.off("newMessage", handlers.onNewMessage);
      if (handlers.onLobbyMessage) socket.off("lobbyMessages", handlers.onLobbyMessage);
    };
  }, [socket, isConnected, handlers]);

  return { socket, isConnected };
};