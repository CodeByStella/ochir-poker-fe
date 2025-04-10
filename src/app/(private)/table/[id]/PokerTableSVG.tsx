import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import { AvatarLogo } from "@/components/icons/avatar";
import { IPlayer } from "@/models/player";
import { ITable } from "@/models/table";
import Table from "../../../../../public/asset/table.svg";
import { TableImage } from "@/components/icons/table";

interface PokerTableSVGProps {
  scale: number;
  pot: number;
  players?: IPlayer[];
  maxPlayers: number;
  currentUserId?: string;
  tableStatus: string;
  round: string;
  isDealing: boolean;
  winners: { playerId: string; chipsWon: number; handDescription?: string }[];
  onSeatClick: (seat: number) => void;
  isUserSeated: boolean;
  lastActions?: Map<string, PlayerAction>;
  currentPlayerId?: string;
  isAdmin?: boolean;
  showdownPlayers?: { playerId: string; cards: string[] }[];
  showCommunityCards?: boolean;
  table: ITable;
  getVisibleCardCount?: (round: string, totalCards: number) => number;
  isMobile?: boolean;
  adminPreviewCards?: string[];
}

interface PlayerAction {
  playerId: string;
  action: string;
  amount?: number;

  timestamp: Date;
}
const getWinningCards = (
  handDescription: string | undefined,
  playerCards: string[],
  communityCards: string[],
): string[] => {
  if (!handDescription || playerCards.length !== 2 || communityCards.length > 5)
    return [];

  const allCards = [...playerCards, ...communityCards];
  const ranks = allCards.map((card) => card.slice(0, -1)); // e.g., "A", "K", "2"
  const suits = allCards.map((card) => card.slice(-1)); // e.g., "s", "h"
  const rankValues = ranks.map((rank) => {
    if (rank === "A") return 14;
    if (rank === "K") return 13;
    if (rank === "Q") return 12;
    if (rank === "J") return 11;
    if (rank === "T") return 10;
    return parseInt(rank);
  });

  // Rank counts for pairs, three of a kind, etc.
  const rankCounts = ranks.reduce(
    (acc, rank) => {
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Suit counts for flush
  const suitCounts = suits.reduce(
    (acc, suit) => {
      acc[suit] = (acc[suit] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Helper to sort cards by rank value (high to low)
  const sortByRank = (cards: string[]) =>
    cards.sort((a, b) => {
      const aVal = rankValues[ranks.indexOf(a.slice(0, -1))];
      const bVal = rankValues[ranks.indexOf(b.slice(0, -1))];
      return bVal - aVal;
    });

  // Helper to get the highest cards as kickers
  const getKickers = (usedCards: string[], count: number): string[] => {
    const remaining = allCards.filter((card) => !usedCards.includes(card));
    return sortByRank(remaining).slice(0, count);
  };

  // Helper to check for straight
  const findStraight = (values: number[]): number[] | null => {
    const uniqueValues = Array.from(new Set(values)).sort((a, b) => b - a);
    if (uniqueValues.length < 5) return null;
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
        return uniqueValues.slice(i, i + 5);
      }
    }
    // Check Ace-low straight (A-5-4-3-2)
    if (
      uniqueValues.includes(14) &&
      uniqueValues.slice(-4).join("") === "5432"
    ) {
      return [14, 5, 4, 3, 2];
    }
    return null;
  };

  let winningCards: string[] = [];

  switch (handDescription) {
    case "Royal Flush": {
      const flushSuit = Object.keys(suitCounts).find(
        (suit) => suitCounts[suit] >= 5,
      )!;
      const flushCards = allCards.filter((card) => card.endsWith(flushSuit));
      const royalRanks = ["A", "K", "Q", "J", "T"];
      if (
        royalRanks.every((rank) =>
          flushCards.some((card) => card.startsWith(rank)),
        )
      ) {
        winningCards = flushCards.filter((card) =>
          royalRanks.includes(card.slice(0, -1)),
        );
      }
      break;
    }
    case "Straight Flush": {
      const flushSuit = Object.keys(suitCounts).find(
        (suit) => suitCounts[suit] >= 5,
      )!;
      const flushCards = sortByRank(
        allCards.filter((card) => card.endsWith(flushSuit)),
      );
      const flushValues = flushCards.map(
        (card) => rankValues[ranks.indexOf(card.slice(0, -1))],
      );
      const straight = findStraight(flushValues);
      if (straight) {
        winningCards = flushCards.filter((card) => {
          const rankVal = rankValues[ranks.indexOf(card.slice(0, -1))];
          return straight.includes(rankVal);
        });
      }
      break;
    }
    case "Four of a Kind": {
      const fourRank = Object.keys(rankCounts).find(
        (rank) => rankCounts[rank] === 4,
      )!;
      winningCards = allCards.filter((card) => card.startsWith(fourRank));
      winningCards = winningCards.concat(getKickers(winningCards, 1)); // Add 1 kicker
      break;
    }
    case "Full House": {
      const threeRank = Object.keys(rankCounts).find(
        (rank) => rankCounts[rank] === 3,
      )!;
      const pairRank = Object.keys(rankCounts).find(
        (rank) => rankCounts[rank] >= 2 && rank !== threeRank,
      )!;
      const threes = allCards
        .filter((card) => card.startsWith(threeRank))
        .slice(0, 3);
      const pairs = allCards
        .filter((card) => card.startsWith(pairRank))
        .slice(0, 2);
      winningCards = [...threes, ...pairs];
      break;
    }
    case "Flush": {
      const flushSuit = Object.keys(suitCounts).find(
        (suit) => suitCounts[suit] >= 5,
      )!;
      winningCards = sortByRank(
        allCards.filter((card) => card.endsWith(flushSuit)),
      ).slice(0, 5);
      break;
    }
    case "Straight": {
      const straightValues = findStraight(rankValues);
      if (straightValues) {
        winningCards = allCards
          .filter((card) => {
            const rankVal = rankValues[ranks.indexOf(card.slice(0, -1))];
            return straightValues.includes(rankVal);
          })
          .slice(0, 5);
      }
      break;
    }
    case "Three of a Kind": {
      const threeRank = Object.keys(rankCounts).find(
        (rank) => rankCounts[rank] === 3,
      )!;
      winningCards = allCards.filter((card) => card.startsWith(threeRank));
      winningCards = winningCards.concat(getKickers(winningCards, 2)); // Add 2 kickers
      break;
    }
    case "Two Pair": {
      const pairRanks = Object.keys(rankCounts)
        .filter((rank) => rankCounts[rank] === 2)
        .sort(
          (a, b) => rankValues[ranks.indexOf(b)] - rankValues[ranks.indexOf(a)],
        )
        .slice(0, 2);
      const pairs = pairRanks.flatMap((rank) =>
        allCards.filter((card) => card.startsWith(rank)).slice(0, 2),
      );
      winningCards = pairs.concat(getKickers(pairs, 1)); // Add 1 kicker
      break;
    }
    case "One Pair": {
      const pairRank = Object.keys(rankCounts).find(
        (rank) => rankCounts[rank] === 2,
      )!;
      winningCards = allCards.filter((card) => card.startsWith(pairRank));
      winningCards = winningCards.concat(getKickers(winningCards, 3)); // Add 3 kickers
      break;
    }
    case "High Card": {
      winningCards = sortByRank(allCards).slice(0, 5); // Top 5 cards
      break;
    }
    default:
      break;
  }

  // Ensure exactly 5 cards are returned
  return winningCards.length === 5 ? winningCards : [];
};

export const PokerTableSVG = memo(
  ({
    scale,
    pot,
    players = [],
    maxPlayers,
    currentUserId,
    tableStatus,
    round,
    isDealing,
    winners,
    onSeatClick,
    isUserSeated,
    lastActions,
    currentPlayerId,
    isAdmin,
    showdownPlayers = [],
    showCommunityCards,
    table,
    getVisibleCardCount,
    isMobile,
    adminPreviewCards = [],
  }: PokerTableSVGProps) => {
    const [timeLeft, setTimeLeft] = useState<number>(20);

    useEffect(() => {
      if (tableStatus === "playing" && currentPlayerId) {
        setTimeLeft(20);
        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      }
    }, [currentPlayerId, tableStatus]);

    const allPlayersAllIn = useMemo(() => {
      const activePlayers = players.filter((p) => p.inHand);
      return (
        activePlayers.length > 0 &&
        activePlayers.every((p) => p.currentBet >= p.chips && p.chips > 0)
      );
    }, [players]);

    const shouldRevealAllCards =
      tableStatus === "ended" && (allPlayersAllIn || winners.length > 0);

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

    const formatActionText = (action: PlayerAction) => {
      switch (action.action) {
        case "fold":
          return "Fold";
        case "check":
          return "Check";
        case "call":
          return `Call ${action.amount?.toFixed(2) || ""}`;
        case "raise":
          return `Raise ${action.amount?.toFixed(2) || ""}`;
        case "allin":
          return `All-In ${action.amount?.toFixed(2) || ""}`;
        default:
          return action.action;
      }
    };

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

    const formatBetAmount = (amount: number) => {
      if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
      return amount.toString();
    };

    const getSeatPosition = (index: number, totalSeats: number) => {
      const centerX = isMobile ? 520 : 512;
      const centerY = isMobile ? 636 : 267;
      const radiusX = isMobile ? 350 : 490;
      const radiusY = isMobile ? 570 : 250;

      const angleOffset = Math.PI / 2;
      const angleStep = (2 * Math.PI) / totalSeats;
      const angle = angleOffset + index * angleStep;

      const x = centerX + radiusX * Math.cos(angle);
      const y = centerY - radiusY * Math.sin(angle);

      return { x, y };
    };

    const cappedMaxPlayers = Math.min(maxPlayers, 10);
    const displayPositions = Array.from(
      { length: cappedMaxPlayers },
      (_, index) => ({
        seatIndex: index,
        occupied: false,
        player: null as IPlayer | null,
      }),
    );

    players.forEach((player) => {
      if (player.seat >= 0 && player.seat < cappedMaxPlayers) {
        displayPositions[player.seat] = {
          seatIndex: player.seat,
          occupied: true,
          player,
        };
      }
    });

    const seatSize = isMobile ? 100 : 70;
    const fontSizeMultiplier = isMobile ? 1.5 : 1;

    const getCardImagePath = (card: string) => {
      const suit = card.slice(-1);
      const value = card.slice(0, -1);
      let folder = "";
      switch (suit) {
        case "c":
          folder = "clubs";
          break;
        case "d":
          folder = "diamonds";
          break;
        case "s":
          folder = "spades";
          break;
        case "h":
          folder = "hearts";
          break;
        default:
          return "/card.png";
      }
      return `/cards/${folder}/${value}${suit}.svg`;
    };

    const memoImage = useCallback(
      (inHand: boolean) => (
        <AvatarLogo
          width={seatSize}
          height={seatSize}
          style={{ opacity: inHand ? 1 : 0.5 }}
        />
      ),
      [seatSize],
    );

    const DesktopSVG = () => {
      const chipStack = getChipStack(pot);
      const cardWidth = 45;
      const cardHeight = 60;
      const totalCards = table
        ? getVisibleCardCount
          ? getVisibleCardCount(table.round, table.communityCards.length)
          : 0
        : 0;
      const totalWidth = totalCards * cardWidth + (totalCards - 1) * 5;
      const centerX = 512;
      const centerY = 267;
      const communityCardsX = centerX - totalWidth / 2;
      const communityCardsY = centerY + 50;

      const adminCardWidth = 35;
      const adminCardHeight = 50;
      const adminTotalWidth =
        adminPreviewCards.length * adminCardWidth +
        (adminPreviewCards.length - 1) * 5;
      const adminCardsX = centerX - adminTotalWidth / 2;
      const adminCardsY = centerY + 120;

      const turnCircleRadius = seatSize / 2 + 5;
      const turnCircleCircumference = 2 * Math.PI * turnCircleRadius;

      return (
        <svg
          width="100vw"
          height="100vh"
          viewBox="-122 -64 1228 700"
          preserveAspectRatio="xMidYMin meet"
          className="max-w-full max-h-full"
        >
          <style>
            {`
            .winner-highlight { animation: pulse 1.5s infinite ease-in-out; }
            .winner-text { animation: fadeInUp 0.5s ease-out; }
              .turn-circle { 
                stroke-dasharray: ${turnCircleCircumference}; 
                stroke-dashoffset: ${(1 - timeLeft / 20) * turnCircleCircumference}; 
                transform: rotate(-90deg);
                transform-origin: center;
                transition: stroke-dashoffset 1s linear;
              }
            .card-highlight { filter: drop-shadow(0 0 5px #facc15); }
            @keyframes pulse {
              0% { stroke-opacity: 0.3; r: ${seatSize / 2}; }
              50% { stroke-opacity: 0.8; r: ${seatSize / 2 + 10}; }
              100% { stroke-opacity: 0.3; r: ${seatSize / 2}; }
            }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
              @keyframes dashCountdown {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -100; }
          }
          `}
          </style>

          {/* Table Background */}
          <image
            x="-130"
            y="-100"
            width={1300}
            height={750}
            href="/asset/desktops.png"
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Chip Stack */}
          <foreignObject x="462" y="200" width="100" height="100">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              {chipStack.map((chip, index) => (
                <Image
                  key={index}
                  src={chip.src}
                  alt={`Chip ${index}`}
                  width={25}
                  height={25}
                  style={{
                    marginTop: index === 0 ? 0 : -15,
                    zIndex: chipStack.length - index,
                  }}
                />
              ))}
            </div>
          </foreignObject>
          <text
            x="512"
            y="300"
            textAnchor="middle"
            fill="#fff"
            fontSize="16"
            fontFamily="bold"
          >
            Пот: {pot.toFixed(2)}
          </text>

          {/* Community Cards with Highlight */}
          {showCommunityCards && !isDealing && table.status === "playing" && (
            <g>
              {table.communityCards.slice(0, totalCards).map((card, index) => {
                const isWinningCard = winners.some((winner) => {
                  const showdownData = showdownPlayers.find(
                    (sp) => sp.playerId === winner.playerId,
                  );
                  const winningCards = getWinningCards(
                    winner.handDescription,
                    showdownData ? showdownData.cards : [],
                    table.communityCards,
                  );
                  return winningCards.includes(card);
                });
                return (
                  <g key={`community-${index}`}>
                    <image
                      x={communityCardsX + index * (cardWidth + 5)}
                      y={communityCardsY}
                      width={cardWidth}
                      height={cardHeight}
                      href={getCardImagePath(card)}
                      preserveAspectRatio="xMidYMid meet"
                      className={
                        isWinningCard && winners.length > 0
                          ? "card-highlight"
                          : ""
                      }
                      opacity={
                        winners.length > 0 ? (isWinningCard ? 1 : 0.5) : 1
                      }
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Admin Preview Cards */}
          {isAdmin &&
            adminPreviewCards.length > 0 &&
            table.round !== "showdown" &&
            table.round !== "river" && (
              <g>
                {adminPreviewCards.map((card, index) => (
                  <image
                    key={`admin-preview-${index}`}
                    x={adminCardsX + index * (adminCardWidth + 5)}
                    y={adminCardsY}
                    width={adminCardWidth}
                    height={adminCardHeight}
                    href={getCardImagePath(card)}
                    preserveAspectRatio="xMidYMid meet"
                    opacity={0.8}
                  />
                ))}
              </g>
            )}

          {/* Player Seats */}
          {displayPositions.map((seat) => {
            const { x, y } = getSeatPosition(seat.seatIndex, cappedMaxPlayers);
            const isWinner =
              seat.occupied &&
              winners.some((w) => w.playerId === seat.player?._id.toString());
            const winnerData = isWinner
              ? winners.find((w) => w.playerId === seat.player?._id.toString())
              : null;
            const lastAction =
              seat.occupied && seat.player
                ? lastActions?.get(seat.player._id.toString())
                : null;
            const isCurrentTurn =
              seat.occupied &&
              seat.player?._id.toString() === currentPlayerId &&
              tableStatus === "playing";
            const inHand =
              seat.occupied && seat.player ? seat.player.inHand : true;
            const isDealer = seat.seatIndex === table?.dealerSeat;

            return (
              <g
                key={`seat-${seat.seatIndex}`}
                className={`seat-${seat.seatIndex}`}
                transform={`translate(${x - seatSize / 2}, ${y - seatSize / 2})`}
              >
                {seat.occupied && seat.player ? (
                  <>
                    {isCurrentTurn && inHand && (
                      <circle
                        cx={seatSize / 2}
                        cy={seatSize / 2}
                        r={turnCircleRadius}
                        fill="none"
                        stroke="#00ff00"
                        strokeWidth="3"
                        className="turn-circle"
                        style={{
                          transformOrigin: `${seatSize / 2}px ${seatSize / 2}px`,
                        }}
                      />
                    )}
                    {isCurrentTurn && inHand && (
                      <text
                        x={seatSize / 2}
                        y={-10}
                        textAnchor="middle"
                        fill="#00ff00"
                        fontSize={fontSizeMultiplier * 14}
                        fontWeight="bold"
                      >
                        {timeLeft}s
                      </text>
                    )}
                    {isWinner && (
                      <circle
                        cx={seatSize / 2}
                        cy={seatSize / 2}
                        r={seatSize / 2}
                        fill="none"
                        stroke="#facc15"
                        strokeWidth="4"
                        className="winner-highlight"
                      />
                    )}
                    {isWinner && winnerData?.handDescription && (
                      <g transform={`translate(0, -${seatSize + 30})`}>
                        <rect
                          x={-seatSize}
                          y={-15}
                          width={seatSize * 2}
                          height={30}
                          rx={5}
                          fill="#1f2937"
                          opacity="0.9"
                        />
                        <text
                          x={0}
                          y={5}
                          textAnchor="middle"
                          fill="#facc15"
                          fontSize={fontSizeMultiplier * 12}
                          fontWeight="bold"
                          className="winner-text"
                        >
                          {winnerData.handDescription} (+
                          {formatBetAmount(winnerData.chipsWon)})
                        </text>
                      </g>
                    )}
                    <foreignObject
                      x={0}
                      y={0}
                      width={seatSize}
                      height={seatSize}
                    >
                      <div
                        style={{
                          width: `${seatSize}px`,
                          height: `${seatSize}px`,
                          borderRadius: "50%",
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          src={"/star1.png"}
                          alt="coin"
                          width={36}
                          height={36}
                          className="absolute"
                          style={{
                            top: 0,
                            left: -5,
                            zIndex: 4,
                            opacity: inHand ? 1 : 0.5,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            bottom: 0,
                            width: `${seatSize}px`,
                            height: `${seatSize + 5}px`,
                            borderRadius: "50%",
                            backgroundImage: `url('/cover.png')`,
                            backgroundSize: "contain",
                            backgroundPosition: "center",
                            zIndex: 1,
                            opacity: inHand ? 1 : 0.5,
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                            overflow: "hidden",
                            zIndex: 2,
                          }}
                        >
                          {memoImage(inHand)}
                        </div>
                      </div>
                    </foreignObject>
                    {isDealer && (
                      <image
                        x={seatSize - 20} // Position to the right of the seat
                        y={-20} // Position above the seat
                        width={20}
                        height={20}
                        href="/poker/dealer.svg"
                        preserveAspectRatio="xMidYMid meet"
                      />
                    )}
                    {lastAction &&
                      (showCommunityCards || winners.length > 0) && (
                        <g transform={`translate(0, ${seatSize})`}>
                          <foreignObject
                            x={-seatSize + 37}
                            y={0}
                            width={seatSize * 2}
                            height={25}
                          >
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                position: "relative",
                                opacity: inHand ? 0.9 : 0.5,
                              }}
                            >
                              <Image
                                src="/poker/lastaction.svg"
                                alt="Last Action"
                                layout="fill"
                                objectFit="cover"
                                style={{ opacity: inHand ? 0.9 : 0.5 }}
                              />
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#fff",
                                    fontSize: `${fontSizeMultiplier * 12}px`,
                                    fontWeight: "bold",
                                    textAlign: "center",
                                    opacity: inHand ? 1 : 0.5,
                                  }}
                                >
                                  {formatActionText(lastAction)}
                                </span>
                              </div>
                            </div>
                          </foreignObject>
                        </g>
                      )}
                    <foreignObject
                      x={-seatSize + 40}
                      y={seatSize + 20}
                      width={seatSize * 2}
                      height={50}
                    >
                      <div
                        style={{
                          backgroundColor: "rgba(31, 41, 55, 0.8)",
                          borderRadius: "9999px",
                          padding: "4px 8px",
                          textAlign: "center",
                          opacity: inHand ? 1 : 0.5,
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontSize: `${fontSizeMultiplier * 12}px`,
                            fontWeight: "bold",
                            color: "#fff",
                          }}
                        >
                          {seat.player.username}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: `${fontSizeMultiplier * 10}px`,
                            color: "#fff",
                          }}
                        >
                          {seat.player.chips.toFixed(2)}
                        </span>
                      </div>
                    </foreignObject>
                    {seat.player.currentBet > 0 && (
                      <foreignObject
                        x={-seatSize - 10}
                        y={seatSize - 8}
                        width={seatSize}
                        height={80}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                          }}
                        >
                          {getChipStack(seat.player.currentBet).map(
                            (chip, chipIndex) => (
                              <Image
                                key={chipIndex}
                                src={chip.src}
                                alt={`Chip ${chipIndex}`}
                                width={25}
                                height={25}
                                style={{
                                  marginTop: chipIndex === 0 ? 0 : -10,
                                  zIndex:
                                    getChipStack(seat.player!.currentBet)
                                      .length - chipIndex,
                                  opacity: inHand ? 1 : 0.5,
                                }}
                              />
                            ),
                          )}
                          <span
                            style={{
                              color: "#fff",
                              fontWeight: "bold",
                              marginTop: "4px",
                              fontSize: `${fontSizeMultiplier * 12}px`,
                              opacity: inHand ? 1 : 0.5,
                            }}
                          >
                            {formatBetAmount(seat.player.currentBet)}
                          </span>
                        </div>
                      </foreignObject>
                    )}
                  </>
                ) : (
                  <g>
                    <circle
                      cx={seatSize / 2}
                      cy={seatSize / 2}
                      r={seatSize / 2}
                      fill="rgba(55, 65, 81, 0.5)"
                      stroke="#9CA3AF"
                      strokeWidth="2"
                      className={
                        isUserSeated ? "" : "cursor-pointer hover:fill-gray-600"
                      }
                      onClick={() =>
                        !isUserSeated && onSeatClick(seat.seatIndex)
                      }
                    />
                    <text
                      x={seatSize / 2}
                      y={seatSize / 2 + 5}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={fontSizeMultiplier * 14}
                      onClick={() =>
                        !isUserSeated && onSeatClick(seat.seatIndex)
                      }
                      className="cursor-pointer hover:fill-gray-600"
                    >
                      СУУХ
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Player Cards with Highlight */}
          {displayPositions.map((seat) => {
            const { x, y } = getSeatPosition(seat.seatIndex, cappedMaxPlayers);
            const showdownData =
              seat.occupied &&
              showdownPlayers.find(
                (sp) => sp.playerId === seat.player?._id.toString(),
              );
            const inHand =
              seat.occupied && seat.player ? seat.player.inHand : true;
            const winnerData =
              seat.occupied &&
              winners.find((w) => w.playerId === seat.player?._id.toString());
            const winningCards = winnerData
              ? getWinningCards(
                  winnerData.handDescription,
                  typeof showdownData === "object"
                    ? showdownData.cards
                    : seat.player!.cards,
                  table.communityCards,
                )
              : [];

            if (
              seat.occupied &&
              seat.player &&
              seat.player.cards &&
              seat.player.cards.length > 0 &&
              !isDealing &&
              inHand
            ) {
              const cardX = x < 512 ? x - 130 : x + seatSize - 30;
              const cardY = y - 30;
              const isCardOpen =
                isAdmin ||
                seat.player?.user === currentUserId ||
                (showdownData !== undefined && winners.length > 0) ||
                (shouldRevealAllCards && inHand);

              const cardsToShow = showdownData
                ? showdownData.cards
                : seat.player.cards;
              return cardsToShow.map((card, idx) => (
                <g key={`${seat.seatIndex}-card-${idx}`}>
                  <image
                    x={cardX + idx * 25}
                    y={cardY}
                    width={40}
                    height={56}
                    href={isCardOpen ? getCardImagePath(card) : "/card.png"}
                    preserveAspectRatio="xMidYMid meet"
                    className={
                      winningCards.includes(card) && winners.length > 0
                        ? "card-highlight"
                        : ""
                    }
                  />
                </g>
              ));
            }
            return null;
          })}
        </svg>
      );
    };

    const MobileSVG = () => {
      const chipStack = getChipStack(pot);
      const cardWidth = 60;
      const cardHeight = 80;
      const totalCards = table
        ? getVisibleCardCount
          ? getVisibleCardCount(table.round, table.communityCards.length)
          : 0
        : 0;
      const totalWidth = totalCards * cardWidth + (totalCards - 1) * 10;
      const centerX = 500;
      const centerY = 636;
      const communityCardsX = centerX - totalWidth / 2;
      const communityCardsY = centerY - cardHeight / 2 - 50;

      const adminCardWidth = 40;
      const adminCardHeight = 56;
      const adminTotalWidth =
        adminPreviewCards.length * adminCardWidth +
        (adminPreviewCards.length - 1) * 10;
      const adminCardsX = centerX - adminTotalWidth / 2;
      const adminCardsY = centerY + cardHeight / 2 + 10;

      const turnCircleRadius = seatSize / 2 + 5;
      const turnCircleCircumference = 2 * Math.PI * turnCircleRadius;

      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
          }}
        >
          <svg
            width={840 * scale}
            height={1600 * scale}
            viewBox="60 -130 900 1700"
            className="max-w-full max-h-full"
          >
            <style>
              {`
              .winner-highlight { animation: pulse 1.5s infinite ease-in-out; }
              .winner-text { animation: fadeInUp 0.5s ease-out; }
              .turn-circle { 
                stroke-dasharray: ${turnCircleCircumference}; 
                stroke-dashoffset: ${(1 - timeLeft / 20) * turnCircleCircumference}; 
                transform: rotate(-90deg);
                transform-origin: center;
                transition: stroke-dashoffset 1s linear;
              }
              .card-highlight { filter: drop-shadow(0 0 5px #facc15); }
              @keyframes pulse {
                0% { stroke-opacity: 0.3; r: ${seatSize / 2}; }
                50% { stroke-opacity: 0.8; r: ${seatSize / 2 + 10}; }
                100% { stroke-opacity: 0.3; r: ${seatSize / 2}; }
              }
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes dashCountdown {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: -100; }
              }
            `}
            </style>

            {/* Custom Table Background */}
            {/* <image
            x="-80"
            y="-150"
            width="1000"
            height="1700"
            href="/asset/mobile.png"
            preserveAspectRatio="xMidYMid meet"
          /> */}

            <TableImage
              width={840 * scale}
              height={1600 * scale}
              x={(800 - 840 * scale) / 2 - 100} // Account for viewBox x offset
              y={(1700 - 1600 * scale) / 2 - 130} // Account for viewBox y offset
              preserveAspectRatio="xMidYMid meet"
            />
            {/* Chip Stack */}
            <foreignObject x="433" y="300" width="150" height="150">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                {chipStack.map((chip, index) => (
                  <Image
                    key={index}
                    src={chip.src}
                    alt={`Chip ${index}`}
                    width={70 * scale}
                    height={70 * scale}
                    style={{
                      marginTop: index === 0 ? 0 : -45 * scale,
                      zIndex: chipStack.length - index,
                    }}
                  />
                ))}
              </div>
            </foreignObject>
            <text
              x="510"
              y="495"
              textAnchor="middle"
              fill="#fff"
              fontFamily="bold"
              fontSize="36"
            >
              Пот: {pot.toFixed(2)}
            </text>

            {/* Community Cards with Highlight */}
            {showCommunityCards && !isDealing && table.status === "playing" && (
              <g>
                {table.communityCards
                  .slice(0, totalCards)
                  .map((card, index) => {
                    const isWinningCard = winners.some((winner) => {
                      const showdownData = showdownPlayers.find(
                        (sp) => sp.playerId === winner.playerId,
                      );
                      const winningCards = getWinningCards(
                        winner.handDescription,
                        showdownData ? showdownData.cards : [],
                        table.communityCards,
                      );
                      return winningCards.includes(card);
                    });
                    return (
                      <g key={`community-${index}`}>
                        <image
                          x={communityCardsX + index * (cardWidth + 10)}
                          y={communityCardsY}
                          width={cardWidth + 20}
                          height={cardHeight + 20}
                          href={getCardImagePath(card)}
                          preserveAspectRatio="xMidYMid meet"
                          className={
                            isWinningCard && winners.length > 0
                              ? "card-highlight"
                              : ""
                          }
                          opacity={
                            winners.length > 0 ? (isWinningCard ? 1 : 0.5) : 1
                          }
                        />
                      </g>
                    );
                  })}
              </g>
            )}

            {/* Admin Preview Cards */}
            {isAdmin &&
              adminPreviewCards.length > 0 &&
              table.round !== "showdown" &&
              table.round !== "river" && (
                <g>
                  {adminPreviewCards.map((card, index) => (
                    <image
                      key={`admin-preview-${index}`}
                      x={adminCardsX + index * (adminCardWidth + 10)}
                      y={adminCardsY}
                      width={adminCardWidth * 2}
                      height={adminCardHeight * 2}
                      href={getCardImagePath(card)}
                      preserveAspectRatio="xMidYMid meet"
                      opacity={0.8}
                    />
                  ))}
                </g>
              )}

            {/* Player Seats */}
            {displayPositions.map((seat) => {
              const { x, y } = getSeatPosition(
                seat.seatIndex,
                cappedMaxPlayers,
              );
              const isWinner =
                seat.occupied &&
                winners.some((w) => w.playerId === seat.player?._id.toString());
              const winnerData = isWinner
                ? winners.find(
                    (w) => w.playerId === seat.player?._id.toString(),
                  )
                : null;
              const lastAction =
                seat.occupied && seat.player
                  ? lastActions?.get(seat.player._id.toString())
                  : null;
              const isCurrentTurn =
                seat.occupied &&
                seat.player?._id.toString() === currentPlayerId &&
                tableStatus === "playing";
              const inHand =
                seat.occupied && seat.player ? seat.player.inHand : true;
              const isDealer = seat.seatIndex === table?.dealerSeat;
              return (
                <g
                  key={`seat-${seat.seatIndex}`}
                  className={`seat-${seat.seatIndex}`}
                  transform={`translate(${x - seatSize / 2}, ${y - seatSize / 2})`}
                >
                  {seat.occupied && seat.player ? (
                    <>
                      {isCurrentTurn && inHand && (
                        <circle
                          cx={seatSize / 2}
                          cy={seatSize / 2}
                          r={turnCircleRadius}
                          fill="none"
                          stroke="#00ff00"
                          strokeWidth="3"
                          className="turn-circle"
                          style={{
                            transformOrigin: `${seatSize / 2}px ${seatSize / 2}px`,
                          }}
                        />
                      )}
                      {isCurrentTurn && inHand && (
                        <text
                          x={seatSize / 2}
                          y={-10}
                          textAnchor="middle"
                          fill="#00ff00"
                          fontSize={fontSizeMultiplier * 14}
                          fontWeight="bold"
                        >
                          {timeLeft}s
                        </text>
                      )}
                      {isWinner && (
                        <circle
                          cx={seatSize / 2}
                          cy={seatSize / 2}
                          r={seatSize / 2}
                          fill="none"
                          stroke="#facc15"
                          strokeWidth="4"
                          className="winner-highlight"
                        />
                      )}
                      {isWinner && winnerData?.handDescription && (
                        <g transform={`translate(0, -${seatSize + 20})`}>
                          <rect
                            x={-seatSize}
                            y={-10}
                            width={seatSize * 2}
                            height={20}
                            rx={5}
                            fill="#1f2937"
                            opacity="0.9"
                          />
                          <text
                            x={0}
                            y={5}
                            textAnchor="middle"
                            fill="#facc15"
                            fontSize={fontSizeMultiplier * 12}
                            fontWeight="bold"
                            className="winner-text"
                          >
                            {winnerData.handDescription} (+
                            {formatBetAmount(winnerData.chipsWon)})
                          </text>
                        </g>
                      )}
                      <foreignObject
                        x={0}
                        y={0}
                        width={seatSize}
                        height={seatSize}
                      >
                        <div
                          style={{
                            width: `${seatSize}px`,
                            height: `${seatSize}px`,
                            borderRadius: "50%",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                              overflow: "hidden",
                              zIndex: 2,
                            }}
                          >
                            {memoImage(inHand)}
                          </div>
                        </div>
                      </foreignObject>
                      {isDealer && (
                        <image
                          x={seatSize - 30}
                          y={-30}
                          width={30}
                          height={30}
                          href="/poker/dealer.svg"
                          preserveAspectRatio="xMidYMid meet"
                        />
                      )}
                      {lastAction &&
                        (showCommunityCards || winners.length > 0) && (
                          <g transform={`translate(0, ${seatSize})`}>
                            <rect
                              x={-seatSize + 37}
                              y={0}
                              width={seatSize * 2}
                              height={25}
                              fill="#1f2937"
                              rx={5} 
                              opacity={inHand ? 0.9 : 0.5}
                            />
                            <image
                              x={-seatSize + 37}
                              y={0}
                              width={seatSize * 2}
                              height={25}
                              href="/poker/lastaction.svg"
                              preserveAspectRatio="xMidYMid meet"
                              opacity={inHand ? 0.9 : 0.5}
                            />
                            <text
                              x={37} 
                              y={17} 
                              textAnchor="middle"
                              fill="#fff"
                              fontSize={fontSizeMultiplier * 12}
                              fontWeight="bold"
                              opacity={inHand ? 1 : 0.5}
                            >
                              {formatActionText(lastAction)}
                            </text>
                          </g>
                        )}
                      <foreignObject
                        x={-seatSize + 40}
                        y={seatSize + 20}
                        width={seatSize * 2}
                        height={60}
                      >
                        <div
                          style={{
                            backgroundColor: "rgba(31, 41, 55, 0.8)",
                            borderRadius: "9999px",
                            padding: "4px 8px",
                            textAlign: "center",
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              fontSize: `${fontSizeMultiplier * 12}px`,
                              fontWeight: "bold",
                            }}
                          >
                            {seat.player.username}
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: `${fontSizeMultiplier * 10}px`,
                            }}
                          >
                            {seat.player.chips.toFixed(2)}
                          </span>
                        </div>
                      </foreignObject>

                      {seat.player.currentBet > 0 && (
                        <foreignObject
                          x={-seatSize - 10}
                          y={seatSize - 10}
                          width={seatSize}
                          height={60}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                            }}
                          >
                            {getChipStack(seat.player.currentBet).map(
                              (chip, chipIndex) => (
                                <Image
                                  key={chipIndex}
                                  src={chip.src}
                                  alt={`Chip ${chipIndex}`}
                                  width={40 * scale}
                                  height={40 * scale}
                                  style={{
                                    marginTop:
                                      chipIndex === 0 ? 0 : -15 * scale,
                                    zIndex:
                                      getChipStack(seat.player!.currentBet)
                                        .length - chipIndex,
                                    opacity: inHand ? 1 : 0.5,
                                  }}
                                />
                              ),
                            )}
                            <span
                              style={{
                                color: "#fff",
                                fontWeight: "bold",
                                marginTop: "4px",
                                fontSize: `${fontSizeMultiplier * 12}px`,
                                opacity: inHand ? 1 : 0.5,
                              }}
                            >
                              {formatBetAmount(seat.player.currentBet)}
                            </span>
                          </div>
                        </foreignObject>
                      )}
                    </>
                  ) : (
                    <g>
                      <circle
                        cx={seatSize / 2}
                        cy={seatSize / 2}
                        r={seatSize / 2}
                        fill="rgba(55, 65, 81, 0.5)"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                        className={
                          isUserSeated
                            ? ""
                            : "cursor-pointer hover:fill-gray-600"
                        }
                        onClick={() =>
                          !isUserSeated && onSeatClick(seat.seatIndex)
                        }
                      />
                      <text
                        x={seatSize / 2}
                        y={seatSize / 2 + 5}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={fontSizeMultiplier * 14}
                        onClick={() =>
                          !isUserSeated && onSeatClick(seat.seatIndex)
                        }
                        className="cursor-pointer hover:fill-gray-600"
                      >
                        СУУХ
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Player Cards with Highlight */}
            {displayPositions.map((seat) => {
              const { x, y } = getSeatPosition(
                seat.seatIndex,
                cappedMaxPlayers,
              );
              const showdownData =
                seat.occupied &&
                showdownPlayers.find(
                  (sp) => sp.playerId === seat.player?._id.toString(),
                );
              const inHand =
                seat.occupied && seat.player ? seat.player.inHand : true;
              const winnerData =
                seat.occupied &&
                winners.find((w) => w.playerId === seat.player?._id.toString());
              const winningCards = winnerData
                ? getWinningCards(
                    winnerData.handDescription,
                    showdownData && typeof showdownData === "object"
                      ? showdownData.cards
                      : seat.player!.cards,
                    table.communityCards,
                  )
                : [];

              if (
                seat.occupied &&
                seat.player &&
                seat.player.cards &&
                seat.player.cards.length > 0 &&
                !isDealing &&
                inHand
              ) {
                const cardX = x < 420 ? x + seatSize - 40 : x - 120;
                const cardY = y - 60;

                const isCardOpen =
                  isAdmin ||
                  seat.player?.user === currentUserId ||
                  (showdownData !== undefined && winners.length > 0) ||
                  (shouldRevealAllCards && inHand);
                const cardsToShow =
                  showdownData && showdownData.cards
                    ? showdownData.cards
                    : seat.player.cards;

                return cardsToShow.map((card, idx) => (
                  <g key={`${seat.seatIndex}-card-${idx}`}>
                    <image
                      x={cardX + idx * 35}
                      y={cardY}
                      width={60}
                      height={75}
                      href={isCardOpen ? getCardImagePath(card) : "/card.png"}
                      preserveAspectRatio="xMidYMid meet"
                      className={
                        winningCards.includes(card) && winners.length > 0
                          ? "card-highlight"
                          : ""
                      }
                    />
                  </g>
                ));
              }
              return null;
            })}
          </svg>
        </div>
      );
    };
    return isMobile ? <MobileSVG /> : <DesktopSVG />;
  },
);

PokerTableSVG.displayName = "PokerTableSVG";
