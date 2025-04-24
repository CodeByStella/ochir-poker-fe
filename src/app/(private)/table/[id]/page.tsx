"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import useSWRSubscription from "swr/subscription";
import { authApi } from "@/apis";
import { message as toastMessage } from "@/utils/toast";
import background from "../../../../../public/asset/back.jpg";
import cardBack from "../../../../../public/card.png";
import { PokerTableSVG } from "./PokerTableSVG";
import cardStyles from "../../../../components/card/Card.module.css";
import LoginModal from "@/components/modal/Login";
import { Header } from "@/components/header";
import Waitinglist from "@/components/PokerTable/WaitingList";
import SeatInstruction from "@/components/PokerTable/SeatInstruction";
import SeatModal from "@/components/PokerTable/SeatModal";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { IUser } from "@/models/user";
import ButtonNav from "@/components/PokerTable/ButtonNav";
import { ITable } from "@/models/table";
import gsap from "gsap";
import ChatComponent from "@/components/PokerTable/ChatSection";
import Image from "next/image";
import { formatNumber } from "@/utils/format-number";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { ALL_IN_SHOWDOWN_DELAY, IDealCardsData, IFlipCommunityCardData, IChipAdded, IChipAnimate, IHandResult, IMessage, IPlayerAction, IPotToWinnerData, WINNER_DISPLAY_DURATION, IWinnerData, ICollectChip, IAnimationQueueItem, IContribution, CHIP_ANIMATION_DURATION, SHUFFLE_DURATION } from "@/models/poker";

export default function PokerTable() {
  const { id } = useParams();
  const tableId = id as string;
  const [screenWidth, setScreenWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [table, setTable] = useState<ITable | null>(null);
  const [raiseAmount, setRaiseAmount] = useState<number>(0);
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [dealAnimationComplete, setDealAnimationComplete] = useState<boolean>(true);
  const [winners, setWinners] = useState<IWinnerData[]>([]);
  const [showCommunityCards, setShowCommunityCards] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [chipAmount, setChipAmount] = useState<number>(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const animationContainerRef = useRef<HTMLDivElement>(null);
  const animatedElementsRef = useRef<HTMLElement[]>([]);
  const gsapAnimationsRef = useRef<any[]>([]);
  const [lastActions, setLastActions] = useState<Map<string, IPlayerAction>>(new Map());
  const [adminPreviewCards, setAdminPreviewCards] = useState<string[]>([]);
  const [showdownPlayers, setShowdownPlayers] = useState<{ playerId: string; cards: string[] }[]>([]);
  const [isRaiseOpen, setIsRaiseOpen] = useState<boolean>(false);
  const [isFlippingCommunityCards, setIsFlippingCommunityCards] = useState<boolean>(false);
  const [flipAnimationComplete, setFlipAnimationComplete] = useState<boolean>(true);
  const [pendingWinners, setPendingWinners] = useState<IWinnerData[]>([]);
  const [pendingShowdownPlayers, setPendingShowdownPlayers] = useState<
    { playerId: string; cards: string[] }[]
  >([]);
  const [chipAnimations, setChipAnimations] = useState<
  {
    action: string;
    playerId: string;
    seat: number;
    amount: number;
    key: string;
    round: string;
    isCollect?: boolean;
    isPotToWinner?: boolean;
    timestamp: string;
    x?: number;
    y?: number;
    chipCount?: number;
  }[]
>([]);
  const [mergedChips, setMergedChips] = useState<
    { amount: number; key: string; round: string }[]
  >([]);
  const animatedKeysRef = useRef<Set<string>>(new Set());
  const [animationTimestamps, setAnimationTimestamps] = useState<Map<string, string>>(new Map());
  const [isCollectChipsComplete, setIsCollectChipsComplete] = useState<boolean>(true);
  const [messages, setMessages] = useState<{ table: IMessage[]; lobby: IMessage[] }>({
    table: [],
    lobby: [],
  });
  const flippedCardIndicesRef = useRef<Set<number>>(new Set());
  const animationQueueRef = useRef<IAnimationQueueItem[]>([]);
  const isProcessingAnimationRef = useRef<boolean>(false);

  const isMobile = screenWidth < 768;
  const tableWidth = isMobile ? 600 : "80%";
  const tableHeight = isMobile ? 900 : "80%";
  const scale = Math.min(
    screenWidth / (isMobile ? 700 : 1000),
    screenHeight / (isMobile ? 1000 : 600)
  );
  const { token } = useSelector((state: RootState) => state.auth);

  const { data: currentUser, mutate } = useSWR<IUser>(`swr.auth.me.${token}`, async () => {
    const res = await authApi.me();
    return res;
  });
  const isAdmin = currentUser?.role === "admin";

  const shuffleSound = useMemo(() => new Audio("/mp3/shuffle.mp3"), []);
  const foldSound = useMemo(() => new Audio("/mp3/fold.mp3"), []);
  const potSound = useMemo(() => new Audio("/mp3/pot.mp3"), []);
  const chipSound = useMemo(() => new Audio("/mp3/chip.mp3"), []);
  const flipSound = useMemo(() => new Audio("/mp3/flip.mp3"), []);
  const checkSound = useMemo(() => new Audio("/mp3/check.mp3"), []);
  const callSound = useMemo(() => new Audio("/mp3/call.mp3"), []);
  const raiseSound = useMemo(() => new Audio("/mp3/raise.mp3"), []);

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

  const isAllIn = useMemo(() => {
    if (!table || table.status !== "playing") return false;
    const activePlayers = table.players.filter((p) => p.inHand);
    return (
      activePlayers.length > 1 &&
      activePlayers.every((p) => p.currentBet >= p.chips && p.chips > 0)
    );
  }, [table]);

  const safeRemoveChild = useCallback((parent: HTMLElement, child: HTMLElement) => {
    try {
      if (child.parentNode === parent) {
        parent.removeChild(child);
      }
    } catch (err) {
      // console.error("Error removing child:", err);
    }
  }, []);

  const cleanupAnimations = useCallback(() => {
    gsapAnimationsRef.current = gsapAnimationsRef.current.filter((tween) => {
      if (!tween.isActive()) {
        tween.kill();
        return false;
      }
      return true;
    });
  
    animatedElementsRef.current = animatedElementsRef.current.filter((el) => {
      const isChip = el.style.background?.includes("chip.svg") || el.dataset.key?.includes("chip");
      const isActiveChip = chipAnimations.some(
        (anim) => anim.key === el.dataset.key
      );
      const isTweenActive = gsapAnimationsRef.current.some((tween) =>
        tween.targets().includes(el)
      );
      if (isChip && (isActiveChip || isTweenActive)) {
        return true;
      }
      safeRemoveChild(animationContainerRef.current!, el);
      return false;
    });
  
    setIsAnimating(chipAnimations.length > 0);
  }, [safeRemoveChild, chipAnimations]);

  const animateDealCards = useCallback(
    (
      players: {
        user: string;
        seat: number;
        cards: [string, string];
        chips: number;
        username: string;
      }[],
      maxPlayers: number
    ) => {
      const container = animationContainerRef.current;
      if (!container || !players?.length || !maxPlayers) {
        setIsDealing(false);
        return;
      }

      cleanupAnimations();
      setIsAnimating(true);
      const dealStep = 100;
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
          card.innerHTML = `<img src="${cardBack.src}" alt="Card Back" style="width: ${
            isMobile ? 40 : 60
          }px; height: ${isMobile ? 56 : 84}px;" />`;
          container.appendChild(card);
          animatedElementsRef.current.push(card);
          totalTime += dealStep;

          setTimeout(() => {
            flipSound.play().catch((err) => console.error("Error playing flip sound:", err));
          }, totalTime - dealStep);
        });
      });

      const totalDuration = players.length * 2 * dealStep + 300;
      setTimeout(() => {
        cleanupAnimations();
        setIsDealing(false);
        setDealAnimationComplete(true);
        processAnimationQueue();
      }, totalDuration);
    },
    [flipSound, isMobile, cleanupAnimations]
  );

  const animateCommunityCardFlip = useCallback(
    (
      card: string,
      cardIndex: number,
      round: string,
      callback?: () => void,
      winnerCallback?: (
        winners: IWinnerData[],
        showdownPlayers: { playerId: string; cards: string[] }[]
      ) => void
    ) => {
      const container = animationContainerRef.current;
      if (!container) {
        console.warn("Animation container not found");
        setIsAnimating(false);
        setIsFlippingCommunityCards(false);
        setFlipAnimationComplete(true);
        callback?.();
        return;
      }
  
  
      cleanupAnimations();
      setIsAnimating(true);
  
      const cardWidth = isMobile ? 60 : 80;
      const cardHeight = isMobile ? 84 : 112;
      const gap = isMobile ? 10 : 15;
      const totalCards = round === "flop" ? 3 : round === "turn" ? 4 : 5;
      const totalWidth = totalCards * cardWidth + (totalCards - 1) * gap;
  
      const svgCenterX = isMobile ? 400 : 614;
      const svgCenterY = isMobile ? 800 : 350;
      const svgCommunityCardsX = svgCenterX - totalWidth / 2;
      const svgCommunityCardsY = svgCenterY - (isMobile ? 50 : 30);
  
      const svgTargetX = svgCommunityCardsX + cardIndex * (cardWidth + gap);
      const svgTargetY = svgCommunityCardsY;
  
      const containerRect = container.getBoundingClientRect();
      const svgElement = document.querySelector("svg");
      const svgRect = svgElement?.getBoundingClientRect();
      if (!svgRect) {
        console.warn("SVG not found, skipping animation");
        setIsAnimating(false);
        setIsFlippingCommunityCards(false);
        setFlipAnimationComplete(true);
        callback?.();
        return;
      }
  
      const viewBoxWidth = isMobile ? 800 : 1228;
      const viewBoxHeight = isMobile ? 1600 : 700;
      const scaleX = svgRect.width / viewBoxWidth;
      const scaleY = svgRect.height / viewBoxHeight;
  
      const pixelTargetX = svgTargetX * scaleX + svgRect.left - containerRect.left;
      const pixelTargetY = svgTargetY * scaleY + svgRect.top - containerRect.top;
  
      const cardElement = document.createElement("div");
      cardElement.className = `${cardStyles.card} ${cardStyles.flip}`;
      cardElement.style.position = "absolute";
      cardElement.style.width = `${cardWidth * scaleX}px`;
      cardElement.style.height = `${cardHeight * scaleY}px`;
      cardElement.style.zIndex = "100";
      cardElement.innerHTML = `<img src="${cardBack.src}" alt="Card Back" style="width: 100%; height: 100%;" />`;
      container.appendChild(cardElement);
      animatedElementsRef.current.push(cardElement);

      const tween = gsap.fromTo(
        cardElement,
        {
          opacity: 0,
          x: containerRect.width / 2,
          y: containerRect.height / 2,
          rotationY: 90,
          scale: 0.5,
        },
        {
          opacity: 1,
          x: pixelTargetX,
          y: pixelTargetY,
          rotationY: 0,
          scale: 1,
          duration: 0.6,
          ease: "power2.out",

          onStart: () => {
            flipSound.play().catch((err) => console.error("Error playing flip sound:", err));
          },
          onUpdate: function () {
            if (this.progress() >=  0.3 ) {
              const frontImagePath = getCardImagePath(card) || "/card.png";
              cardElement.innerHTML = `<img src="${frontImagePath}" alt="Card" style="width: 100%; height: 100%;" />`;
            }
          },
          onComplete: () => {
            cleanupAnimations();
            setIsAnimating(false);
            setIsFlippingCommunityCards(false);
            setFlipAnimationComplete(true);
            callback?.();
  
            if (isAllIn && round === "showdown" && winnerCallback && pendingWinners.length > 0) {
              setTimeout(() => {
                winnerCallback(pendingWinners, pendingShowdownPlayers);
              }, ALL_IN_SHOWDOWN_DELAY);
            }
  
            processAnimationQueue();
          },
        }
      );
      gsapAnimationsRef.current.push(tween);
    },
    [flipSound, isMobile, table, isAllIn, pendingWinners, pendingShowdownPlayers, cleanupAnimations]
  );

  const getChipSvg = (index: number, amount: number) => {
    const chipSvgs = ["/poker/chip1.svg", "/poker/chip2.svg", "/poker/chip3.svg", "/poker/chip4.svg", "/poker/chip5.svg", "/poker/chip6.svg", "/poker/chip.svg"];
    const chipIndex = index % chipSvgs.length;
    return chipSvgs[chipIndex];
  };
  const animatePlayerActionChip = useCallback(
    (
      seat: number,
      amount: number,
      key: string,
      round: string,
      timestamp: string,
      isCollect: boolean = false,
      isPotToWinner: boolean = false,
      playerId: string
    ) => {
      const container = animationContainerRef.current;
      if (!container || !table || animatedKeysRef.current.has(key)) {
        console.warn(
          `Skipping chip animation: container=${!!container}, table=${!!table}, keyExists=${animatedKeysRef.current.has(key)}`
        );
        return;
      }
  
      const seatElement = document.querySelector(`.seat-${seat}`);
      if (!seatElement) {
        console.warn(`Seat element not found for seat ${seat}, playerId ${playerId}`);
        animatedKeysRef.current.delete(key);
        setAnimationTimestamps((prev) => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
        setIsAnimating(false);
        return;
      }
  
      animatedKeysRef.current.add(key);
      setAnimationTimestamps((prev) => new Map(prev).set(key, timestamp));
      setIsAnimating(true);
  
      const rect = seatElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
  
      let startX: number, startY: number, targetX: number, targetY: number;
      const tableCenterX = containerRect.width / 2;
      const tableCenterY = containerRect.height / 2;
  
      if (isPotToWinner) {
        startX = tableCenterX + (Math.random() - 0.5) * 20;
        startY = tableCenterY + (Math.random() - 0.5) * 20;
        targetX = rect.left - containerRect.left + (isMobile ? 20 : 30);
        targetY = rect.top - containerRect.top + (isMobile ? 20 : 30);
      } else if (isCollect) {
        startX = rect.left - containerRect.left;
        startY = rect.top - containerRect.top;
        targetX = tableCenterX;
        targetY = tableCenterY + (isMobile ? 100 : 150);
      } else {
        startX = rect.left - containerRect.left;
        startY = rect.top - containerRect.top;
  
        const seatCenterX = rect.left - containerRect.left + rect.width / 2;
        const seatCenterY = rect.top - containerRect.top + rect.height / 2;
  
        const dx = seatCenterX - tableCenterX;
        const dy = seatCenterY - tableCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
  
        const offsetDistance = isMobile ? 80 : 90;
        const scaleFactor = offsetDistance / distance;
        targetX = seatCenterX - dx * scaleFactor;
        targetY = seatCenterY - dy * scaleFactor;
      }
  
      // Calculate number of chips to stack (same as renderMergedChips)
      const chipUnit = 10000; // Match renderMergedChips
      const chipCount = Math.min(Math.ceil(amount / chipUnit), 4); // Cap at 4 chips
  
      // Create a container for the chip stack
      const chipStackContainer = document.createElement("div");
      chipStackContainer.dataset.key = key;
      chipStackContainer.style.position = "absolute";
      chipStackContainer.style.zIndex = isPotToWinner ? "400" : "300";
      chipStackContainer.style.display = "flex";
      chipStackContainer.style.flexDirection = "column";
      chipStackContainer.style.alignItems = "center";
      chipStackContainer.style.transform = "translate(-50%, -50%)";
      container.appendChild(chipStackContainer);
      animatedElementsRef.current.push(chipStackContainer);
      
  
      // Create individual chip elements
      const chipElements: HTMLElement[] = [];
      const chipHeight = isMobile ? 15 : 20; // Match chip height for offset calculation
      const verticalOffset = isMobile ? -5 : -5; // Reduced vertical offset for a more compact stack
  
      for (let i = 0; i < chipCount; i++) {
        const chipContainer = document.createElement("div");
        chipContainer.style.position = "absolute";
        chipContainer.style.display = "flex";
        chipContainer.style.alignItems = "center";
  
        const chip = document.createElement("div");
        chip.style.width = isMobile ? "15px" : "20px"; // Match renderMergedChips
        chip.style.height = `${chipHeight}px`; // Match renderMergedChips
        chip.style.background = `url('${getChipSvg(i, amount)}') no-repeat center / cover`; // Ensure varied colors
        chip.style.borderRadius = "50%";
        chip.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.3)"; // Match original shadow
  
        // Apply vertical offset for stacking
        chipContainer.style.transform = `translate(0px, ${i * verticalOffset}px)`;
        chipContainer.style.zIndex = `${300 + i}`; // Increment z-index to ensure top chip is visible
  
        chipContainer.appendChild(chip);
        chipStackContainer.appendChild(chipContainer);
        chipElements.push(chipContainer);
      }
  
      // Add amount text next to the stack
      const amountText = document.createElement("span");
      amountText.className = `text-white ${isMobile ? "text-xs" : "text-sm"} font-bold`;
      amountText.style.textShadow = "0 1px 2px rgba(0, 0, 0, 0.5)";
      amountText.textContent = `${formatNumber(amount)}`; // Ensure formatNumber matches "38k" style
      amountText.style.position = "absolute";
      amountText.style.left = isMobile ? "20px" : "25px"; // Adjusted spacing to the right of the stack
      amountText.style.top = `${(chipCount - 1) * verticalOffset / 2}px`; // Vertically center relative to stack
      amountText.style.zIndex = "350"; // Ensure text is above chips
      chipStackContainer.appendChild(amountText);
  
      // Animate the entire chip stack
      const tween = gsap.fromTo(
        chipStackContainer,
        {
          x: startX,
          y: startY,
          scale: 0.5,
          opacity: 0,
        },
        {
          x: targetX,
          y: targetY,
          scale: isCollect || isPotToWinner ? 1 : 1,
          opacity: isCollect || isPotToWinner ? 1 : 1,
          duration: isCollect ? 1.5 : isPotToWinner ? 1.3 : 0.6,
          ease: "power2.out",
          delay: isCollect ? seat * 0.1 : isPotToWinner ? 0.2 * seat : 0,
          onStart: () => {
            chipSound.play().catch((err) => console.error("Error playing chip sound:", err));
          },
          onComplete: () => {
            if (isCollect || isPotToWinner) {
              setChipAnimations((prev) => {
                const newAnimations = prev.filter((anim) => anim.key !== key);
                if (isCollect && newAnimations.every((anim) => !anim.isCollect)) {
                  setIsCollectChipsComplete(true);
                }
                return newAnimations;
              });
              animatedKeysRef.current.delete(key);
              setAnimationTimestamps((prev) => {
                const newMap = new Map(prev);
                newMap.delete(key);
                return newMap;
              });
              safeRemoveChild(container, chipStackContainer);
              animatedElementsRef.current = animatedElementsRef.current.filter(
                (el) => el !== chipStackContainer
              );
              if (isCollect) {
                setMergedChips((prev) => [
                  ...prev,
                  { amount, key: `merged-${Date.now()}-${round}`, round },
                ]);
              }
            } else {
              setChipAnimations((prev) => {
                const newAnimations = prev.map((anim) =>
                  anim.key === key ? { ...anim, x: targetX, y: targetY, chipCount } : anim
                );
                return newAnimations;
              });
              chipStackContainer.style.transform = `translate(${targetX}px, ${targetY}px) scale0`;
              chipStackContainer.style.opacity = "0.9";
              chipStackContainer.style.zIndex = "300";
            }
          
            gsapAnimationsRef.current = gsapAnimationsRef.current.filter((t) => t !== tween);
            setIsAnimating(chipAnimations.length > 0);
            processAnimationQueue();
          },
        }
      );
      gsapAnimationsRef.current.push(tween);
    },
    [isMobile, table, chipSound, safeRemoveChild]
  );

  const processAnimationQueue = useCallback(() => {
    if (
      isProcessingAnimationRef.current ||
      animationQueueRef.current.length === 0
    ) {
      return;
    }
  
    const nextItem = animationQueueRef.current[0];
    if (!dealAnimationComplete && nextItem.type !== "chipAction") {
      return;
    }
  
    isProcessingAnimationRef.current = true;
    const item = animationQueueRef.current.shift()!;
  
    if (item.type === "cardFlip") {
      const data = item.data as IFlipCommunityCardData;
      if (flippedCardIndicesRef.current.has(data.cardIndex)) {
        console.warn(`Card index ${data.cardIndex} already flipped, skipping`);
        isProcessingAnimationRef.current = false;
        item.callback?.();
        processAnimationQueue();
        return;
      }
  
      setIsFlippingCommunityCards(true);
      setFlipAnimationComplete(false);
  
      const winnerCallback = (
        winners: IWinnerData[],
        showdownPlayers: { playerId: string; cards: string[] }[]
      ) => {
        setWinners(winners);
        setShowdownPlayers(showdownPlayers);
      };
  
      animateCommunityCardFlip(
        data.card,
        data.cardIndex,
        data.round,
        () => {
          setTable((prev: any) => {
            if (!prev) return prev;
            const updatedCommunityCards = [...prev.communityCards];
            updatedCommunityCards[data.cardIndex] = data.card;
            return { ...prev, communityCards: updatedCommunityCards, round: data.round };
          });
          setIsFlippingCommunityCards(false);
          setFlipAnimationComplete(true);
          flippedCardIndicesRef.current.add(data.cardIndex);
          isProcessingAnimationRef.current = false;
          item.callback?.();
          processAnimationQueue();
        },
        data.round === "showdown" && pendingWinners.length > 0 ? winnerCallback : undefined
      );
    } else if (item.type === "chipAction") {
      const { playerId, seat, amount, key, round, timestamp, action } = item.data;
      if (animatedKeysRef.current.has(key)) {
        animatedKeysRef.current.delete(key);
      }
      setChipAnimations((prev) => {
        const exists = prev.some((anim) => anim.key === key);
        if (!exists) {
          return [...prev, { playerId, seat, amount, key, round, timestamp, action }];
        }
        return prev;
      });
      animatePlayerActionChip(seat, amount, key, round, timestamp, false, false, playerId);
      isProcessingAnimationRef.current = false;
      item.callback?.();
      processAnimationQueue();
    } else if (item.type === "collectChips") {
      const { contributions, round, timestamp } = item.data;
      setIsCollectChipsComplete(false);
      setIsAnimating(true);
  
      setChipAnimations((prev) => prev.filter((anim) => anim.isPotToWinner));
      cleanupAnimations();
  
      contributions.forEach((contribution: IContribution) => {
        const { playerId, seat, amount } = contribution;
        const key = `collect-${playerId}-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;
        animatePlayerActionChip(seat, amount, key, round, timestamp, true, false, playerId);
      });
  
      setTimeout(() => {
        setIsAnimating(false);
        setIsCollectChipsComplete(true);
        isProcessingAnimationRef.current = false;
        item.callback?.();
        processAnimationQueue();
      }, CHIP_ANIMATION_DURATION);
    } else if (item.type === "potToWinner") {
      const data = item.data as IPotToWinnerData & { timestamp: string };
      potSound.play().catch(console.error);
  
      setChipAnimations((prev) => prev.filter((anim) => anim.isPotToWinner));
      setMergedChips([]);
      animatedKeysRef.current.clear();
  
      data.winners.forEach(({ playerId, seat, chipsWon, key }, index) => {
        const uniqueKey = key || `pot-to-winner-${playerId}-${data.timestamp}-${index}-${Math.random().toString(36).substring(2, 8)}`;
        animatePlayerActionChip(seat, chipsWon, uniqueKey, table?.round || "preflop", data.timestamp, false, true, playerId);
      });
  
      isProcessingAnimationRef.current = false;
      item.callback?.();
      processAnimationQueue();
    }
  }, [
    animateCommunityCardFlip,
    animatePlayerActionChip,
    pendingWinners,
    pendingShowdownPlayers,
    potSound,
    table,
    dealAnimationComplete,
    cleanupAnimations,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isAnimating) {
        cleanupAnimations();
        setIsAnimating(false);
        processAnimationQueue();
      }
    }, 4000);
    return () => clearTimeout(timeout);
  }, [isAnimating, cleanupAnimations, processAnimationQueue]);

  const renderMergedChips = () => {
    if (!isCollectChipsComplete) return null;
    const containerRect = animationContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return null;
  
    const tableCenterX = containerRect.width / 2 + 10;
    const tableCenterY = containerRect.height / 2;
    const targetX = tableCenterX;
    const targetY = tableCenterY + (isMobile ? 100 : 140);
  
    const totalAmount = mergedChips.reduce((sum, chip) => sum + chip.amount, 0);
    if (totalAmount === 0) return null;
  
    // Calculate number of chips to stack (e.g., 1 chip per 100 units, max 10 chips)
    const chipUnit = 10000; // Adjust based on your game's economy
    const chipCount = Math.min(Math.ceil(totalAmount / chipUnit), 4); // Cap at 10 chips
  
    return (
      <div
        style={{
          position: "absolute",
          left: `${targetX}px`,
          top: `${targetY}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 150,
          transform: "translate(-50%, -50%)",
        }}
        className="gap-2"
      >
        {Array.from({ length: chipCount }).map((_, i) => (
          <div
            key={`merged-chip-${i}`}
            style={{
              position: "absolute",
              transform: `translate(${(Math.random() - 0.5) * (isMobile ? 2 : 3)}px, ${
                -i * (isMobile ? 2 : 3)
              }px)`,
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "4px" : "6px",
            }}
          >
            <Image
              src={getChipSvg(i, totalAmount)}
              width={isMobile ? 15 : 20}
              height={isMobile ? 15 : 20}
              alt="chip"
            />
            {i === chipCount - 1 && (
              <span
                className={`text-white ${isMobile ? "text-xs" : "text-sm"} font-bold`}
                style={{
                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
                }}
              >
                {formatNumber(totalAmount)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const updateAdminPreviewCards = (tableData: ITable) => {
    if (isAdmin && tableData.status === "playing" && tableData.deck.length >= 5) {
      const flippedCards = tableData.communityCards.filter((card) => card !== "");
      const flippedCount = flippedCards.length;
  
      const cardsToShow = Math.max(0, 5 - flippedCount);
  
      const lastCards = tableData.deck
        .slice(-5) 
        .filter((card) => !flippedCards.includes(card)) 
        .slice(-cardsToShow);
  
      setAdminPreviewCards(lastCards);
    } else {
      setAdminPreviewCards([]);
    }
  };

  const handleTableData = (data: ITable) => {
    if (!data) {
      setTable(null);
      return;
    }
    setTable(data);
    setWinners([]);
    updateAdminPreviewCards(data);
    setRaiseAmount(data?.currentBet + data?.bigBlind || 0);
    flippedCardIndicesRef.current.clear();
    if (data.status === "playing" && data.round !== "preflop" && data.communityCards.length > 0) {
      setShowCommunityCards(true);
    } else {
      setShowCommunityCards(false);
    }
    if (data.status === "playing" && data.players[data.currentPlayer]?._id) {
      setLastActions((prev) => {
        const newActions = new Map(prev);
        newActions.delete(data.players[data.currentPlayer]._id.toString());
        return newActions;
      });
    }
    const tableMessages = (table?.messages || []).map((msg: any) => ({
      chatType: "table" as const,
      user: { _id: msg.user._id, name: msg.user.name },
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    }));
    setMessages((prev) => ({
      ...prev,
      table: tableMessages,
    }));
  }

  
const handleRoundUpdate = (data: ITable) => {
  if (!data || data._id !== tableId) return;

  setTable((prev) => {
    if (!prev) return data;
    return {
      ...data,
      communityCards: prev.communityCards.map((card, idx) =>
        card || data.communityCards[idx] || ""
      ),
    };
  });
  updateAdminPreviewCards(data);

  // Only clear community card-related state if round changes
  if (data.round !== table?.round) {
    flippedCardIndicesRef.current.clear();
    if (data.round !== "preflop" && data.communityCards.length > 0) {
      setShowCommunityCards(true);
      data.communityCards.forEach((card, index) => {
        if (card) {
          flippedCardIndicesRef.current.add(index);
        }
      });
    } else {
      setShowCommunityCards(false);
    }
  }

  // Retain chip animations (do not clear non-pot-to-winner chips)
  animationQueueRef.current = animationQueueRef.current.filter(
    (item) => item.type === "potToWinner" || item.type === "collectChips"
  );

  if (data.status === "playing" && data.players[data.currentPlayer]?._id) {
    setLastActions((prev) => {
      const newActions = new Map(prev);
      newActions.delete(data.players[data.currentPlayer]._id.toString());
      return newActions;
    });
  }
};
const handleGameStarted = (data: ITable) => {
  shuffleSound.play().catch(console.error);
  setTable(data);
  updateAdminPreviewCards(data);
  setShowCommunityCards(false);
  setLastActions(new Map());
  setFlipAnimationComplete(true);
  setIsFlippingCommunityCards(false);
  flippedCardIndicesRef.current.clear();
  
  // Clear all chip animations except pot-to-winner
  setChipAnimations((prev) => prev.filter((anim) => anim.isPotToWinner));
  setMergedChips([]);
  setIsCollectChipsComplete(true);
  animationQueueRef.current = [];
  isProcessingAnimationRef.current = false;
  animatedKeysRef.current.clear();
  setAnimationTimestamps(new Map());
  cleanupAnimations();

  // Find small and big blind players
  const smallBlindPlayer = data.players.find((p) => p.currentBet === data.smallBlind);
  const bigBlindPlayer = data.players.find((p) => p.currentBet === data.bigBlind);
  const timestamp = new Date().toISOString();

  // Add chip animations for blinds
  if (smallBlindPlayer && data.smallBlind > 0) {
    const key = `smallBlind-${smallBlindPlayer._id}-${timestamp}`;
    animationQueueRef.current.push({
      type: "chipAction",
      data: {
        playerId: smallBlindPlayer._id,
        seat: smallBlindPlayer.seat,
        amount: data.smallBlind,
        key,
        round: "preflop",
        timestamp,
        action: "smallBlind",
      },
      callback: () => {},
    });
  }
  if (bigBlindPlayer && data.bigBlind > 0) {
    const key = `bigBlind-${bigBlindPlayer._id}-${timestamp}`;
    animationQueueRef.current.push({
      type: "chipAction",
      data: {
        playerId: bigBlindPlayer._id,
        seat: bigBlindPlayer.seat,
        amount: data.bigBlind,
        key,
        round: "preflop",
        timestamp,
        action: "bigBlind",
      },
      callback: () => {},
    });
  }
  
  processAnimationQueue();
};

  const handlePlayerAction = (actionData: IPlayerAction) => {
    setLastActions((prev) => {
      const newActions = new Map(prev);
      newActions.set(actionData.playerId, {
        ...actionData,
        timestamp: new Date(actionData.timestamp),
      });
      return newActions;
    });
  }

  const handleDealCards = (data: IDealCardsData) => {
    if (data.tableId !== tableId) return;

    setIsDealing(true);
    setDealAnimationComplete(false);

    setTimeout(() => {
      animateDealCards(data.players, table?.maxPlayers || 10);
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
      setShowCommunityCards(false);
    }, SHUFFLE_DURATION + data.players.length * 2 * 80 + 300);
  }

  const handleFlipCommunityCard = (data: IFlipCommunityCardData) => {
    if (data.tableId !== tableId || !data.card || data.cardIndex < 0 || data.cardIndex >= 5) {
      return;
    }
  
    if (flippedCardIndicesRef.current.has(data.cardIndex)) {
      return;
    }
  
  
    if (data.round !== "preflop") {
      setShowCommunityCards(true);
    }
  
    animationQueueRef.current.push({
      type: "cardFlip",
      data,
      callback: () => {
        setTable((prev: any) => {
          if (!prev) return prev;
          const updatedCommunityCards = [...prev.communityCards];
          updatedCommunityCards[data.cardIndex] = data.card;
          return { ...prev, communityCards: updatedCommunityCards, round: data.round };
        });
        flippedCardIndicesRef.current.add(data.cardIndex);
      },
    });
  
    processAnimationQueue();
  };

  const handleHandResult = (data: IHandResult) => {
    potSound.play().catch(console.error);
    setPendingWinners(data.winners);
    setPendingShowdownPlayers(data.showdownPlayers);
    setLastActions(new Map());
    
    setShowCommunityCards(true);
  
    const isCommunityCardAnimationComplete =
      !isFlippingCommunityCards &&
      flipAnimationComplete &&
      animationQueueRef.current.every((item) => item.type !== "cardFlip");
  
    if (isCommunityCardAnimationComplete) {
      setWinners(data.winners);
      setShowdownPlayers(data.showdownPlayers);
      setShowCommunityCards(true);
    } else {
      const checkAnimations = () => {
        if (
          !isFlippingCommunityCards &&
          flipAnimationComplete &&
          animationQueueRef.current.every((item) => item.type !== "cardFlip")
        ) {
          setWinners(data.winners);
          setShowdownPlayers(data.showdownPlayers);
          setShowCommunityCards(true);
          clearInterval(animationCheckInterval);
        }
      };
      const animationCheckInterval = setInterval(checkAnimations, 100);
    }
  
    setTimeout(() => {
      cleanupAnimations();
      setWinners([]);
      setShowdownPlayers([]);
      setPendingWinners([]);
      setPendingShowdownPlayers([]);
      setShowCommunityCards(false);
      setLastActions(new Map());
      setFlipAnimationComplete(true);
      setIsFlippingCommunityCards(false);
      flippedCardIndicesRef.current.clear();
      setChipAnimations([]);
      setMergedChips([]);
      setIsCollectChipsComplete(true);
      animationQueueRef.current = [];
      isProcessingAnimationRef.current = false;
      animatedKeysRef.current.clear();
      setAnimationTimestamps(new Map());
  
      setTable((prev:any) => {
        if (!prev) return prev;
        const updatedPlayers = prev.players.map((player:any) => ({
          ...player,
          cards: [], 
        }));
        return { ...prev, players: updatedPlayers, communityCards: [] };
      });
    }, WINNER_DISPLAY_DURATION);
  };

  const handleError = (msg: string) => {
    toastMessage.error(msg);
  }

  const handleChipsAdded = ({ tableId: updatedTableId, userId, amount }: IChipAdded) => {
    if (updatedTableId !== tableId) return;
    setTable((prev) => {
      if (!prev) return prev;
      const updatedPlayers = prev.players.map((player) =>
        player.user === userId ? { ...player, chips: player.chips + amount } : player
      );
      return { ...prev, players: updatedPlayers };
    });
    chipSound.play().catch(console.error);
    toastMessage.success(`${amount}₮ нэмэгдлээ`);
  }

  const handleChipAnimate = ({
    action,
    amount,
    key,
    playerId,
    round,
    seat,
    tableId: chipTableId,
    timestamp,
  }: IChipAnimate) => {
    if (chipTableId !== tableId) return;
    if (["call", "raise", "allin", "smallBlind", "bigBlind"].includes(action) && amount > 0) {
      const uniqueKey =
        key && !animatedKeysRef.current.has(key)
          ? key
          : `${action}-${playerId}-${timestamp}-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 8)}`;
  
      setChipAnimations((prev) => {
        const exists = prev.some((anim) => anim.key === uniqueKey);
        if (!exists) {
          return [
            ...prev,
            { playerId, seat, amount, key: uniqueKey, round, timestamp, action },
          ];
        }
        return prev;
      });
  
      animationQueueRef.current.push({
        type: "chipAction",
        data: { playerId, seat, amount, key: uniqueKey, round, timestamp, action },
        callback: () => {
          // console.log(`Chip action processed: playerId=${playerId}, key=${uniqueKey}, action=${action}`);
        },
      });
  
      processAnimationQueue();
    }
  };
  const handlePotToWinner = (data: IPotToWinnerData) => {
    if (data.tableId !== tableId) return;
    setChipAnimations((prev) => prev.filter((anim) => anim.isPotToWinner));
    setMergedChips([]);
    animatedKeysRef.current.clear();
  
    animationQueueRef.current.push({
      type: 'potToWinner',
      data,
      callback: () => {
      }
    });
    processAnimationQueue();
  }

// Update handleCollectChips to clear all non-collect chips before animating collection
const handleCollectChips = (data: ICollectChip) => {
  if (data.tableId !== tableId) return;

  // Clear all non-pot-to-winner chips for the current round
  setChipAnimations((prev) =>
    prev.filter((anim) => anim.isPotToWinner)
  );
  animatedKeysRef.current.forEach((k) => {
    const anim = chipAnimations.find((a) => a.key === k);
    if (!anim || !anim.isPotToWinner) {
      animatedKeysRef.current.delete(k);
      const chipContainer = animatedElementsRef.current.find((el) => el.dataset.key === k);
      if (chipContainer && animationContainerRef.current) {
        safeRemoveChild(animationContainerRef.current, chipContainer);
      }
    }
  });
  animatedElementsRef.current = animatedElementsRef.current.filter(
    (el) => {
      const anim = chipAnimations.find((a) => a.key === el.dataset.key);
      return anim && anim.isPotToWinner;
    }
  );
  cleanupAnimations();

  animationQueueRef.current.push({
    type: "collectChips",
    data: {
      contributions: data.contributions,
      round: table?.round || "preflop",
      timestamp: data.timestamp,
    },
    callback: () => {
      setChipAnimations((prev) => prev.filter((anim) => anim.isPotToWinner));
    },
  });
  processAnimationQueue();
};

const renderPlayerChips = () => {
  const containerRect = animationContainerRef.current?.getBoundingClientRect();
  if (!containerRect || !table) return null;

  return chipAnimations
    .filter((anim) => !anim.isCollect && !anim.isPotToWinner && anim.x && anim.y)
    .map((anim) => {
      const { key, amount, x, y, chipCount, round } = anim;
      const chipHeight = isMobile ? 15 : 20;
      const verticalOffset = isMobile ? -5 : -5;

      return (
        <div
          key={key}
          style={{
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 300,
            transform: "translate(-50%, -50%)",
          }}
          className="gap-2"
        >
          {Array.from({ length: chipCount || 1 }).map((_, i) => (
            <div
              key={`${key}-chip-${i}`}
              style={{
                position: "absolute",
                transform: `translate(0px, ${i * verticalOffset}px)`,
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "4px" : "6px",
                zIndex: 300 + i,
              }}
            >
              <Image
                src={getChipSvg(i, amount)}
                width={isMobile ? 15 : 20}
                height={isMobile ? 15 : 20}
                alt="chip"
              />
              {i === (chipCount || 1) - 1 && (
                <span
                  className={`text-white ${isMobile ? "text-xs" : "text-sm"} font-bold`}
                  style={{
                    textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  {formatNumber(amount)}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    });
};
  const handleClearChips = () => {
    setChipAnimations([]);
    setMergedChips([]);
    setIsCollectChipsComplete(true);
    animationQueueRef.current = animationQueueRef.current.filter(item => item.type !== 'chipAction' && item.type !== 'collectChips');
    cleanupAnimations();
    processAnimationQueue();
  }

  const handleLobbyMessage = (message: IMessage[]) => {
    const formattedLobbyMessages = message.map((msg) => ({
      chatType: "lobby" as const,
      user: { _id: msg.user._id, name: msg.user.name },
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    }));
    setMessages((prev) => ({
      ...prev,
      lobby: formattedLobbyMessages
    }));
  }

  const handleNewMessage = (message: IMessage) => {
    setMessages((prev) => ({
      ...prev,
      [message.chatType]: [...prev[message.chatType], message],
    }));
  }

  const { socket, isConnected } = useSocketEvents({
    onTableData: handleTableData,
    onTableUpdate: handleTableData,
    onRoundUpdate: handleRoundUpdate,
    onPlayerDisconnected: (e) => { console.log(e, "playerDisconnnected") },
    onPlayerRemoved: (e) => { console.log(e) },
    onGameStarted: handleGameStarted,
    onPlayerAction: handlePlayerAction,
    onDealCard: handleDealCards,
    onFlipCommunityCard: handleFlipCommunityCard,
    onHandResult: handleHandResult,
    onError: handleError,
    onChipsAdded: handleChipsAdded,
    onChipAnimate: handleChipAnimate,
    onPotToWinner: handlePotToWinner,
    onCollectChips: handleCollectChips,
    onClearChips: handleClearChips,
    onLobbyMessage: handleLobbyMessage,
    onNewMessage: handleNewMessage
  });

  const { data: tableData, error: tableError } = useSWRSubscription(
    tableId ? `table.${tableId}` : null,
    (key, { next }) => {
      if (!tableId || !socket) {
        next(new Error("Invalid table ID or socket not initialized"), null);
        return () => {};
      }

      const handleTableData = (data: ITable) => {
        if (data?._id === tableId) {
          next(null, data);
        }
      };

      socket.on("tableData", handleTableData);
      socket.on("tableUpdate", handleTableData);

      socket.on("connect", () => {
        console.log("Socket.IO connected for SWR subscription");
        socket.emit("joinTable", tableId);
      });

      socket.on("connect_error", (err) => {
        console.error("Socket.IO connection error:", err);
        next(err, null);
        setTimeout(() => socket.connect(), 5000);
      });

      socket.on("error", (msg: string) => {
        console.error("Socket.IO error:", msg);
        next(new Error(msg), null);
      });

      if (socket.connected) {
        socket.emit("joinTable", tableId);
      }

      return () => {
        socket.off("tableData", handleTableData);
        socket.off("tableUpdate", handleTableData);
        socket.off("connect_error");
        socket.off("disconnect");
      };
    },
    {
      fallbackData: null,
    }
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const updateScreenSize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setScreenWidth(window.innerWidth);
        setScreenHeight(window.innerHeight);
      }, 100);
    };
    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => {
      window.removeEventListener("resize", updateScreenSize);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (tableData && !table) {
      setTable(tableData);
      setRaiseAmount(tableData.currentBet + tableData.bigBlind || 0);
      updateAdminPreviewCards(tableData);
    }
  }, [table, tableData, updateAdminPreviewCards]);

  useEffect(() => {
    if (socket && isConnected && tableId) {
      socket.emit("joinTable", tableId);
    }
  }, [socket, isConnected, tableId]);

  const joinSeat = (seat: number, chips: number) => {
    if (!currentUser?._id) {
      setIsLoginModalOpen(true);
      return;
    }
    if (chips < (table?.buyIn || 0)) {
      toastMessage.error(`Доод боломжит дүн ${table?.buyIn || 0}`);
      return;
    }
    socket?.emit("joinSeat", { tableId, seat, userId: currentUser._id, chips });
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
        break;
      case "raise":
        betAmount = amount || raiseAmount;
        raiseSound.play().catch((err) => console.error("Error playing raise sound:", err));
        break;
      case "allin":
        betAmount = currentPlayer.chips;
        raiseSound.play().catch((err) => console.error("Error playing raise sound:", err));
        break;
    }
    socket?.emit("gameAction", {
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

  const getVisibleCardCount = useCallback(
    (round: string, totalCards: number): number => {
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
          return totalCards;
      }
    },
    []
  );

  if (!isConnected || !tableData) {
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
      </div>
    );
  }

  if (tableError || !table) {
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
        <div className="text-center">
          <p>Error loading table: {tableError?.message || "Table not found"}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
            onClick={() => {
              if (socket && tableId) {
                socket.emit("joinTable", tableId);
              }
            }}
          >
            Retry
          </button>
        </div>
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
    table.status === "playing" &&
    currentPlayer?.user === currentUser?._id &&
    !currentPlayer?.hasActed &&
    !winners.length;

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
            dealAnimationComplete={dealAnimationComplete}
            isFlippingCommunityCards={isFlippingCommunityCards}
            flipAnimationComplete={flipAnimationComplete}
            flippedCardIndices={flippedCardIndicesRef.current}
            isMyTurn={isMyTurn}
            currentPlayer={currentPlayer}
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
          >
           {renderPlayerChips()}
           {renderMergedChips()}
          </div>
        </div>
      </div>

      <div className="fixed top-[5%] left-8">
        <p className="text-gray-500">#{table.name}</p>
      </div>

      <ChatComponent messages={messages} tableId={tableId} currentUser={currentUser} socket={socket} />
      <Waitinglist table={table} />
      <SeatInstruction isUserSeated={isUserSeated} isMobile={isMobile} />

      {isMyTurn && table.status === "playing" && currentPlayer?.cards.length > 0 && (
        <ButtonNav
          isRaiseOpen={isRaiseOpen}
          setIsRaiseOpen={setIsRaiseOpen}
          isMobile={isMobile}
          raiseAmount={raiseAmount}
          setRaiseAmount={setRaiseAmount}
          table={table}
          currentPlayer={currentPlayer}
          gameAction={gameAction}
          dealAnimationComplete={dealAnimationComplete}
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