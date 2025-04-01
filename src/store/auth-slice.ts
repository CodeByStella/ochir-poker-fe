import { createSlice } from "@reduxjs/toolkit";

const initialState: any = {
  token: null,
  sessionScope: null,
  user: null,
  userId: null,
  otpEmail: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (
      state: any,
      {
        payload,
      }: {
        payload: {
          token: string;
          sessionScope: string;
        };
      },
    ) => ({ ...state, token: payload.token }),
    logout: () => {
      return initialState;
    },
    authMe: (state: any, { payload }: { payload: any }) => ({
      ...state,
      user: payload,
      userId: payload?._id,
    }),
  },
});

export const authReducer = authSlice.reducer;

export const { authMe, setToken, logout } = authSlice.actions;
