"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import io, { Socket } from "socket.io-client";
import useSWR from "swr";
import { authApi } from "@/apis";
import { message as toastMessage } from "@/utils/toast";
import background from "../../../../../public/asset/back.jpg";
import cardBack from "../../../../../public/card.png";
import { PokerTableSVG } from "./PokerTableSVG";
import cardStyles from "../../../../components/card/Card.module.css";
import LoginModal from "@/components/modal/Login";
import { siteApi } from "@/config/site";
import { Header } from "@/components/header";
import ChatComponent from "@/components/PokerTable/ChatSection";
import Waitinglist from "@/components/PokerTable/WaitingList";
import SeatInstruction from "@/components/PokerTable/SeatInstruction";
import SeatModal from "@/components/PokerTable/SeatModal";
import { chipImages } from "@/constants";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { IUser } from "@/models/user";
import ButtonNav from "@/components/PokerTable/ButtonNav";
import { ITable } from "@/models/table";

const socket: Socket = io(`${siteApi}`, {
  withCredentials: true,
  reconnection: true,
});

const SHUFFLE_DURATION = 1500;
const WINNER_DISPLAY_DURATION = 5000;
const CHIP_ANIMATION_DURATION = 1000;

interface DealCardsData {
  tableId: string;
  players: {
    user: string;
    seat: number;
    cards: [string, string];
    chips: number;
    username: string;
  }[];
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
  const [raiseAmount, setRaiseAmount] = useState<number>(0);
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [winners, setWinners] = useState<WinnerData[]>([]);
  const [showCommunityCards, setShowCommunityCards] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [chipAmount, setChipAmount] = useState<number>(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const animationContainerRef = useRef<HTMLDivElement>(null);
  const [lastActions, setLastActions] = useState<Map<string, PlayerAction>>(new Map());
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [adminPreviewCards, setAdminPreviewCards] = useState<string[]>([]);
  const [showdownPlayers, setShowdownPlayers] = useState<{ playerId: string; cards: string[] }[]>([]);
  const [isRaiseOpen, setIsRaiseOpen] = useState<boolean>(false);

  const isMobile = screenWidth < 768;
  const tableWidth = isMobile ? 600 : "80%";
  const tableHeight = isMobile ? 900 : "80%";
  const scale = Math.min(
    screenWidth / (isMobile ? 700 : 1000),
    screenHeight / (isMobile ? 1000 : 600),
  );
  const { token } = useSelector((state: RootState) => state.auth);

  const { data: currentUser, mutate, isLoading } = useSWR<IUser>(`swr.auth.me.${token}`, async () => {
    const res = await authApi.me();
    return res;
  });
  const isAdmin = currentUser?.role === "admin";

  const shuffleSound = useMemo(() => new Audio("/mp3/shuffle.mp3"), []);
  const foldSound = new Audio("/mp3/fold.mp3");
  const potSound = useMemo(() => new Audio("/mp3/pot.mp3"), []);
  const chipSound = useMemo(() => new Audio("/mp3/chip.mp3"), []);
  const flipSound = useMemo(() => new Audio("/mp3/flip.mp3"), []);
  const checkSound = new Audio("/mp3/check.mp3");
  const callSound = new Audio("/mp3/call.mp3");
  const raiseSound = new Audio("/mp3/raise.mp3");

  const getChipStack = (amount: number) => {
    if (amount === 0) {
      return [chipImages[0]];
    }
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

  const animateDealCards = useCallback(
    (
      players: {
        user: string;
        seat: number;
        cards: [string, string];
        chips: number;
        username: string;
      }[],
      maxPlayers: number,
    ) => {
      const container = animationContainerRef.current;
      if (!container || !players?.length || !maxPlayers) {
        setIsDealing(false);
        return;
      }

      container.innerHTML = "";
      const dealStep = 200;
      let totalTime = 0;

      players.forEach((player, playerIndex) => {
        const seatElement = document.querySelector(`.seat-${player.seat}`);
        const cardContainer = seatElement?.querySelector(".player-cards") || seatElement;
        if (!seatElement || !cardContainer) return;

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
    },
    [flipSound, isMobile]
  );

  const leaveSeat = useCallback(() => {
    if (socket && tableId && currentUser?._id) {
      socket.emit("leaveSeat", { tableId, userId: currentUser._id });
      console.log(`Emitted leaveSeat for user ${currentUser._id} on table ${tableId}`);
    }
  }, [currentUser?._id, tableId]);

  useEffect(() => {
    const updateScreenSize = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };
    updateScreenSize();
    const currentTurnTimer = turnTimerRef.current;
    window.addEventListener("resize", updateScreenSize);

    const handleTableUpdate = (data: ITable) => {
      setTable(data);
      updateAdminPreviewCards(data);
      setRaiseAmount(data?.currentBet + 10);
      setWinners([]);
      if (
        data.status === "playing" &&
        (data.round !== "preflop" || data.communityCards.length > 0)
      ) {
        setShowCommunityCards(true);
      }
      // Clear the last action for the current player when their turn starts
      if (data.status === "playing" && data.players[data.currentPlayer]?._id) {
        setLastActions((prev) => {
          const newActions = new Map(prev);
          newActions.delete(data.players[data.currentPlayer]._id.toString());
          return newActions;
        });
      }
    };

    const updateAdminPreviewCards = (tableData: ITable) => {
      if (
        isAdmin &&
        tableData.status === "playing" &&
        tableData.deck.length >= 5
      ) {
        const deck = tableData.deck;
        const lastSix = deck.slice(-5);
        const previewCards = [
          lastSix[0],
          lastSix[1],
          lastSix[2],
          lastSix[3],
          lastSix[4],
        ];
        setAdminPreviewCards(previewCards);
      } else {
        setAdminPreviewCards([]);
      }
    };

    socket.on("connect", () => {
      console.log("Socket connected");
      socket.emit("getTableData", tableId);
      socket.emit("joinTable", { userId: currentUser?._id, tableId });
    });

    socket.on("reconnect", () => {
      socket.emit("joinTable", { userId: currentUser?._id, tableId });
      socket.emit("getTableData", tableId);
      socket.emit("getLobbyMessages");
    });

    socket.on("tableData", handleTableUpdate);
    socket.on("tableUpdate", handleTableUpdate);

    socket.on("playerDisconnected", (playerId) => {
      console.log(`Player ${playerId} disconnected`);
    });

    socket.on("playerRemoved", (playerId) => {
      console.log(`Player ${playerId} was removed from the table`);
    });

    socket.on("gameStarted", (data: ITable) => {
      shuffleSound.play().catch((err) => console.error("Error playing shuffle sound:", err));
      setTable(data);
      updateAdminPreviewCards(data);
      setShowCommunityCards(false);
      setLastActions(new Map()); // Reset last actions when a new game starts
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
    });

    socket.on("dealCards", (data: DealCardsData) => {
      if (data.tableId !== tableId) return;
      console.log("Received dealCards event:", data);

      setIsDealing(true);
      setTimeout(() => {
        animateDealCards(data.players, table?.maxPlayers || 10);
      }, SHUFFLE_DURATION);

      setTimeout(
        () => {
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
        },
        SHUFFLE_DURATION + data.players.length * 2 * 200 + 500,
      );
    });

    socket.on("handResult", (data: {
      winners: WinnerData[];
      showdownPlayers: { playerId: string; cards: string[] }[];
    }) => {
      setWinners(data.winners);
      setShowdownPlayers(data.showdownPlayers);
      potSound.play().catch((err) => console.error("Error playing pot sound:", err));
      setShowCommunityCards(true);
      setTimeout(() => {
        setWinners([]);
        setShowdownPlayers([]);
        setShowCommunityCards(false);
        setLastActions(new Map()); // Clear last actions after hand result
      }, WINNER_DISPLAY_DURATION);
    });

    socket.on("roundUpdate", (data: ITable) => {
      if (data._id !== tableId) return;
      if (data.round !== "preflop" || data.communityCards.length > 0) {
        flipSound.play().catch((err) => console.error("Error playing flip sound:", err));
        setShowCommunityCards(true);
      }
      setTable(data);
      // Clear the last action for the current player when their turn starts
      if (data.status === "playing" && data.players[data.currentPlayer]?._id) {
        setLastActions((prev) => {
          const newActions = new Map(prev);
          newActions.delete(data.players[data.currentPlayer]._id.toString());
          return newActions;
        });
      }
    });

    socket.on("chipsAdded", ({ tableId: updatedTableId, userId, amount }) => {
      if (updatedTableId !== tableId) return;
      setTable((prev) => {
        if (!prev) return prev;
        const updatedPlayers = prev.players.map((player) =>
          player.user === userId
            ? { ...player, chips: player.chips + amount }
            : player,
        );
        return { ...prev, players: updatedPlayers };
      });
      chipSound.play().catch((err) => console.error("Error playing chip sound:", err));
      toastMessage.success(`Added ${amount} chips to your stack`);
    });

    socket.on("error", (msg: string) => toastMessage.error(msg));

    if (tableId) {
      socket.emit("joinTable", { userId: currentUser?._id, tableId });
      socket.emit("getTableData", tableId);
    }

    return () => {
      window.removeEventListener("resize", updateScreenSize);
      socket.off("connect");
      socket.off("reconnect");
      socket.off("tableData");
      socket.off("tableUpdate", handleTableUpdate);
      socket.off("playerDisconnected");
      socket.off("playerRemoved");
      socket.off("gameStarted");
      socket.off("playerAction");
      socket.off("dealCards");
      socket.off("handResult");
      socket.off("roundUpdate");
      socket.off("chipsAdded");
      socket.off("error");
      if (currentTurnTimer) {
        clearInterval(currentTurnTimer);
      }
    };
  }, [tableId, currentUser?._id, isAdmin, shuffleSound, animateDealCards, table?.maxPlayers, potSound, flipSound, chipSound]);

  useEffect(() => {
    const handleBeforeUnload = (event: any) => {
      leaveSeat();
      event.preventDefault();
      event.returnValue = "Are you sure you want to leave the table?";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      leaveSeat();
    };
  }, [leaveSeat, currentUser?._id]);

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

  const animateChips = (seat: number, amount: number) => {
    const container = animationContainerRef.current;
    if (!container || !table) return;

    const seatElement = document.querySelector(`.seat-${seat}`);
    if (!seatElement) return;

    const rect = seatElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const startX = rect.left - containerRect.left + (isMobile ? 50 : 35);
    const startY = rect.top - containerRect.top + (isMobile ? 50 : 35);
    const targetX = startX + (isMobile ? 0 : -50);
    const targetY = startY + (isMobile ? 60 : 40);

    const chipStack = getChipStack(amount);
    chipStack.forEach((chip, index) => {
      const chipElement = document.createElement("div");
      chipElement.className = "chip-animate";
      chipElement.style.position = "absolute";
      chipElement.style.left = `${startX}px`;
      chipElement.style.top = `${startY}px`;
      chipElement.style.zIndex = "100";
      chipElement.style.animationDelay = `${index * 100}ms`;
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
    socket.emit("gameAction", {
      tableId,
      action,
      amount: betAmount,
      userId: currentUser._id,
    });
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

  const getVisibleCardCount = (round: string, totalCards: number): number => {
    switch (round) {
      case "preflop":
        return 0;
      case "flop":
        return Math.min(3, totalCards);
      case "turn":
        return Math.min(4, totalCards);
      case "river":
      case "showdown":
        return Math.min(5, totalCards);
      default:
        return 0;
    }
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
  }));
  const isUserSeated = players.some((p) => p.user === currentUser?._id);
  const currentPlayer = table?.players[table.currentPlayer];
  const isMyTurn =
    currentPlayer?.user === currentUser?._id && !currentPlayer?.hasActed;

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
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: ${isMobile ? `${tableWidth}px` : tableWidth};
          height: ${isMobile ? `${tableHeight}px` : tableHeight};
          max-width: 100%;
          max-height: 100%;
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
            transform: translate(var(--chip-target-x), var(--chip-target-y))
              scale(0.8);
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
            showCommunityCards={showCommunityCards}
            table={table}
            getVisibleCardCount={getVisibleCardCount}
            isMobile={isMobile}
            adminPreviewCards={adminPreviewCards}
          />
          <div
            ref={animationContainerRef}
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 50,
            }}
          />
        </div>
      </div>

      <div className="fixed top-[5%] left-8">
        <p className="text-gray-500">#{table.name}</p>
      </div>

      <ChatComponent socket={socket} tableId={tableId} currentUser={currentUser} />
      <Waitinglist table={table} />
      <SeatInstruction isUserSeated={isUserSeated} isMobile={isMobile} />

      {isMyTurn && table.status === "playing" && (
        <ButtonNav
          isRaiseOpen={isRaiseOpen}
          setIsRaiseOpen={setIsRaiseOpen}
          isMobile={isMobile}
          raiseAmount={raiseAmount}
          setRaiseAmount={setRaiseAmount}
          table={table}
          currentPlayer={currentPlayer}
          gameAction={gameAction}
        />
      )}

      {isModalOpen && (
        <SeatModal
          chipAmount={chipAmount}
          closeModal={closeModal}
          joinSeat={joinSeat}
          selectedSeat={selectedSeat}
          setChipAmount={setChipAmount}
          table={table}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}