import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { AvatarLogo } from "@/components/icons/avatar";
import { IPlayer } from "@/models/player";
import { ITable } from "@/models/table";


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
  dealAnimationComplete?: boolean;
  isFlippingCommunityCards?: boolean;
  flipAnimationComplete?: boolean;
  flippedCardIndices?: Set<Number>;
  isMyTurn?: boolean;
  currentPlayer: IPlayer;
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

  // Parse the hand description for detailed cases like "High Card A with K, T, 4 kicker"
  const handMatch = handDescription.match(
    /^(.*?)(?: \((.*?)\))?(?: with (.*?) kicker)?$/,
  );
  if (!handMatch) return [];

  const handType = handMatch[1]; // e.g., "High Card"
  const handDetails = handMatch[2] ? handMatch[2].split(" and ") : []; // e.g., ["As"] (not used for High Card)
  const kickerDetail = handMatch[3] ? handMatch[3].split(", ") : []; // e.g., ["K", "T", "4"]

  switch (handType) {
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
      winningCards = winningCards.concat(getKickers(winningCards, 1));
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
      winningCards = winningCards.concat(getKickers(winningCards, 2));
      break;
    }
    case "Two Pair": {
      const pairRank1 =
        handDetails[0]?.replace("s", "") ||
        Object.keys(rankCounts)
          .filter((rank) => rankCounts[rank] === 2)
          .sort(
            (a, b) =>
              rankValues[ranks.indexOf(b)] - rankValues[ranks.indexOf(a)],
          )[0];
      const pairRank2 =
        handDetails[1]?.replace("s", "") ||
        Object.keys(rankCounts)
          .filter((rank) => rankCounts[rank] === 2)
          .sort(
            (a, b) =>
              rankValues[ranks.indexOf(b)] - rankValues[ranks.indexOf(a)],
          )[1];

      const pairs1 = allCards
        .filter((card) => card.startsWith(pairRank1))
        .slice(0, 2);
      const pairs2 = allCards
        .filter((card) => card.startsWith(pairRank2))
        .slice(0, 2);

      let kickerCards: string[] = [];
      if (kickerDetail.length > 0) {
        kickerCards = allCards
          .filter((card) => card.startsWith(kickerDetail[0]))
          .slice(0, 1);
      } else {
        kickerCards = getKickers([...pairs1, ...pairs2], 1);
      }

      winningCards = [...pairs1, ...pairs2, ...kickerCards];
      break;
    }
    case "One Pair": {
      const pairRank =
        handDetails[0]?.replace("s", "") ||
        Object.keys(rankCounts).find((rank) => rankCounts[rank] === 2)!;
      winningCards = allCards.filter((card) => card.startsWith(pairRank));
      winningCards = winningCards.concat(getKickers(winningCards, 3));
      break;
    }
    case "High Card": {
      // Extract the high card and kickers from the hand description
      const highCardRank = handDescription.match(/High Card (\w+)/)?.[1]; // e.g., "A"
      const kickerRanks = kickerDetail; // e.g., ["K", "T", "4"]

      if (highCardRank) {
        // Get all cards with the high card rank (e.g., all Aces)
        const highCards = allCards.filter((card) =>
          card.startsWith(highCardRank),
        );
        // Take up to 2 Aces (in case there are multiple, like Ah and As)
        winningCards = highCards.slice(0, 2);

        // Get the kicker cards
        const remainingCards = allCards.filter(
          (card) => !winningCards.includes(card),
        );
        const kickerCards: string[] = [];
        for (const kickerRank of kickerRanks) {
          const kickerCard = remainingCards.find((card) =>
            card.startsWith(kickerRank),
          );
          if (kickerCard) {
            kickerCards.push(kickerCard);
          }
        }

        // Combine high cards and kickers to form the 5-card hand
        winningCards = [...winningCards, ...kickerCards].slice(0, 5);

        // If we don't have enough cards (e.g., missing kickers in allCards), fill with highest remaining cards
        if (winningCards.length < 5) {
          const additionalKickers = getKickers(
            winningCards,
            5 - winningCards.length,
          );
          winningCards = [...winningCards, ...additionalKickers];
        }
      }
      break;
    }
    default:
      break;
  }

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
    dealAnimationComplete,
    isFlippingCommunityCards = false,
    flipAnimationComplete = true,
    currentPlayer,
  }: PokerTableSVGProps) => {
    const [timeLeft, setTimeLeft] = useState<number>(20);

    useEffect(() => {
      if (
        tableStatus === "playing" &&
        currentPlayerId &&
        dealAnimationComplete
      ) {
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
    }, [currentPlayerId, tableStatus, dealAnimationComplete]);

    const allPlayersAllIn = useMemo(() => {
      const activePlayers = players.filter((p) => p.inHand);
      return (
        activePlayers.length > 0 &&
        activePlayers.every((p) => p.currentBet >= p.chips && p.chips > 0)
      );
    }, [players]);

    const shouldRevealAllCards =
      tableStatus === "ended" &&
      (allPlayersAllIn || winners.length > 0) &&
      !isFlippingCommunityCards &&
      flipAnimationComplete &&
      showCommunityCards;

    const getActionBackgroundColor = (action: string) => {
      switch (action.toLowerCase()) {
        case "call":
        case "raise":
          return "#3b82f6";
        case "check":
          return "#22c55e";
        case "allin":
          return "#f97316";
        default:
          return "transparent";
      }
    };

    const formatActionText = (action: PlayerAction) => {
      switch (action.action) {
        case "fold":
          return "Fold";
        case "check":
          return "Check";
        case "call":
          return `Call `;
        case "raise":
          return `Raise`;
        case "allin":
          return `All-In`;
        default:
          return action.action;
      }
    };
    const formatBetAmount = (amount: number) => {
      if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
      return amount.toString();
    };

    const getSeatPosition = (index: number, totalSeats: number) => {
      const centerX = isMobile ? 430 : 512;
      const centerY = isMobile ? 630 : 267;
      const radiusX = isMobile ? 350 : 490;
      const radiusY = isMobile ? 550 : 250;

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
    const fontSizeMultiplier = isMobile ? 2 : 1;

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

    const isSeatOnLeft = (seatIndex: number, totalSeats: number) => {
      const centerSeat = totalSeats / 2;
      return seatIndex >= centerSeat;
    };

    const DesktopSVG = () => {
      const cardWidth = 50;
      const cardHeight = 65;
      const totalCards = table
      ? getVisibleCardCount
        ? getVisibleCardCount(table.round, table.communityCards.length)
        : 0
      : 0;
      const totalWidth = totalCards * cardWidth + (totalCards - 1) * 5;
      const centerX = 512;
      const centerY = 267;
      const communityCardsX = centerX - totalWidth / 2;
      const communityCardsY = centerY - 50;

      const adminCardWidth = 35;
      const adminCardHeight = 50;
      const adminTotalWidth =
        adminPreviewCards.length * adminCardWidth +
        (adminPreviewCards.length - 1) * 5;
        const adminCardsX = centerX - adminTotalWidth / 2 - 50;
        const adminCardsY = communityCardsY + cardHeight - 160;

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
          <svg>
            <path
              d="M276.6,510h474.2C886.4,510,1001.2,405.5,1001.2,267.5S890,25,768.6,25c-64.2,0-97.9,5.2-142.5,10.4 c-40.1,4.6-62.4,8.9-112.4,9.4c-49.9-0.5-87.9-4.9-128-9.4c-44.6-5.1-62.5-10.4-126.9-10.4C137.5,25,26.2,129.5,26.2,267.5S138.6,510,276.6,510 z"
              fill="#b3a18a"
            />
            <radialGradient
              id="desktop-a"
              cx="416.897"
              cy="196.979"
              r="494.325"
              gradientTransform="matrix(1.2519 .01794 -.01025 .7147 -6.135 119.241)"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopOpacity="0" />
              <stop offset=".535" stopOpacity=".2" />
              <stop offset="1" stopOpacity=".6" />
            </radialGradient>
            <path
              d="M276.6,510h474.2C886.4,510,1001.2,405.5,1001.2,267.5S890,25,768.6,25c-64.2,0-97.9,5.2-142.5,10.4 c-40.1,4.6-62.4,8.9-112.4,9.4c-49.9-0.5-87.9-4.9-128-9.4c-44.6-5.1-62.5-10.4-126.9-10.4C137.5,25,26.2,129.5,26.2,267.5S138.6,510,276.6,510 z"
              fill="url(#desktop-a)"
            />
            <radialGradient
              id="desktop-b"
              cx="416.897"
              cy="196.979"
              r="537.771"
              gradientTransform="matrix(1.2518 .01997 -.01141 .7147 -5.894 118.396)"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopOpacity="0" />
              <stop offset=".535" stopOpacity=".2" />
              <stop offset="1" stopOpacity=".6" />
            </radialGradient>
            <path
              d="M276.6,486.2C149.5,486.2,50,390.1,50,267.5c0-59.2,22.8-114.8,63.9-156.2c39.4-39.8,92.2-62.5,145-62.5 c46.9,0,67.9,2.9,94.5,6.4c9.1,1.2,18.5,2.5,29.8,3.8c40.8,4.6,79.2,9,130.4,9.6h0.5c40.5-0.4,64-3.4,91.2-6.8c7.4-0.9,15-1.9,23.5-2.9 c6.4-0.8,12.6-1.5,18.6-2.1c36.2-4.2,67.5-8,121.1-8c52.8,0,105.6,22.8,145,62.5c41.2,41.6,63.9,97.1,63.9,156.2c0,122.6-99.5,218.8-226.6,218.8 H276.6z"
              fill="url(#desktop-b)"
            />
            <path
              d="M917.1,107.8C876.9,67,822.8,43.8,768.6,43.8c-54,0-85.4,3.8-121.8,8c-6.1,0.7-12.2,1.5-18.6,2.1 c-8.5,1-16.1,1.9-23.6,2.9c-27,3.4-50.4,6.2-90.6,6.8h-0.4c-50.9-0.5-89.2-4.9-129.9-9.5c-11.2-1.2-20.6-2.5-29.6-3.8 c-26.8-3.6-47.9-6.5-95.1-6.5c-54.1,0-108.2,23.2-148.5,64C68.2,150.2,45,207,45,267.5c0,125.5,101.8,223.8,231.6,223.8h474.2 C880.8,491.2,982.5,392.9,982.5,267.5C982.5,207,959.2,150.2,917.1,107.8z M750.9,486.2H276.6C149.5,486.2,50,390.1,50,267.5 c0-59.2,22.8-114.8,63.9-156.2c39.4-39.8,92.2-62.5,145-62.5c46.9,0,67.9,2.9,94.5,6.4c9.1,1.2,18.5,2.5,29.8,3.8 c40.8,4.6,79.2,9,130.4,9.6h0.5c40.5-0.4,64-3.4,91.2-6.8c7.4-0.9,15-1.9,23.5-2.9c6.4-0.8,12.6-1.5,18.6-2.1 c36.2-4.2,67.5-8,121.1-8c52.8,0,105.6,22.8,145,62.5c41.2,41.6,63.9,97.1,63.9,156.2C977.5,390.1,878,486.2,750.9,486.2z"
              opacity=".1"
              fill="#fff"
            />
            {/* <foreignObject x="310.7" y="50.5" width="400" height="400">
              <Image
                src={SiteLogo}
                alt="Site Logo"
                width={400}
                height={400}
                style={{ objectFit: "contain" }}
              />
            </foreignObject> */}
            <text
              x="513.7"
              y="380.5"
              textAnchor="middle"
              
              fill="#BEBEBE"
              fontWeight="Bold"
              fontSize={"24"}
            >
              {table.name} Stakes: {table.smallBlind}/{table.bigBlind}
            </text>
          </svg>

          <foreignObject x="462" y="350" width="100" height="100">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <div className="text-white font-bold">
                  Пот: {pot.toLocaleString()}
                </div>
            </div>
          </foreignObject>

          {showCommunityCards && !isDealing && (
  <g>
    {winners.length > 0 && winners[0]?.handDescription && (
      <>
        <text
          x={communityCardsX + totalWidth / 2}
          y={communityCardsY - 40}
          textAnchor="middle"
          fill="#facc15"
          fontSize={fontSizeMultiplier * 14}
          fontWeight="bold"
        >
          {winners[0].handDescription}
        </text>
        <text
          x={communityCardsX + totalWidth / 2}
          y={communityCardsY - 20}
          textAnchor="middle"
          fill="#facc15"
          fontSize={fontSizeMultiplier * 12}
          fontWeight="bold"
        >
          Won: {winners.reduce((sum, w) => sum + w.chipsWon, 0).toFixed(2)}
        </text>
      </>
    )}
    {table.communityCards.map((card, index) => {
      const isWinningCard = winners.some((winner) => {
        const showdownData = showdownPlayers.find(
          (sp) => sp.playerId === winner.playerId
        );
        const winningCards = getWinningCards(
          winner.handDescription,
          showdownData ? showdownData.cards : [],
          table.communityCards
        );
        return winningCards.includes(card);
      });
      const gap = isMobile ? 40 : 10;
      return (
        <g key={`community-${index}`}>
          <image
            x={isMobile ? communityCardsX + index * (cardWidth + gap) - 120 : communityCardsX + index * (cardWidth + gap)}
            y={isMobile ? communityCardsY + 70 : communityCardsY}
            width={isMobile ? cardWidth + 60 : cardWidth * 1.5}
            height={isMobile ? cardHeight + 60 : cardHeight * 1.5}
            href={getCardImagePath(card)}
            preserveAspectRatio="xMidYMid meet"
            className={isWinningCard && winners.length > 0 ? "card-highlight" : ""}
            opacity={winners.length > 0 ? (isWinningCard ? 1 : 0.5) : 1}
          />
        </g>
      );
    })}
  </g>
)}
          {isAdmin &&
            adminPreviewCards.length > 0 &&
            table.round !== "showdown" &&
            table.round !== "river" && (
              <g>
                {adminPreviewCards.map((card, index) => (
                  <image
                    key={`admin-preview-${index}`}
                    x={adminCardsX + index * (adminCardWidth + 20)}
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
              tableStatus === "playing" &&
              dealAnimationComplete;
            const inHand =
              seat.occupied && seat.player ? seat.player.inHand : true;
            const isDealer = seat.seatIndex === table?.dealerSeat;
            const isCurrentUser =
              seat.occupied && seat.player?.user === currentUserId;
            const dealerXOffset = isCurrentUser
              ? isSeatOnLeft(seat.seatIndex, cappedMaxPlayers)
                ? -(seatSize + 10)
                : seatSize + 10
              : seatSize + 10;

            return (
              <g
                key={`seat-${seat.seatIndex}`}
                className={`seat-${seat.seatIndex}`}
                transform={`translate(${x - seatSize / 2}, ${y - seatSize / 2})`}
              >
                {seat.occupied && seat.player  ? (
                  <>
                    {isCurrentTurn && inHand && currentPlayer?.cards.length > 0 &&(
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
                    {isCurrentTurn && inHand && currentPlayer?.cards.length > 0 &&(
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
                    {/* Username and Chips Container */}
                    <foreignObject
                      x={-seatSize + 35}
                      y={seatSize}
                      width={seatSize * 2}
                      height={50}
                    >
                      <div
                        style={{
                          backgroundColor: "rgba(31, 41, 55, 0.8)",
                          borderRadius: "9999px",
                          padding: "8px",
                          textAlign: "center",
                          opacity: inHand ? 1 : 0.5,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
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
                          {seat.player.chips.toLocaleString()}
                        </span>
                      </div>
                    </foreignObject>
                    {/* Last Action Overlay */}
                    {lastAction &&
                      (showCommunityCards || winners.length > 0) && (
                        <foreignObject
                          x={-seatSize + 35}
                          y={seatSize - 20}
                          width={seatSize * 2}
                          height={30}
                        >
                          <div
                            style={{
                              backgroundColor: getActionBackgroundColor(
                                lastAction.action,
                              ),
                              borderRadius: "20px",
                              padding: "4px 8px",
                              textAlign: "center",
                              opacity: inHand ? 1 : 0.5,
                              zIndex: 10,
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
                              {formatActionText(lastAction)}
                            </span>
                          </div>
                        </foreignObject>
                      )}
                    {isDealer && table.status === "playing" && (
                      <image
                        x={dealerXOffset}
                        y={seatSize + 30}
                        width={20}
                        height={20}
                        href="/poker/dealer.svg"
                        preserveAspectRatio="xMidYMid meet"
                      />
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
            const isCurrentUser =
              seat.occupied && seat.player?.user === currentUserId;

            if (
              seat.occupied &&
              seat.player &&
              seat.player.cards &&
              seat.player.cards.length > 0 &&
              !isDealing &&
              inHand
            ) {
              const isCardOpen =
                isAdmin ||
                isCurrentUser ||
                (showdownData !== undefined && winners.length > 0) ||
                (shouldRevealAllCards && inHand);
              const cardsToShow = showdownData
                ? showdownData.cards
                : seat.player.cards;

              const standardCardX = x < 512 ? x - 130 : x + seatSize - 30;
              const standardCardY = y - 30;
              const standardCardWidth = 50;
              const standardCardHeight = 65;
              const cardSpacing = 30;

              const smallCardWidth = 40;
              const smallCardHeight = 52;
              const smallCardX = x < 512 ? x - 130 : x + seatSize - 30;
              const smallCardY = y - 30;

              const overlayCardX = x - seatSize / 2;
              const overlayCardY = y - seatSize / 2;

              return cardsToShow.map((card, idx) => (
                <g key={`${seat.seatIndex}-card-${idx}`}>
                  <image
                    x={
                      isCurrentUser
                        ? standardCardX + idx * cardSpacing
                        : isCardOpen
                          ? overlayCardX + idx * 20
                          : smallCardX + idx * 20
                    }
                    y={
                      isCurrentUser
                        ? standardCardY
                        : isCardOpen
                          ? overlayCardY
                          : smallCardY + (idx === 1 ? 10 : 0)
                    }
                    width={
                      isCurrentUser || isCardOpen
                        ? standardCardWidth
                        : smallCardWidth
                    }
                    height={
                      isCurrentUser || isCardOpen
                        ? standardCardHeight
                        : smallCardHeight
                    }
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
      const communityCardsX = centerX - totalWidth / 2 - 50;
      const communityCardsY = centerY - cardHeight / 2 - 50;

      const adminCardWidth = 40;
      const adminCardHeight = 56;
      const adminTotalWidth =
        adminPreviewCards.length * adminCardWidth +
        (adminPreviewCards.length - 1) * 10;
      const adminCardsX = centerX - adminTotalWidth / 2 - 50;
      const adminCardsY = communityCardsY + cardHeight + 150;

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
            width={800 * scale}
            height={1600 * scale}
            viewBox="20 -130 800 1600"
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

            <svg>
              <path
                d="M420,1218c-215.4,0-384-147.3-384-328.35l0-1.05l35.4-609.9l0-0.9c0.45-66.6,32.55-119.7,103.65-172.5 C240.9,56.7,327.75,30,420,30c92.25,0,179.1,26.7,244.8,75.3c71.25,52.65,103.2,105.9,103.8,172.5l0,0.9L804,888.9l0,0.6 C804,1070.55,635.4,1218,420,1218z"
                fillRule="evenodd"
                clipRule="evenodd"
                fill="#b3a18a"
              />
              <radialGradient
                id="mobile-a"
                cx="415.9905"
                cy="632.979"
                r="504.5985"
                gradientTransform="matrix(1.0031 0 0 1.6437 2.7045 -416.4525)"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopOpacity="0" />
                <stop offset=".535" stopOpacity=".2" />
                <stop offset="1" stopOpacity=".6" />
              </radialGradient>
              <path
                d="M420,1218c-215.4,0-384-147.3-384-328.35l0-1.05l35.4-609.9l0-0.9c0.45-66.6,32.55-119.7,103.65-172.5 C240.9,56.7,327.75,30,420,30c92.25,0,179.1,26.7,244.8,75.3c71.25,52.65,103.2,105.9,103.8,172.5l0,0.9L804,888.9l0,0.6 C804,1070.55,635.4,1218,420,1218z"
                fillRule="evenodd"
                clipRule="evenodd"
                fill="url(#mobile-a)"
              />
              <radialGradient
                id="mobile-b"
                cx="415.9905"
                cy="626.379"
                r="640.2195"
                gradientTransform="matrix(1.0031 0 0 1.2379 2.7045 -157.92)"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopOpacity="0" />
                <stop offset=".535" stopOpacity=".2" />
                <stop offset="1" stopOpacity=".6" />
              </radialGradient>
              <path
                d="M420,1179c-95.7,0-184.8-31.35-250.95-88.2c-64.35-55.35-99.75-128.85-99.9-207.15L104.55,273l0-1.65 c0.45-56.25,27.45-100.05,90.45-146.7c60-44.4,139.8-68.7,224.85-68.7c85.05,0,164.85,24.45,224.85,68.7c63,46.5,90.15,90.45,90.6,146.7l0,1.95 l35.4,609.9c-0.15,78.3-35.55,151.95-99.9,207.3C604.8,1147.65,515.7,1179,420,1179z"
                fillRule="evenodd"
                clipRule="evenodd"
                fill="url(#mobile-b)"
              />
              <path
                d="M742.05,273l0-1.5c-0.45-58.5-28.35-103.95-93.15-151.95C587.7,74.4,506.4,49.5,420,49.5c-86.55,0-167.85,24.9-228.9,70.05 c-64.8,48-92.7,93.3-93.15,151.8l0,1.65L62.55,883.5c0.15,80.25,36.45,155.55,102.15,212.1c67.35,57.9,157.95,89.85,255.3,89.85 c97.35,0,187.95-31.95,255.3-89.85c65.85-56.7,102.15-132.15,102.15-212.4L742.05,273z M670.95,1090.65C604.8,1147.65,515.7,1179,420,1179 c-95.7,0-184.8-31.35-250.95-88.2c-64.35-55.35-99.75-128.85-99.9-207.15L104.55,273l0-1.65c0.45-56.25,27.45-100.05,90.45-146.7 c60-44.4,139.8-68.7,224.85-68.7c85.05,0,164.85,24.45,224.85,68.7c63,46.5,90.15,90.45,90.6,146.7l0,1.95l35.4,609.9 C770.85,961.65,735.45,1033.65,670.95,1090.65z"
                opacity=".1"
                fillRule="evenodd"
                clipRule="evenodd"
                fill="#fff"
              />
              {/* <foreignObject x="270" y="474" width="300" height="300">
                <Image
                  src={SiteLogo}
                  alt="Site Logo"
                  width={300}
                  height={300}
                  style={{ objectFit: "contain" }}
                />
              </foreignObject> */}
              <text
                x="420"
                y="800"
                textAnchor="middle"

                fontSize={"24"}
                fill="#BEBEBE"
                fontWeight="Bold"
              >
                {table.name} Stakes: {table.smallBlind}/{table.bigBlind}
              </text>
            </svg>
            <foreignObject x="350" y="300" width="150" height="150">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <div className="text-white font-bold text-2xl">
                  Пот: {pot.toLocaleString()}
                </div>
              </div>
            </foreignObject>

            {showCommunityCards && !isDealing && (
  <g>
    {winners.length > 0 && winners[0]?.handDescription && (
      <>
        <text
          x={communityCardsX + totalWidth / 2}
          y={communityCardsY - 40}
          textAnchor="middle"
          fill="#facc15"
          fontSize={fontSizeMultiplier * 14}
          fontWeight="bold"
        >
          {winners[0].handDescription}
        </text>
        <text
          x={communityCardsX + totalWidth / 2}
          y={communityCardsY - 20}
          textAnchor="middle"
          fill="#facc15"
          fontSize={fontSizeMultiplier * 12}
          fontWeight="bold"
        >
          Won: {winners.reduce((sum, w) => sum + w.chipsWon, 0).toFixed(2)}
        </text>
      </>
    )}
    {table.communityCards.map((card, index) => {
      const isWinningCard = winners.some((winner) => {
        const showdownData = showdownPlayers.find(
          (sp) => sp.playerId === winner.playerId
        );
        const winningCards = getWinningCards(
          winner.handDescription,
          showdownData ? showdownData.cards : [],
          table.communityCards
        );
        return winningCards.includes(card);
      });
      const gap = isMobile ? 40 : 10;
      return (
        <g key={`community-${index}`}>
          <image
            x={isMobile ? communityCardsX + index * (cardWidth + gap) - 120 : communityCardsX + index * (cardWidth + gap)}
            y={isMobile ? communityCardsY + 70 : communityCardsY}
            width={isMobile ? cardWidth + 60 : cardWidth * 1.5}
            height={isMobile ? cardHeight + 60 : cardHeight * 1.5}
            href={getCardImagePath(card)}
            preserveAspectRatio="xMidYMid meet"
            className={isWinningCard && winners.length > 0 ? "card-highlight" : ""}
            opacity={winners.length > 0 ? (isWinningCard ? 1 : 0.5) : 1}
          />
        </g>
      );
    })}
  </g>
)}
            {isAdmin &&
              adminPreviewCards.length > 0 &&
              table.round !== "showdown" &&
              table.round !== "river" && (
                <g>
                  {adminPreviewCards.map((card, index) => {
                    const gap = 50;
                    return (
                      <image
                        key={`admin-preview-${index}`}
                        x={adminCardsX + index * (adminCardWidth + gap) - 150}
                        y={adminCardsY + 30}
                        width={adminCardWidth + 80}
                        height={adminCardHeight + 80}
                        href={getCardImagePath(card)}
                        preserveAspectRatio="xMidYMid meet"
                        opacity={0.8}
                      />
                    );
                  })}
                </g>
              )}

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
                tableStatus === "playing" &&
                dealAnimationComplete;
              const inHand =
                seat.occupied && seat.player ? seat.player.inHand : true;
              const isDealer = seat.seatIndex === table?.dealerSeat;
              const isCurrentUser =
                seat.occupied && seat.player?.user === currentUserId;
              const dealerXOffset = isCurrentUser
                ? isSeatOnLeft(seat.seatIndex, cappedMaxPlayers)
                  ? -(seatSize + 10)
                  : seatSize + 20
                : seatSize + 10;

              return (
                <g
                  key={`seat-${seat.seatIndex}`}
                  className={`seat-${seat.seatIndex}`}
                  transform={`translate(${x - seatSize / 2}, ${y - seatSize / 2})`}
                >
                  {seat.occupied && seat.player  ?  (
                    <>
                      {isCurrentTurn && inHand && currentPlayer?.cards.length > 0 &&(
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
                      {isCurrentTurn && inHand && currentPlayer?.cards.length > 0 &&(
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
                      {/* Username and Chips Container */}
                      <g>
                        <rect
                          x={-seatSize + 45}
                          y={seatSize}
                          width={seatSize * 2}
                          height={60}
                          rx={30}
                          ry={30}
                          fill="rgba(31, 41, 55, 0.8)"
                          opacity={inHand ? 1 : 0.5}
                        />
                        <text
                          x={seatSize / 2}
                          y={seatSize + 25}
                          textAnchor="middle"
                          fill="#fff"
                          fontSize={fontSizeMultiplier * 12}
                          fontWeight="bold"
                        >
                          {seat.player.username}
                        </text>
                        <text
                          x={seatSize / 2}
                          y={seatSize + 45}
                          textAnchor="middle"
                          fill="#fff"
                          fontSize={fontSizeMultiplier * 10}
                        >
                          {seat.player.chips.toLocaleString()}
                        </text>
                      </g>
                      {/* Last Action Overlay */}
                      {lastAction &&
                        (showCommunityCards || winners.length > 0) && (
                          <g>
                            <rect
                              x={-seatSize + 80}
                              y={seatSize - 30}
                              width={seatSize * 1.5}
                              height={30}
                              rx={15}
                              ry={15}
                              fill={getActionBackgroundColor(lastAction.action)}
                              opacity={inHand ? 1 : 0.5}
                            />
                            <text
                              x={seatSize - 45}
                              y={seatSize - 5}
                              textAnchor="middle"
                              fill="#fff"
                              fontSize={fontSizeMultiplier * 12}
                              fontWeight="bold"
                            >
                              {formatActionText(lastAction)}
                            </text>
                          </g>
                        )}
                      {isDealer && table.status === "playing" && (
                        <image
                          x={dealerXOffset + 20}
                          y={seatSize + 40}
                          width={30}
                          height={30}
                          href="/poker/dealer.svg"
                          preserveAspectRatio="xMidYMid meet"
                        />
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
              const isCurrentUser =
                seat.occupied && seat.player?.user === currentUserId;

              if (
                seat.occupied &&
                seat.player &&
                seat.player.cards &&
                seat.player.cards.length > 0 &&
                !isDealing &&
                inHand
              ) {
                const isCardOpen =
                  isAdmin ||
                  isCurrentUser ||
                  (showdownData !== undefined && winners.length > 0) ||
                  (shouldRevealAllCards && inHand);
                const cardsToShow =
                  showdownData && showdownData.cards
                    ? showdownData.cards
                    : seat.player.cards;

                const standardCardX = x < 420 ? x + seatSize - 90 : x - 180;
                const standardCardY = y - 70;
                const standardCardWidth = 120;
                const standardCardHeight = 100;
                const cardSpacing = 60;

                const smallCardWidth = 80;
                const smallCardHeight = 65;
                const smallCardX = x < 420 ? x + seatSize - 80 : x - 100;
                const smallCardY = y - 70;

                const overlayCardX = x - seatSize / 2 - 25;
                const overlayCardY = y - seatSize / 2;

                return cardsToShow.map((card, idx) => (
                  <g key={`${seat.seatIndex}-card-${idx}`}>
                    <image
                      x={
                        isCurrentUser
                          ? standardCardX + idx * cardSpacing
                          : isCardOpen
                            ? overlayCardX + idx * 30
                            : smallCardX + idx * 20
                      }
                      y={
                        isCurrentUser
                          ? standardCardY
                          : isCardOpen
                            ? overlayCardY
                            : smallCardY + (idx === 1 ? 10 : 0)
                      }
                      width={
                        isCurrentUser || isCardOpen
                          ? standardCardWidth
                          : smallCardWidth
                      }
                      height={
                        isCurrentUser || isCardOpen
                          ? standardCardHeight
                          : smallCardHeight
                      }
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
