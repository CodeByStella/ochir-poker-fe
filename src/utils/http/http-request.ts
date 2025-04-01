import type { Store } from "redux";
import qs from "qs";
import { HttpHandler } from "./http-handler";

type Options = {
  method: string;
  contentType?: string;
};

type JSONobj = any;

export class HttpRequest {
  store?: Store;
  prefix = "";
  host = "";
  errorHandler?: (statusCode: number, error: HttpHandler) => void;

  constructor(
    host: null | string = "",
    prefix: null | string = "",
    errorHandler?: (statusCode: number, error: HttpHandler) => void,
  ) {
    this.errorHandler = errorHandler;
    this.host = host || "";
    this.prefix = prefix || "";
  }

  async request(api: string, data: JSONobj, options: Options) {
    if (!this.store) {
      throw new Error("No store found");
    }

    const state = this.store.getState();

    const defaultOptions: RequestInit = {
      credentials: "include",
      method: options.method,
      headers: {},
    };

    if (
      state.auth &&
      state.auth.token &&
      typeof state.auth.token === "string"
    ) {
      defaultOptions.headers = {
        ...defaultOptions.headers,
        Authorization: `Bearer ${state.auth.token}`,
      };
    }

    if (
      state.auth &&
      state.auth.deviceToken &&
      typeof state.auth.deviceToken === "string"
    ) {
      defaultOptions.headers = {
        ...defaultOptions.headers,
        "X-Device": state.auth.deviceToken,
      };
    }

    if (options.contentType === "multipart/form-data") {
      defaultOptions.headers = {
        ...defaultOptions.headers,
      };

      defaultOptions.body = data as unknown as BodyInit;
    } else {
      defaultOptions.headers = {
        ...defaultOptions.headers,
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      };
      defaultOptions.body = JSON.stringify(data) as BodyInit;
    }

    let queryString = "";

    if (options.method === "GET") {
      delete defaultOptions.body;
      queryString = qs.stringify(data, {
        addQueryPrefix: true,
      });
    }

    try {
      const res = await fetch(
        `${this.host}${this.prefix}${api}${queryString}`,
        defaultOptions,
      );
      const http = new HttpHandler(res.status);

      const response = await http.handle(res);

      return response;
    } catch (ex) {
      if (this.errorHandler) {
        this.errorHandler((ex as HttpHandler).statusCode, ex as HttpHandler);
        return null;
      }

      throw ex;
    }
  }

  get(api: string, data?: JSONobj) {
    return this.request(api, data || {}, { method: "GET" });
  }

  post(api: string, data?: JSONobj) {
    return this.request(api, data || {}, { method: "POST" });
  }

  put(api: string, data?: JSONobj) {
    return this.request(api, data || {}, { method: "PUT" });
  }

  del(api: string, data?: JSONobj) {
    return this.request(api, data || {}, { method: "DELETE" });
  }

  upload(api: string, data?: JSONobj) {
    return this.request(api, data || {}, {
      method: "POST",
      contentType: "multipart/form-data",
    });
  }
}
