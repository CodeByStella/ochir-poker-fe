import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import { AvatarLogo } from "@/components/icons/avatar";
import { IPlayer } from "@/models/player";
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
}

interface PlayerAction {
  playerId: string;
  action: string;
  amount?: number;
  timestamp: Date;
}

const throttle = (func: (...args: any[]) => void, limit: number) => {
  let inThrottle: boolean;
  return (...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const PokerTableSVG = memo(({
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
}: PokerTableSVGProps) => {
  const [isMobile, setIsMobile] = useState(false);

  const updateDeviceType = useCallback(() => {
    const mobileBreakpoint = 768;
    setIsMobile(window.innerWidth < mobileBreakpoint);
  }, []); 

  useEffect(() => {
    updateDeviceType();

    const handleResize = throttle(updateDeviceType, 200);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [updateDeviceType]); 

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
    const centerX = isMobile ? 420 : 512;
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

  const displayPositions: Array<{ seatIndex: number; occupied: boolean; player: IPlayer | null }> = Array.from(
    { length: cappedMaxPlayers },
    (_, index) => ({
      seatIndex: index,
      occupied: false,
      player: null,
    })
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

  const memoImage = useCallback((avatar?: string) =>  <AvatarLogo width={seatSize} height={seatSize}/>,[seatSize])

  const DesktopSVG = () => {
    const chipStack = getChipStack(pot);
    return (
      <svg
        width="100vw"
        height="100vh"
        viewBox="-122 -64 1228 700"
        preserveAspectRatio="xMidYMin meet"
        className="max-w-full max-h-full"
      >
        {/* Define animations */}
        <style>
          {`
            .winner-highlight {
              animation: pulse 1.5s infinite ease-in-out;
            }
            .winner-text {
              animation: fadeInUp 0.5s ease-out;
            }
            @keyframes pulse {
              0% { stroke-opacity: 0.3; r: ${seatSize / 2}; }
              50% { stroke-opacity: 0.8; r: ${seatSize / 2 + 10}; }
              100% { stroke-opacity: 0.3; r: ${seatSize / 2}; }
            }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>

        {/* Table Background */}
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

        {/* Chip Stack in the Center */}
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
                style={{ marginTop: index === 0 ? 0 : -15, zIndex: chipStack.length - index }}
              />
            ))}
          </div>
        </foreignObject>
        <text x="512" y="300" textAnchor="middle" fill="#fff" fontSize="16" fontFamily="bold">
          Пот: {pot.toFixed(2)}
        </text>

        {/* Player Seats */}
        {displayPositions.map((seat) => {
          const { x, y } = getSeatPosition(seat.seatIndex, cappedMaxPlayers);
          const isWinner = seat.occupied && winners.some((w) => w.playerId === seat.player?._id.toString());
          const winnerData = isWinner ? winners.find((w) => w.playerId === seat.player?._id.toString()) : null;
          const lastAction = seat.occupied && seat.player ? lastActions?.get(seat.player._id.toString()) : null;

          return (
            <g key={`seat-${seat.seatIndex}`} className={`seat-${seat.seatIndex}`} transform={`translate(${x - seatSize / 2}, ${y - seatSize / 2})`}>
              {seat.occupied && seat.player ? (
                <>
                  {/* Winner Highlight Circle */}
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

                  {/* Winner Hand Description */}
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
                        {winnerData.handDescription} (+{formatBetAmount(winnerData.chipsWon)})
                      </text>
                    </g>
                  )}

                  <foreignObject x={0} y={0} width={seatSize} height={seatSize}>
                    <div
                      style={{
                        width: `${seatSize}px`,
                        height: `${seatSize}px`,
                        borderRadius: "50%",
                        overflow: "hidden",
                      }}
                    >
                      {memoImage()}
                    </div>
                  </foreignObject>

                  {/* Last Action Display */}
                  {lastAction && (
                    <g transform={`translate(0, ${seatSize})`}>
                      <rect
                        x={-seatSize + 80}
                        y={0}
                        width={seatSize}
                        height={20}
                        rx={5}
                        fill="#1f2937"
                        opacity="0.9"
                      />
                      <text
                        x={-seatSize + 115}
                        y={15}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={fontSizeMultiplier * 12}
                        fontWeight="bold"
                      >
                        {formatActionText(lastAction)}
                      </text>
                    </g>
                  )}

                  {/* Username and Chips */}
                  <foreignObject x={-seatSize + 40} y={seatSize + 20} width={seatSize * 2} height={50}>
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
                    <foreignObject x={-seatSize - 10} y={seatSize - 8} width={seatSize} height={80}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {getChipStack(seat.player.currentBet).map((chip, chipIndex) => (
                          <Image
                            key={chipIndex}
                            src={chip.src}
                            alt={`Chip ${chipIndex}`}
                            width={25}
                            height={25}
                            style={{
                              marginTop: chipIndex === 0 ? 0 : -10,
                              zIndex: getChipStack(seat.player!.currentBet).length - chipIndex,
                            }}
                          />
                        ))}
                        <span
                          style={{
                            color: "#fff",
                            fontWeight: "bold",
                            marginTop: "4px",
                            fontSize: `${fontSizeMultiplier * 12}px`,
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
                    className={isUserSeated ? "" : "cursor-pointer hover:fill-gray-600"}
                    onClick={() => !isUserSeated && onSeatClick(seat.seatIndex)}
                  />
                  <text
                    x={seatSize / 2}
                    y={seatSize / 2 + 5}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={fontSizeMultiplier * 14}
                  >
                    СУУХ
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Render Cards as Top-Level Elements */}
        {displayPositions.map((seat) => {
          const { x, y } = getSeatPosition(seat.seatIndex, cappedMaxPlayers);
          const showdownData = seat.occupied && showdownPlayers.find((sp) => sp.playerId === seat.player?._id.toString());
          if (
            seat.occupied &&
            seat.player &&
            tableStatus === "playing" &&
            seat.player.cards &&
            seat.player.cards.length > 0 &&
            !isDealing
          ) {
            const cardX = x < 512 ? x - 130 : x + seatSize - 30;
            const cardY = y - 30;
            const isCardOpen = isAdmin || seat.player?.user === currentUserId || (showdownData !== undefined && winners.length > 0);

            return (typeof showdownData === "object" && showdownData.cards ? showdownData.cards : seat.player.cards).map((card, idx) => (
              <g key={`${seat.seatIndex}-card-${idx}`}>
                <image
                  x={cardX + idx * 45}
                  y={cardY}
                  width={40}
                  height={56}
                  href={isCardOpen ? getCardImagePath(card) : "/card.png"}
                  preserveAspectRatio="xMidYMid meet"
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

    return (
      <svg width={840 * scale} height={1272 * scale} viewBox="-120 -130 1080 1560" className="max-w-full max-h-full">
        {/* Define animations */}
        <style>
          {`
            .winner-highlight {
              animation: pulse 1.5s infinite ease-in-out;
            }
            .winner-text {
              animation: fadeInUp 0.5s ease-out;
            }
            @keyframes pulse {
              0% { stroke-opacity: 0.3; r: ${seatSize / 2}; }
              50% { stroke-opacity: 0.8; r: ${seatSize / 2 + 10}; }
              100% { stroke-opacity: 0.3; r: ${seatSize / 2}; }
            }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>

        {/* Table Background */}
        <path
          d="M420,1218c-215.4,0-384-147.3-384-328.35l0-1.05l35.4-609.9l0-0.9c0.45-66.6,32.55-119.7,103.65-172.5	C240.9,56.7,327.75,30,420,30c92.25,0,179.1,26.7,244.8,75.3c71.25,52.65,103.2,105.9,103.8,172.5l0,0.9L804,888.9l0,0.6	C804,1070.55,635.4,1218,420,1218z"
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
          d="M420,1218c-215.4,0-384-147.3-384-328.35l0-1.05l35.4-609.9l0-0.9c0.45-66.6,32.55-119.7,103.65-172.5	C240.9,56.7,327.75,30,420,30c92.25,0,179.1,26.7,244.8,75.3c71.25,52.65,103.2,105.9,103.8,172.5l0,0.9L804,888.9l0,0.6	C804,1070.55,635.4,1218,420,1218z"
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
          d="M420,1179c-95.7,0-184.8-31.35-250.95-88.2c-64.35-55.35-99.75-128.85-99.9-207.15L104.55,273l0-1.65	c0.45-56.25,27.45-100.05,90.45-146.7c60-44.4,139.8-68.7,224.85-68.7c85.05,0,164.85,24.45,224.85,68.7c63,46.5,90.15,90.45,90.6,146.7l0,1.95	l35.4,609.9c-0.15,78.3-35.55,151.95-99.9,207.3C604.8,1147.65,515.7,1179,420,1179z"
          fillRule="evenodd"
          clipRule="evenodd"
          fill="url(#mobile-b)"
        />
        <path
          d="M742.05,273l0-1.5c-0.45-58.5-28.35-103.95-93.15-151.95C587.7,74.4,506.4,49.5,420,49.5c-86.55,0-167.85,24.9-228.9,70.05	c-64.8,48-92.7,93.3-93.15,151.8l0,1.65L62.55,883.5c0.15,80.25,36.45,155.55,102.15,212.1c67.35,57.9,157.95,89.85,255.3,89.85	c97.35,0,187.95-31.95,255.3-89.85c65.85-56.7,102.15-132.15,102.15-212.4L742.05,273z M670.95,1090.65C604.8,1147.65,515.7,1179,420,1179	c-95.7,0-184.8-31.35-250.95-88.2c-64.35-55.35-99.75-128.85-99.9-207.15L104.55,273l0-1.65c0.45-56.25,27.45-100.05,90.45-146.7	c60-44.4,139.8-68.7,224.85-68.7c85.05,0,164.85,24.45,224.85,68.7c63,46.5,90.15,90.45,90.6,146.7l0,1.95l35.4,609.9	C770.85,961.65,735.45,1033.65,670.95,1090.65z"
          opacity=".1"
          fillRule="evenodd"
          clipRule="evenodd"
          fill="#fff"
        />
        <foreignObject x="363" y="300" width="150" height="150">
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
                style={{ marginTop: index === 0 ? 0 : -45 * scale, zIndex: chipStack.length - index }}
              />
            ))}
          </div>
        </foreignObject>
        <text x="424.5" y="495" textAnchor="middle" fill="#fff" fontFamily="bold" fontSize="36">
          Пот: {pot.toFixed(2)}
        </text>

        {/* Player Seats */}
        {displayPositions.map((seat) => {
          const { x, y } = getSeatPosition(seat.seatIndex, cappedMaxPlayers);
          const isWinner = seat.occupied && winners.some((w) => w.playerId === seat.player?._id.toString());
          const winnerData = isWinner ? winners.find((w) => w.playerId === seat.player?._id.toString()) : null;
          const lastAction = seat.occupied && seat.player ? lastActions?.get(seat.player._id.toString()) : null;

          return (
            <g key={`seat-${seat.seatIndex}`} className={`seat-${seat.seatIndex}`} transform={`translate(${x - seatSize / 2}, ${y - seatSize / 2})`}>
              {seat.occupied && seat.player ? (
                <>
                  {/* Winner Highlight Circle */}
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

                  {/* Winner Hand Description */}
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
                        {winnerData.handDescription} (+{formatBetAmount(winnerData.chipsWon)})
                      </text>
                    </g>
                  )}

                  <foreignObject x={0} y={0} width={seatSize} height={seatSize}>
                    <div
                      style={{
                        width: `${seatSize}px`,
                        height: `${seatSize}px`,
                        borderRadius: "50%",
                        overflow: "hidden",
                      }}
                    >
                   {memoImage()}
                    </div>
                  </foreignObject>

                  {/* Last Action Display */}
                  {lastAction && (
                    <g transform={`translate(0, ${seatSize})`}>
                      <rect
                        x={-seatSize + 80}
                        y={0}
                        width={seatSize}
                        height={20}
                        rx={5}
                        fill="#1f2937"
                        opacity="0.9"
                      />
                      <text
                        x={-seatSize +130}
                        y={15}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={fontSizeMultiplier * 12}
                        fontWeight="bold"
                      >
                        {formatActionText(lastAction)}
                      </text>
                    </g>
                  )}
                  

                  {/* Username and Chips */}
                  <foreignObject x={-seatSize + 40} y={seatSize + 20} width={seatSize * 2} height={60}>
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
                      <span style={{ display: "block", fontSize: `${fontSizeMultiplier * 10}px` }}>
                        {seat.player.chips.toFixed(2)}
                      </span>
                    </div>
                  </foreignObject>

                  {seat.player.currentBet > 0 && (
                    <foreignObject x={-seatSize - 10} y={seatSize - 10} width={seatSize} height={60}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {getChipStack(seat.player.currentBet).map((chip, chipIndex) => (
                          <Image
                            key={chipIndex}
                            src={chip.src}
                            alt={`Chip ${chipIndex}`}
                            width={40 * scale}
                            height={40 * scale}
                            style={{
                              marginTop: chipIndex === 0 ? 0 : -15 * scale,
                              zIndex: getChipStack(seat.player!.currentBet).length - chipIndex,
                            }}
                          />
                        ))}
                        <span
                          style={{
                            color: "#fff",
                            fontWeight: "bold",
                            marginTop: "4px",
                            fontSize: `${fontSizeMultiplier * 12}px`,
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
                    className={isUserSeated ? "" : "cursor-pointer hover:fill-gray-600"}
                    onClick={() => !isUserSeated && onSeatClick(seat.seatIndex)}
                  />
                  <text
                    x={seatSize / 2}
                    y={seatSize / 2 + 5}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={fontSizeMultiplier * 14}
                  >
                    СУУХ
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Render Cards as Top-Level Elements */}
        {displayPositions.map((seat) => {
          const { x, y } = getSeatPosition(seat.seatIndex, cappedMaxPlayers);
          const showdownData = seat.occupied && showdownPlayers.find((sp) => sp.playerId === seat.player?._id.toString());
          if (
            seat.occupied &&
            seat.player &&
            tableStatus === "playing" &&
            seat.player.cards &&
            seat.player.cards.length > 0 &&
            !isDealing
          ) {
            const cardX = x < 420 ? x - 190 : x + seatSize - 60;
            const cardY = y - 70;
            const isCardOpen = isAdmin || seat.player?.user === currentUserId || (showdownData !== undefined && winners.length > 0);

            return (typeof showdownData === "object" && showdownData.cards ? showdownData.cards : seat.player.cards).map((card, idx) => (
              <g key={`${seat.seatIndex}-card-${idx}`}>
                <image
                  x={cardX + idx * 70}
                  y={cardY}
                  width={60}
                  height={80}
                  href={isCardOpen ? getCardImagePath(card) : "/card.png"}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            ));
          }
          return null;
        })}
      </svg>
    );
  };

  return isMobile ? <MobileSVG /> : <DesktopSVG />;
});

PokerTableSVG.displayName="displayName"