
export type IAdmin = Admin;
export class Admin implements IAdmin {
  _id: string;
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  password: string;
  sessionId: string;
  sessionScope: string;
  isActive: true;

  constructor({ _id, lastName, firstName, phone, email, createdAt, updatedAt, password, sessionId, sessionScope, isActive }: IAdmin) {
    this._id = _id;
    this.lastName = lastName;
    this.firstName = firstName;
    this.phone = phone;
    this.email = email;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.password = password;
    this.sessionId = sessionId;
    this.sessionScope = sessionScope;
    this.isActive = isActive;
  }

  static username(user: IAdmin) {
    if (!user?.lastName && !user?.email && !user?.firstName) {
      return "-";
    }
    if (user?.lastName && user?.firstName) {
      return `${user.lastName} ${user.firstName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.lastName) {
      return user.lastName;
    }
    if (user?.email) {
      return user.email;
    }
    return `${user?.phone}`;
  }

  static fromJson(json: any) {
    return new Admin(json);
  }
}
