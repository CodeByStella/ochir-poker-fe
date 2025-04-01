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
  avatar: string;
}

export interface IMessage {
  user: { _id: string; name?: string };
  content: string;
  timestamp: Date;
}

export interface ITable {
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
     gameType: string;
}