import { siteApi } from "@/config/site";
import { HttpRequest } from "@/utils/request";

const appHttpRequest = new HttpRequest(null, `${siteApi}`);
export const getBank = async () => {
    const res = await appHttpRequest.get("/admin/bank");
    return res;
  };