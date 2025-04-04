import { IPlayer } from "./player";

export type ITable = Table;

export interface IMessage {
  user: { _id: string; name?: string };
  content: string;
  timestamp: Date;
}

export class Table implements ITable {
    _id: string;
      name: string;
      maxPlayers: number;
      buyIn: number;
      maxBuyIn: number;
      smallBlind: number;
      bigBlind: number;
      minimumBet: number;
      gameType: string;
      players: IPlayer[]
      waitingPlayers: IPlayer[]
      tableFee: number;
      status: 'waiting' | 'playing' | 'ended';
      communityCards: string[];
      pot: number;
      dealerSeat: number;
      currentPlayer: number;
      currentBet: number;
      round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
      deck: string[];
      messages: IMessage[];
      tableEarnings: number;

  constructor({ _id, name, bigBlind,buyIn,communityCards,currentBet,currentPlayer,dealerSeat,deck,gameType,maxBuyIn,maxPlayers,messages,minimumBet,players,pot,round,smallBlind,status,tableEarnings,tableFee,waitingPlayers }: ITable) {
    this._id = _id;
    this.name = name;
    this.bigBlind = bigBlind;
    this.buyIn= buyIn;
    this.communityCards = communityCards;
    this.currentBet = currentBet;
    this.currentPlayer = currentPlayer;
    this.dealerSeat = dealerSeat;
    this.deck = deck;
    this.gameType = gameType;
    this.maxBuyIn = maxBuyIn;
    this.maxPlayers = maxPlayers;
    this.messages= messages;
    this.minimumBet= minimumBet;
    this.players= players;
    this.pot= pot;
    this.round= round;
    this.smallBlind= smallBlind;
    this.status= status;
    this.tableEarnings= tableEarnings;
    this.tableFee= tableFee;
    this.waitingPlayers= waitingPlayers;
  }

  static fromJson(json: any) {
    return new Table(json);
  }
}
