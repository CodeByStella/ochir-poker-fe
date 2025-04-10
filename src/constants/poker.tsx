export const getCardImagePath = (card: string) => {
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

