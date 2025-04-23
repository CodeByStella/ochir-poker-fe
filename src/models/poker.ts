import { ITable } from "./table";

export const SHUFFLE_DURATION = 2000;
export const WINNER_DISPLAY_DURATION = 2000;
export const ALL_IN_SHOWDOWN_DELAY = 1500;
export const CHIP_ANIMATION_DURATION = 1000

export interface IDealCardsData {
  tableId: string;
  players: {
    user: string;
    seat: number;
    cards: [string, string];
    chips: number;
    username: string;
  }[];
}

export interface ISelectedRoom {
  id: string;
  name: string;
  players: { username: string; flag: string; amount: string }[];
  tableData?: ITable;
}

export interface IPlayerAction {
  playerId: string;
  action: string;
  amount?: number;
  timestamp: Date;
}

export interface IWinnerData {
  playerId: string;
  chipsWon: number;
  handDescription?: string;
  seat: number;
  key: string;
}

export interface IPotToWinnerData {
  tableId: string;
  winners: IWinnerData[];
  timestamp: string 
}

export interface ICollectChip {
   tableId:string;
  contributions: IContribution[];
  mergeToBottom: boolean;
  timestamp: string 
}

export interface IContribution {
  playerId: string;
  seat: number;
  amount: number;
}

export interface IChipAdded {
  tableId: string;
  userId: string
  amount: number 
}

export interface IChipAnimate { 
  playerId: string
   seat: number
   amount: number
    tableId: string
     round: string
      timestamp: string
       action: string
        key: string 
}

export interface IHandResult { winners: IWinnerData[]; showdownPlayers: { playerId: string; cards: string[] }[] }

export interface IFlipCommunityCardData {
  tableId: string;
  cardIndex: number;
  card: string;
  round: string;
  timestamp: string;
}

export interface IMessage {
  chatType: "table" | "lobby";
  user: { _id: string; name: string };
  content: string;
  timestamp: Date;
}

export interface IAnimationQueueItem {
  type: 'cardFlip' | 'chipAction' | 'collectChips' | 'potToWinner';
  data: any;
  callback?: () => void;
}

