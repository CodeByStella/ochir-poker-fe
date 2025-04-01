import { siteApi } from "@/config/site";
import { HttpRequest } from "@/utils/request";

const appHttpRequest = new HttpRequest(null, `${siteApi}`);

export const withdraw = async (data: { amount: number; id: string }) => {
  const res = await appHttpRequest.post("/users/withdraw", data);
  return res;
};