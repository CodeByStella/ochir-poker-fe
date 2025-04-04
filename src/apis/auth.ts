import { siteApi } from "@/config/site";
import { store } from "@/store";
import { authMe, setToken } from "@/store/auth-slice";
import { HttpRequest } from "@/utils/request";

const appHttpRequest = new HttpRequest(null, `${siteApi}`);

export const me = async () => {
  try {
    const res = await appHttpRequest.get("/users/me");
    return res?.user || res; 
  } catch (err) {
    throw err;
  }
};


export const login = async (data: { name: string; password: string }) => {
  const res = await appHttpRequest.post("/auth/login", data);
  store.dispatch(setToken(res));
  return res;
};

export const register = async (data: { name: string; password: string }) => {
  const res = await appHttpRequest.post("/auth/register", data);
  store.dispatch(setToken(res));
  return res;
}
