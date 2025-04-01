import { persistStore, persistReducer } from "redux-persist";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import storage from "./storage";
import { authReducer } from "./auth-slice";
import { Auth } from "@/models/auth";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"],
};

export interface RootState {
  auth: Auth;
}

const rootReducer = combineReducers({
  auth: authReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: process.env.NODE_ENV !== "production",
});

persistStore(store);

export { store };
