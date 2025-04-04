
export type IUser = User;

export type IDeposit ={
  amount: number;
  user: IUser;
  createdAt: Date;
}
export class User implements IUser {
  _id: string;
  name: string;
  role: string;
  withdrawAmount: number;
  depositAmount: number;
  withdrawes: IDeposit[];
  deposites: IDeposit[];

  bankType: string;
  bankAccount: string;
  amount: number;
  createdAt: Date;

  constructor({ _id, name, withdrawAmount, depositAmount, withdrawes, deposites, bankType, bankAccount,amount, role, createdAt }: IUser) {
    this._id = _id;
    this.name = name;
    this.withdrawAmount = withdrawAmount;
    this.depositAmount= depositAmount;
    this.withdrawes = withdrawes;
    this.createdAt = createdAt;
    this.deposites = deposites;
    this.bankType = bankType;
    this.bankAccount = bankAccount;
    this.amount = amount;
    this.role = role;
  }

  static fromJson(json: any) {
    return new User(json);
  }
}
