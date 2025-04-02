"use client";
import { authApi } from '@/apis';
import { Modal } from 'antd';
import React, { Dispatch, SetStateAction, useState } from 'react';
import { Controller, useForm } from "react-hook-form";
import toast from 'react-hot-toast';
import './LoginModal.css';

type Props = {
  setModal: Dispatch<SetStateAction<boolean>>;
  modal: boolean;
  onSuccessfulLogin?: () => void;
};

export type ILoginForm = {
  name: string;
  password: string;
};

export type ISignUpForm = {
  name: string;
  bankAccount: string;
  password: string;
  bankType?: string;
};

const LoginModal = ({ modal, setModal, onSuccessfulLogin }: Props) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  const {
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
    control: loginControl,
    setError: setLoginError,
    reset: resetLogin,
  } = useForm<ILoginForm>({
    defaultValues: { name: '', password: '' },
  });

  const {
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors, isSubmitting: isSignUpSubmitting },
    control: signUpControl,
    setError: setSignUpError,
    reset: resetSignUp,
  } = useForm<ISignUpForm>({
    defaultValues: { name: '', bankType: '', password: '', bankAccount: '' },
  });

  const onLoginSubmit = async (data: ILoginForm) => {
    try {
      await authApi.login(data);
      toast.success("Амжилттай нэвтэрлээ.");
      setModal(false);
      resetLogin();
      onSuccessfulLogin?.();
    } catch (err: any) {
      console.log(err, "LOGIN ERROR");
      const errorMessage = err.error?.message || "Нэвтрэхэд алдаа гарлаа";
      toast.error(errorMessage);
      setLoginError("password", { message: errorMessage });
    }
  };

  const onSignUpSubmit = async (data: ISignUpForm) => {
    try {
      await authApi.register(data);
      toast.success("Амжилттай бүртгэгдлээ.");
      setActiveTab('login');
      resetSignUp();
    } catch (err: any) {
      console.log(err, "SIGNUP ERROR");
      const errorMessage = err.error?.message || "Бүртгүүлэхэд алдаа гарлаа";
      toast.error(errorMessage);
      setSignUpError("password", { message: errorMessage });
    }
  };

  return (
    <Modal
      visible={modal}
      onCancel={() => {
        setModal(false);
        resetLogin();
        resetSignUp();
      }}
      footer={null}
      width="90%" 
      style={{ maxWidth: "600px", minWidth: "300px" }} 
      centered
      bodyStyle={{ padding: 0, backgroundColor: "#1a1b1e", height: "auto" }} 
      maskStyle={{ backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(3px)" }}
    >
      <div className="flex flex-col md:flex-row h-auto md:h-[400px]">
        <div
          className="hidden md:block w-full md:w-1/2 p-6  flex-col justify-between relative bg-cover bg-center bg-no-repeat bg-[url('/qwe.jpg')] bg-[#1a1b1e]"
          style={{ borderRadius: '8px 0 0 8px' }}
        >
        </div>
        <div className="w-full md:w-1/2 p-4 md:p-6 bg-[#1a1b1e] text-white flex flex-col justify-center">
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setActiveTab('login')}
              className={`px-4 py-2 ${activeTab === "login" ? "text-white font-semibold underline decoration-blue-500 underline-offset-2" : "text-gray-400"}`}
            >
              Нэвтрэх
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`px-4 py-2 ${activeTab === 'signup' ? 'text-white font-semibold underline decoration-blue-500 underline-offset-2' : 'text-gray-400'}`}
            >
              Бүртгүүлэх
            </button>
          </div>

          {activeTab === 'signup' && (
            <form onSubmit={handleSignUpSubmit(onSignUpSubmit)} className="flex flex-col gap-4">
              <Controller
                name="name"
                control={signUpControl}
                rules={{ required: "Нэр оруулна уу" }}
                render={({ field }) => (
                  <div>
                    <input
                      {...field}
                      disabled={isSignUpSubmitting}
                      className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      placeholder="Нэр"
                      autoComplete="username"
                    />
                    {signUpErrors.name && (
                      <p className="text-red-500 text-sm mt-1">{signUpErrors.name.message}</p>
                    )}
                  </div>
                )}
              />
              <Controller
                name="bankType"
                control={signUpControl}
                rules={{ required: "Банк төрөл оруулна уу" }}
                render={({ field }) => (
                  <div>
                    <input
                      {...field}
                      disabled={isSignUpSubmitting}
                      className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      placeholder="Банк нэр"
                      autoComplete="bankType"
                    />
                    {signUpErrors.bankType && (
                      <p className="text-red-500 text-sm mt-1">{signUpErrors.bankType.message}</p>
                    )}
                  </div>
                )}
              />
              <Controller
                name="bankAccount"
                control={signUpControl}
                rules={{ required: "Данс дугаар оруулна уу" }}
                render={({ field }) => (
                  <div>
                    <input
                      {...field}
                      disabled={isSignUpSubmitting}
                      className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      placeholder="Дансны дугаар"
                      autoComplete="bankAccount"
                    />
                    {signUpErrors.bankAccount && (
                      <p className="text-red-500 text-sm mt-1">{signUpErrors.bankAccount.message}</p>
                    )}
                  </div>
                )}
              />
              <Controller
                name="password"
                control={signUpControl}
                rules={{ required: "Нууц үг оруулна уу" }}
                render={({ field }) => (
                  <div>
                    <input
                      {...field}
                      type="password"
                      disabled={isSignUpSubmitting}
                      className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      placeholder="Нууц үг*"
                      autoComplete="new-password"
                    />
                    {signUpErrors.password && (
                      <p className="text-red-500 text-sm mt-1">{signUpErrors.password.message}</p>
                    )}
                  </div>
                )}
              />
              <button
                type="submit"
                disabled={isSignUpSubmitting}
                className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {isSignUpSubmitting ? "Бүртгэж байна..." : "Бүртгүүлэх"}
              </button>
              <p className="text-center text-gray-400">
                Бүртгэлтэй бол!{' '}
                <button
                  onClick={() => setActiveTab('login')}
                  className="text-green-500 hover:underline"
                >
                  <p className="underline">Нэвтрэх</p>
                </button>
              </p>
            </form>
          )}

          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="flex flex-col gap-4">
              <Controller
                name="name"
                control={loginControl}
                rules={{ required: "Нэвтрэх нэр оруулна уу" }}
                render={({ field }) => (
                  <div>
                    <input
                      {...field}
                      disabled={isLoginSubmitting}
                      className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      placeholder="Нэр"
                      autoComplete="username"
                    />
                    {loginErrors.name && (
                      <p className="text-red-500 text-sm mt-1">{loginErrors.name.message}</p>
                    )}
                  </div>
                )}
              />
              <Controller
                name="password"
                control={loginControl}
                rules={{ required: "Нууц үг оруулна уу" }}
                render={({ field }) => (
                  <div>
                    <input
                      {...field}
                      type="password"
                      disabled={isLoginSubmitting}
                      className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      placeholder="Нууц үг*"
                      autoComplete="current-password"
                    />
                    {loginErrors.password && (
                      <p className="text-red-500 text-sm mt-1">{loginErrors.password.message}</p>
                    )}
                  </div>
                )}
              />
              <button
                type="submit"
                disabled={isLoginSubmitting}
                className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {isLoginSubmitting ? "Нэвтэрч байна..." : "Нэвтрэх"}
              </button>
              <p className="text-center text-gray-400">
                Бүртгэлгүй бол!{' '}
                <button
                  onClick={() => setActiveTab('signup')}
                  className="text-green-500 hover:underline"
                >
                  <p className="underline">Бүртгүүлэх</p>
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default LoginModal;