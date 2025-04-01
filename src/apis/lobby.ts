import { siteApi } from "@/config/site";
import { HttpRequest } from "@/utils/request";

const appHttpRequest = new HttpRequest(null, `${siteApi}`);
export const getLobbys = async () => {
  const res = await appHttpRequest.get("/lobby");
  return res;
};
