"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import io, { Socket } from "socket.io-client";
import useSWR from "swr";
import { authApi } from "@/apis";
import { message as toastMessage } from "@/utils/toast";
import Image from "next/image";
import tableChatIcon from "../../../../../public/poker/chattable.svg";
import background from "../../../../../public/asset/back.jpg";
import cardBack from "../../../../../public/card.png";
import { PokerTableSVG } from "./PokerTableSVG";
import Card from "../../../../components/card/Card";
import cardStyles from "../../../../components/card/Card.module.css";
import LoginModal from "@/components/modal/Login";
import { siteApi } from "@/config/site";
import { Header } from "@/components/header";

const socket: Socket = io(`${siteApi}`, {
  withCredentials: true,
  reconnection: true,
});

const SHUFFLE_DURATION = 1500;
const WINNER_DISPLAY_DURATION = 5000;
const CHIP_ANIMATION_DURATION = 1000;

interface IUser {
  _id: string;
  name: string;
  amount: number;
  role: "user" | "admin"; 
}

export interface IPlayer {
  _id: string;
  user: string;
  username: string;
  chips: number;
  seat: number;
  cards: [string, string];
  inHand: boolean;
  currentBet: number;
  hasActed: boolean;
}

interface ITable {
  _id: string;
  name: string;
  status: string;
  players: IPlayer[];
  waitingPlayers: any[];
  pot: number;
  currentBet: number;
  communityCards: string[];
  round: string;
  currentPlayer: number;
  maxPlayers: number;
  dealerSeat: number;
  smallBlind: number;
  bigBlind: number;
  buyIn: number;
  messages?: { user: { _id: string; name?: string }; content: string; timestamp: Date }[];
  deck: any[];
}

interface IMessage {
  user: { _id: string; name?: string };
  content: string;
  timestamp: Date;
}

interface DealCardsData {
  tableId: string;
  players: { user: string; seat: number; cards: [string, string]; chips: number; username: string }[];
}

interface PlayerAction {
  playerId: string;
  action: string;
  amount?: number;
  timestamp: Date;
}

interface WinnerData {
  playerId: string;
  chipsWon: number;
  handDescription?: string;
}

export default function PokerTable() {
  const { id } = useParams();
  const tableId = id as string;
  const [screenWidth, setScreenWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [table, setTable] = useState<ITable | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [raiseAmount, setRaiseAmount] = useState<number>(0);
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [pendingDealCards, setPendingDealCards] = useState<DealCardsData | null>(null);
  const [winners, setWinners] = useState<WinnerData[]>([]);
  const [showCommunityCards, setShowCommunityCards] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [chipAmount, setChipAmount] = useState<number>(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animationContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [chatPosition, setChatPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastActions, setLastActions] = useState<Map<string, PlayerAction>>(new Map());
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [adminPreviewCards, setAdminPreviewCards] = useState<string[]>([])
  const [showdownPlayers, setShowdownPlayers] = useState<{ playerId: string; cards: string[] }[]>([]);
  
  const dragOffset = useRef({ x: 0, y: 0 });
  const { data: currentUser, mutate } = useSWR("swr.user.me", async () => {
    const res = await authApi.me();
    return res;
  });
  const isAdmin = currentUser?.role === "admin";

  const shuffleSound = new Audio("/mp3/shuffle.mp3");
  const foldSound = new Audio("/mp3/fold.mp3");
  const potSound = new Audio("/mp3/pot.mp3");
  const checkSound = new Audio("/mp3/check.mp3");
  const callSound = new Audio("/mp3/call.mp3");
  const chipSound = new Audio("/mp3/chip.mp3");
  const flipSound = new Audio("/mp3/flip.mp3");
  const raiseSound = new Audio("/mp3/raise.mp3");

  const chipImages = [
    { src: "/poker/chip.svg", value: 0 },
    { src: "/poker/chip1.svg", value: 10 },
    { src: "/poker/chip2.svg", value: 25 },
    { src: "/poker/chip3.svg", value: 50 },
    { src: "/poker/chip4.svg", value: 100 },
    { src: "/poker/chip5.svg", value: 250 },
    { src: "/poker/chip6.svg", value: 500 },
    { src: "/poker/chip7.svg", value: 1000 },
  ];

  const getChipStack = (amount: number) => {
    if (amount === 0) return [chipImages[0]];
    const stack: { src: string; value: number }[] = [];
    let remaining = amount;
    const sortedChips = [...chipImages].sort((a, b) => b.value - a.value);
    for (const chip of sortedChips) {
      if (chip.value === 0) continue;
      while (remaining >= chip.value) {
        stack.push(chip);
        remaining -= chip.value;
      }
    }
    if (stack.length === 0 && amount > 0) stack.push(chipImages[1]);
    return stack.slice(0, 3); 
  };

  useEffect(() => {
    const updateScreenSize = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };
    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  useEffect(() => {
    socket.emit("getTableData", tableId);
    socket.on("tableData", (data: ITable) => {
      setTable(data);
      if (data.status === "playing" && (data.round !== "preflop" || data.communityCards.length > 0)) {
        setShowCommunityCards(true);
      }
    });
    return () => {
      socket.off("tableData");
    };
  }, [tableId]);

  const updateAdminPreviewCards = (tableData: ITable) => {
    if (isAdmin && tableData.status === "playing" && tableData.deck.length >= 6) {
      const deck = tableData.deck;
      const lastSix = deck.slice(-6);
      const previewCards = [
        lastSix[0], 
        lastSix[1],
        lastSix[3],
        lastSix[4],
        lastSix[5], 
      ];
      setAdminPreviewCards(previewCards);
    } else {
      setAdminPreviewCards([]);
    }
  };

  useEffect(() => {
    if (!tableId) return;

    socket.emit("joinTable", { userId: currentUser?._id, tableId });

    const handleTableUpdate = (data: ITable) => {
      setTable(data);
      updateAdminPreviewCards(data)
      if (data.messages) {
        setMessages(
          data.messages.map((msg) => ({
            user: { _id: msg.user._id, name: msg.user.name || "Unknown" },
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          }))
        );
      }
      setRaiseAmount(data.currentBet + 10);
      setWinners([]);
      if (data.status === "playing" && (data.round !== "preflop" || data.communityCards.length > 0)) {
        setShowCommunityCards(true);
      }
    };

    const handleHandResult = (data: { winners: WinnerData[] }) => {
      setWinners(data.winners);
      potSound.play().catch((err) => console.error("Error playing pot sound:", err));
      setTimeout(() => setWinners([]), WINNER_DISPLAY_DURATION);
    };

    socket.on("connect", () => {
      console.log("Socket connected");
      socket.emit("getTableData", tableId);
      socket.emit("joinTable", { userId: currentUser?._id, tableId });
    });

    socket.on("reconnect", () => {
      socket.emit("joinTable", { userId: currentUser?._id, tableId });
      socket.emit("getTableData", tableId);
    });

    socket.on("playerTurn", ({ playerId, tableId: eventTableId, turnStartTime }) => {
      if (eventTableId !== tableId) return;
      console.log("Received playerTurn event:", { playerId, turnStartTime });
    });

    socket.on("tableUpdate", handleTableUpdate);
    socket.on("gameStarted", (data: ITable) => {
      shuffleSound.play().catch((err) => console.error("Error playing shuffle sound:", err));
      setTable(data);
      updateAdminPreviewCards(data); 
      setShowCommunityCards(false);
    });

    socket.on("playerAction", (actionData: PlayerAction) => {
      setLastActions((prev) => {
        const newActions = new Map(prev);
        newActions.set(actionData.playerId, {
          ...actionData,
          timestamp: new Date(actionData.timestamp),
        });
        return newActions;
      });
      // Optionally clear the action after a timeout (e.g., 5 seconds)
      setTimeout(() => {
        setLastActions((prev) => {
          const newActions = new Map(prev);
          newActions.delete(actionData.playerId);
          return newActions;
        });
      }, 3000); // Display for 3 seconds
    });

    socket.on("dealCards", (data: DealCardsData) => {
      if (data.tableId !== tableId) return;
      console.log("Received dealCards event:", data);

      setIsDealing(true);
      setTimeout(() => {
        animateDealCards(
          data.players, 
          table?.maxPlayers || 10
        );
      }, SHUFFLE_DURATION);

      setTimeout(() => {
        setTable((prev) => {
          if (!prev) return prev;
          const updatedPlayers = prev.players.map((p) => {
            const dealtPlayer = data.players.find((dp) => dp.user === p.user);
            return dealtPlayer ? { ...p, cards: dealtPlayer.cards } : p;
          });
          return { ...prev, players: updatedPlayers };
        });
        setIsDealing(false);
        setShowCommunityCards(true); 
      }, SHUFFLE_DURATION + (data.players.length * 2 * 200) + 500);
    });

    socket.on("handResult", (data: { winners: WinnerData[]; showdownPlayers: { playerId: string; cards: string[] }[] }) => {
      setWinners(data.winners);
      setShowdownPlayers(data.showdownPlayers);
      potSound.play().catch((err) => console.error("Error playing pot sound:", err));
      setTimeout(() => {
        setWinners([]);
        setShowdownPlayers([]); 
      }, WINNER_DISPLAY_DURATION);
    });
    socket.on("roundUpdate", (data: ITable) => {
      if (data._id !== tableId) return;
      if (data.round !== "preflop" && data.communityCards.length > 0) {
        flipSound.play().catch((err) => console.error("Error playing flip sound:", err));
        setShowCommunityCards(true);
      }
      setTable(data);
    });

    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    socket.on("chipsAdded", ({ tableId: updatedTableId, userId, amount }) => {
      if (updatedTableId !== tableId) return;
      setTable((prev) => {
        if (!prev) return prev;
        const updatedPlayers = prev.players.map((player) =>
          player.user === userId ? { ...player, chips: player.chips + amount } : player
        );
        return { ...prev, players: updatedPlayers };
      });
      chipSound.play().catch((err) => console.error("Error playing chip sound:", err));
      toastMessage.success(`Added ${amount} chips to your stack`);
    });

    socket.on("error", (msg: string) => toastMessage.error(msg));

    return () => {
      socket.off("connect");
      socket.off("reconnect");
      socket.off("tableUpdate", handleTableUpdate);
      socket.off("gameStarted");
      socket.off("dealCards");
      socket.off("handResult", handleHandResult);
      socket.off("roundUpdate");
      socket.off("newMessage");
      socket.off("chipsAdded");
      socket.off("error");
      socket.off("playerAction");
      socket.emit("leaveSeat", tableId);
      socket.off("playerTurn");
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
      }
    };
  }, [tableId, currentUser]);

  useEffect(() => {
    if (table && pendingDealCards && pendingDealCards.tableId === tableId) {
      setTimeout(() => {
        animateDealCards(
          pendingDealCards.players.map((player) => ({ ...player, chips: 0, username: "Unknown" })),
          table.maxPlayers
        );
        setPendingDealCards(null);
      }, SHUFFLE_DURATION);
    }
  }, [table, pendingDealCards]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (chatContainerRef.current) {
      setIsDragging(true);
      const rect = chatContainerRef.current.getBoundingClientRect();
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && chatContainerRef.current) {
      e.preventDefault();
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - chatContainerRef.current.offsetWidth;
      const maxY = window.innerHeight - chatContainerRef.current.offsetHeight;
      setChatPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const getVisibleCardCount = (round: string, totalCards: number): number => {
    switch (round) {
      case "preflop": return 0;
      case "flop": return Math.min(3, totalCards);
      case "turn": return Math.min(4, totalCards);
      case "river":
      case "showdown": return Math.min(5, totalCards);
      default: return 0;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (chatContainerRef.current) {
      setIsDragging(true);
      const touch = e.touches[0];
      const rect = chatContainerRef.current.getBoundingClientRect();
      dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && chatContainerRef.current) {
      e.preventDefault();
      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.current.x;
      const newY = touch.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - chatContainerRef.current.offsetWidth;
      const maxY = window.innerHeight - chatContainerRef.current.offsetHeight;
      setChatPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging]);

  const joinSeat = (seat: number, chips: number) => {
    if (!currentUser?._id) {
      setIsLoginModalOpen(true);
      return;
    }
    if (chips < (table?.buyIn || 0)) {
      toastMessage.error(`Minimum buy-in is ${table?.buyIn || 0} chips`);
      return;
    }
    socket.emit("joinSeat", { tableId, seat, userId: currentUser._id, chips });
    setIsModalOpen(false);
    setChipAmount(0);
    setSelectedSeat(null);
  };

  const handleSuccessfulLogin = () => {
    mutate();
    if (selectedSeat !== null && chipAmount > 0) {
      joinSeat(selectedSeat, chipAmount);
    }
  };

  const leaveSeat = () => socket.emit("leaveSeat", tableId);

  const animateChips = (seat: number, amount: number) => {
    const container = animationContainerRef.current;
    if (!container || !table) {
      console.error("Animation container or table data missing");
      return;
    }

    const seatElement = document.querySelector(`.seat-${seat}`);
    if (!seatElement) {
      console.warn(`Seat element for seat ${seat} not found`);
      return;
    }

    const rect = seatElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const startX = rect.left - containerRect.left + (isMobile ? 50 : 35); // Center of seat
    const startY = rect.top - containerRect.top + (isMobile ? 50 : 35);
    const targetX = startX + (isMobile ? 0 : -50); // Move slightly in front of the player
    const targetY = startY + (isMobile ? 60 : 40);

    const chipStack = getChipStack(amount);
    chipStack.forEach((chip, index) => {
      const chipElement = document.createElement("div");
      chipElement.className = "chip-animate";
      chipElement.style.position = "absolute";
      chipElement.style.left = `${startX}px`;
      chipElement.style.top = `${startY}px`;
      chipElement.style.zIndex = "100";
      chipElement.style.animationDelay = `${index * 100}ms`; // Stagger chips
      chipElement.innerHTML = `<img src="${chip.src}" alt="Chip" style="width: ${isMobile ? 40 : 25}px; height: ${isMobile ? 40 : 25}px;" />`;
      chipElement.style.setProperty("--chip-target-x", `${targetX}px`);
      chipElement.style.setProperty("--chip-target-y", `${targetY}px`);
      container.appendChild(chipElement);
    });

    const totalDuration = chipStack.length * 100 + CHIP_ANIMATION_DURATION;
    setTimeout(() => {
      container.querySelectorAll(".chip-animate").forEach((el) => el.remove());
    }, totalDuration);
  };

  const gameAction = (action: string, amount?: number) => {
    if (!currentUser?._id || !table) return;

    const currentPlayer = table.players.find((p) => p.user === currentUser._id);
    if (!currentPlayer) return;

    let betAmount = 0;
    switch (action) {
      case "fold":
        foldSound.play().catch((err) => console.error("Error playing fold sound:", err));
        break;
      case "check":
        checkSound.play().catch((err) => console.error("Error playing check sound:", err));
        break;
      case "call":
        betAmount = table.currentBet - currentPlayer.currentBet;
        callSound.play().catch((err) => console.error("Error playing call sound:", err));
        chipSound.play().catch((err) => console.error("Error playing chip sound:", err));
        animateChips(currentPlayer.seat, betAmount);
        break;
      case "raise":
        betAmount = amount || raiseAmount;
        raiseSound.play().catch((err) => console.error("Error playing raise sound:", err));
        chipSound.play().catch((err) => console.error("Error playing chip sound:", err));
        animateChips(currentPlayer.seat, betAmount - currentPlayer.currentBet);
        break;
      case "allin":
        betAmount = currentPlayer.chips;
        raiseSound.play().catch((err) => console.error("Error playing raise sound:", err));
        chipSound.play().catch((err) => console.error("Error playing chip sound:", err));
        animateChips(currentPlayer.seat, betAmount);
        break;
    }
    socket.emit("gameAction", { tableId, action, amount: betAmount, userId: currentUser._id });
  };

  const openModal = (seat: number) => {
    if (!currentUser?._id) {
      setIsLoginModalOpen(true);
      return;
    }
    setSelectedSeat(seat);
    setChipAmount(table?.buyIn || 0);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSeat(null);
    setChipAmount(0);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleChat = () => setIsChatOpen((prev) => !prev);

  const isMobile = screenWidth < 768;
  const tableWidth = isMobile ? 600 : 900;
  const tableHeight = isMobile ? 900 : 500;
  const scale = Math.min(
    screenWidth / (isMobile ? 700 : 1000),
    screenHeight / (isMobile ? 1000 : 600)
  );
  const animateDealCards = (
    players: { user: string; seat: number; cards: [string, string]; chips: number; username: string }[],
    maxPlayers: number
  ) => {
    const container = animationContainerRef.current;
    if (!container || !players?.length || !maxPlayers) {
      console.error("Animation container or players data missing");
      setIsDealing(false);
      return;
    }

    container.innerHTML = "";
    const dealStep = 200;
    let totalTime = 0;

    players.forEach((player, playerIndex) => {
      const seatElement = document.querySelector(`.seat-${player.seat}`);
      const cardContainer = seatElement?.querySelector(".player-cards") || seatElement;
      if (!seatElement || !cardContainer) {
        console.warn(`Seat element for seat ${player.seat} not found`);
        return;
      }

      const rect = cardContainer.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const targetX = rect.left - containerRect.left;
      const targetY = rect.top - containerRect.top;

      player.cards.slice(0, 2).forEach((cardValue, cardIdx) => {
        const card = document.createElement("div");
        card.className = `${cardStyles.card} ${cardStyles.deal}`;
        card.style.left = "50%";
        card.style.top = "50%";
        card.style.transform = "translate(-50%, -50%)";
        const cardOffset = cardIdx * (isMobile ? 20 : 30);
        card.style.setProperty("--deal-x", `${targetX + cardOffset}px`);
        card.style.setProperty("--deal-y", `${targetY}px`);
        card.style.animationDelay = `${totalTime}ms`;
        card.style.zIndex = "100";
        card.innerHTML = `<img src="${cardBack.src}" alt="Card Back" style="width: ${isMobile ? 40 : 60}px; height: ${isMobile ? 56 : 84}px;" />`;
        container.appendChild(card);
        totalTime += dealStep;

        setTimeout(() => {
          flipSound.play().catch((err) => console.error("Error playing flip sound:", err));
        }, totalTime - dealStep);
      });
    });

    const totalDuration = players.length * 2 * dealStep + 500;
    setTimeout(() => {
      container.innerHTML = "";
      setIsDealing(false);
    }, totalDuration);
  };

  if (!table) {
    return (
      <div
        className="h-screen text-white flex flex-col items-center justify-center overflow-hidden relative"
        style={{
          backgroundImage: `url(${background.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div>Loading table...</div>
        {isLoginModalOpen && (
          <LoginModal
            modal={isLoginModalOpen}
            setModal={setIsLoginModalOpen}
            onSuccessfulLogin={handleSuccessfulLogin}
          />
        )}
      </div>
    );
  }

  const maxPlayers = table.maxPlayers || 0;
  const players = table.players.map((player) => ({
    ...player,
    avatar: "/asset/65.png",
  }));
  const isUserSeated = players.some((p) => p.user === currentUser?._id);
  const currentPlayer = table?.players[table.currentPlayer];
  const isMyTurn = currentPlayer?.user === currentUser?._id && !currentPlayer?.hasActed;

  return (
    <div
      className="h-screen text-white flex flex-col overflow-hidden relative"
      style={{
        backgroundImage: `url(${background.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Header />
      <style jsx>{`
        .table-container {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          position: relative;
        }
        .table-wrapper {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: ${tableWidth}px;
          height: ${tableHeight}px;
          max-width: 100%;
          max-height: 100%;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: #1f2937;
          padding: 1.5rem;
          border-radius: 0.75rem;
          width: 90%;
          max-width: 400px;
          text-align: center;
          border: 2px solid #d4af37;
        }
          .chip-animate {
          position: absolute;
          animation: moveChip ${CHIP_ANIMATION_DURATION}ms ease-out forwards;
        }
        @keyframes moveChip {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--chip-target-x), var(--chip-target-y)) scale(0.8);
            opacity: 0.9;
          }
        }
      `}</style>

      {isLoginModalOpen && (
        <LoginModal
          modal={isLoginModalOpen}
          setModal={setIsLoginModalOpen}
          onSuccessfulLogin={handleSuccessfulLogin}
        />
      )}

      <div className="table-container">
        <div className="table-wrapper">
          <PokerTableSVG
            scale={scale}
            pot={table.pot || 0}
            players={players}
            maxPlayers={maxPlayers}
            currentUserId={currentUser?._id}
            tableStatus={table.status}
            round={table.round}
            isDealing={isDealing}
            winners={winners}
            onSeatClick={openModal}
            isUserSeated={isUserSeated}
            lastActions={lastActions}
            currentPlayerId={currentPlayer?._id.toString()} 
            isAdmin={isAdmin}
            showdownPlayers={showdownPlayers}
          />
          <div
            ref={animationContainerRef}
            className="absolute"
            style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 50 }}
          />
         {table.status === "playing" && showCommunityCards && !isDealing && (
          <div
            className="absolute flex gap-2"
            style={{
              left: "50%",
              top: isMobile ? "50%" : "55%", 
              transform: "translate(-50%, 0)",
              zIndex: 10, 
            }}
          >
            {table.communityCards
              .slice(0, getVisibleCardCount(table.round, table.communityCards.length))
              .map((cardValue, index) => (
                <Card
                  key={`community-static-${index}`}
                  value={cardValue}
                  isOpen={true}
                  style={{
                    position: "relative",
                    width: isMobile ? "35px" : "45px",
                    height: isMobile ? "50px" : "60px",
                  }}
                />
              ))}
          </div>
        )}
         {isAdmin  && (
            <div
              className="absolute flex gap-1"
              style={{
                left: "50%",
                top: isMobile ? "55%" : "55%",
                transform: "translate(-50%, 0)",
                zIndex: 15,
              }}
            >
              {adminPreviewCards.map((cardValue, index) => (
                <Card
                  key={`admin-preview-${index}`}
                  value={cardValue}
                  isOpen={true}
                  style={{
                    position: "relative",
                    width: isMobile ? "25px" : "35px",
                    height: isMobile ? "35px" : "50px",
                    opacity: 0.8, 
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isMyTurn && table.status === "playing" && (
        <div
          className={`fixed ${
            isMobile ? "bottom-2 left-2 right-2" : "bottom-4 right-4"
          } flex flex-col md:flex-row items-center justify-center gap-2 z-20 p-2 bg-gray-800/80 rounded-lg`}
        >
          <div className="flex flex-col items-center gap-2 w-full md:w-64">
            <div className="flex items-center justify-between w-full gap-2">
              <span className="text-white font-bold text-sm md:text-base">{raiseAmount.toFixed(2)}</span>
              <input
                type="range"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Number(e.target.value))}
                min={table.currentBet + table.bigBlind}
                max={currentPlayer.chips}
                step={table.bigBlind}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => gameAction("raise", raiseAmount)}
              disabled={raiseAmount <= table.currentBet}
              className="px-3 py-1.5 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm md:text-base w-full"
            >
              Raise
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-2 w-full md:w-auto">
            <button
              onClick={() => gameAction("fold")}
              className="px-3 py-1.5 bg-red-600 rounded-lg hover:bg-red-700 text-sm md:text-base flex-1 min-w-[80px]"
            >
              Fold
            </button>
            {currentPlayer.currentBet === table.currentBet && (
              <button
                onClick={() => gameAction("check")}
                className="px-3 py-1.5 bg-gray-600 rounded-lg hover:bg-gray-700 text-sm md:text-base flex-1 min-w-[80px]"
              >
                Check
              </button>
            )}
            
            {table.currentBet > currentPlayer.currentBet && table.currentBet > 0 && (
              <button
                onClick={() => gameAction("call")}
                className="px-3 py-1.5 bg-blue-600 rounded-lg hover:bg-blue-700 text-sm md:text-base flex-1 min-w-[80px]"
              >
                Call ({(table.currentBet - currentPlayer.currentBet).toFixed(2)})
              </button>
            )}
            <button
              onClick={() => gameAction("allin")}
              className="px-3 py-1.5 bg-purple-600 rounded-lg hover:bg-purple-700 text-sm md:text-base flex-1 min-w-[80px]"
            >
              All In
            </button>
          </div>
          
        </div>
      )}

      <div
        ref={chatContainerRef}
        className="flex flex-col"
        style={{
          position: "absolute",
          left: `${chatPosition.x}px`,
          top: `${chatPosition.y}px`,
          zIndex: 10,
          maxWidth: isMobile ? "200px" : "300px",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <button
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={toggleChat}
          className="self-start mb-2 p-2 bg-red-700 rounded-2xl hover:bg-red-600"
        >
          <Image src={tableChatIcon} alt="Toggle Chat" width={isMobile ? 20 : 40} height={isMobile ? 20 : 40} />
        </button>
        {isChatOpen && (
          <>
            <div
              className="flex-1 overflow-y-auto bg-gray-900 p-2 rounded-lg border text-xs"
              style={{ maxHeight: isMobile ? "25vh" : "200px" }}
            >
              {messages.map((msg, index) => (
                <div key={index} className="mb-1">
                  <span className="text-blue-400 font-bold text-xs">
                    {msg.user.name || `User_${msg.user._id.slice(0, 6)}`}:{" "}
                  </span>
                  <span className="text-xs">{msg.content}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="mt-2 flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 p-1 rounded-l-lg bg-gray-700 text-white border focus:outline-none text-xs"
                placeholder="Сэтгэгдэлээ бичих..."
              />
              <button
                onClick={handleSendMessage}
                className="p-1 bg-blue-500 text-gray-900 rounded-r-lg hover:bg-yellow-600 text-xs"
              >
                Илгээх
              </button>
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="text-xl font-bold text-white mb-4">Суудал {selectedSeat}</h2>
            <p className="text-gray-300 mb-4">Ширээнд суух хамгийн бага дүн: {table?.buyIn || 0} ₮</p>
            <input
              type="number"
              value={chipAmount}
              onChange={(e) => setChipAmount(Number(e.target.value))}
              min={table?.buyIn || 0}
              className="w-full p-2 mb-4 bg-gray-700 text-white rounded-lg border border-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Enter chip amount"
            />
            <div className="flex justify-between">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Үгүй
              </button>
              <button
                onClick={() => selectedSeat !== null && joinSeat(selectedSeat, chipAmount)}
                disabled={chipAmount < (table?.buyIn || 0)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:opacity-50"
              >
                Тийм
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function handleSendMessage() {
    if (!newMessage.trim() || !currentUser?._id) return;
    const messageData = {
      lobbyId: tableId,
      userId: currentUser._id,
      content: newMessage,
    };
    socket.emit("sendMessage", messageData);
    setNewMessage("");
    scrollToBottom();
  }
}
