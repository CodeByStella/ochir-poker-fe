import { ITable } from "./table";
import { IUser } from "./user";

export interface IPlayer {
  _id: string;
  user: IUser | string
  table: ITable
  socketId?: string; 
  seat: number; 
  chips: number;
  cards: [string, string] | [string, string, string, string]; 
  username: string; 
  inHand: boolean; 
  currentBet: number;
  hasActed: boolean; 
  consecutiveAfkRounds: number;
}
