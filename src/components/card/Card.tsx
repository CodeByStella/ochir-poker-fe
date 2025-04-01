import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./Card.module.css";

interface CardProps {
  value: string;
  isOpen: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function Card({ value, isOpen, style, className }: CardProps) {

  const [isMobile, setIsMobile] = useState(false);

  const updateDeviceType = () => {
    const mobileBreakpoint = 768;
    setIsMobile(window.innerWidth < mobileBreakpoint);
  };

  useEffect(() => {
    updateDeviceType();
    window.addEventListener("resize", updateDeviceType);
    return () => window.removeEventListener("resize", updateDeviceType);
  }, []);

  let rank = "";
  let suit = "";

  if (value === "back") {
    rank = "back";
    suit = "";
  } else {
    if (value.length >= 2) {
      rank = value.slice(0, -1);
      suit = value.slice(-1).toLowerCase();
    }

    if (!rank && value.includes(" ")) {
      const parts = value.toLowerCase().split(" of ");
      if (parts.length === 2) {
        rank = parts[0].charAt(0).toUpperCase();
        if (rank === "A") rank = "A";
        else if (rank === "K") rank = "K";
        else if (rank === "Q") rank = "Q";
        else if (rank === "J") rank = "J";
        else rank = parts[0];
        suit = parts[1].charAt(0);
      }
    }
  }

  const suitMap: { [key: string]: string } = {
    s: "spades",
    h: "hearts",
    d: "diamonds",
    c: "clubs",
  };

  // Adjust card size based on device type
  const cardWidth = isMobile ? "2vw" : "2.5vw"; // Smaller on mobile
  const cardHeight = isMobile ? "2.8vw" : "3.6vw"; // Smaller on mobile
  const imageWidth = isMobile ? 48 : 60; // Smaller image width on mobile
  const imageHeight = isMobile ? 67 : 84; // Smaller image height on mobile
  const minWidth = isMobile ? "32px" : "40px"; // Smaller minWidth on mobile
  const minHeight = isMobile ? "45px" : "56px"; // Smaller minHeight on mobile
  const maxWidth = isMobile ? "48px" : "60px"; // Smaller maxWidth on mobile
  const maxHeight = isMobile ? "67px" : "84px"; // Smaller maxHeight on mobile

  const cardImageSrc =
    value === "back" || !suit || !rank
      ? "/card.png"
      : `/cards/${suitMap[suit]}/${rank}${suit}.svg`;

  const cardFront = (
    <Image
      src={cardImageSrc}
      alt={`${rank} of ${suitMap[suit] || "unknown"}`}
      width={imageWidth}
      height={imageHeight}
      className={styles.cardFront}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );

  const cardBack = (
    <Image
      src="/card.png"
      alt="Card Back"
      width={imageWidth}
      height={imageHeight}
      className={styles.cardBack}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );

  return (
    <div
      className={`${styles.card} ${isOpen && value !== "back" ? styles.open : ""} ${className || ""}`}
      style={{
        width: cardWidth,
        height: cardHeight,
        minWidth: minWidth,
        minHeight: minHeight,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
        ...style,
      }}
    >
      <div className={styles.cardInner}>
        {value !== "back" && cardFront}
        {cardBack}
      </div>
    </div>
  );
}