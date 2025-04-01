import { Admin } from "./admin";

export type IAuth = Auth;

export class Auth implements IAuth {
  token: string | null;
  sessionScope: string | null;
  user: Admin | null;
  userId?: string | null;
  otpEmail?: string | null;

  constructor({ token, sessionScope, user, userId, otpEmail }: IAuth) {
    this.token = token;
    this.sessionScope = sessionScope;
    this.user = user;
    this.userId = userId;
    this.otpEmail = otpEmail;
  }
}
