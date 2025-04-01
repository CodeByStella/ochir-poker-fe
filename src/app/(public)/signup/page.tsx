"use client";

import Link from "next/link";
import React, { useState } from "react";
import { message } from "@/utils/toast";
import { authApi } from "@/apis";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", password: "", bankAccount: "", bankType: "" });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authApi.register(formData);
      console.log("Signup Response:", res);
      message.success("Амжилттай бүртгүүллээ!");
      router.push("/login");
    } catch (err: any) {
      console.error("Signup Error:", err);
      message.error(err.message || "Бүртгэл амжилтгүй боллоо.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4 py-8 sm:py-12 md:py-16"
      style={{
        backgroundImage: "url('/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="bg-gray-900 bg-opacity-90 p-4 sm:p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-[90%] sm:max-w-md md:max-w-lg border border-gold-500 relative overflow-hidden">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center mb-4 sm:mb-6 text-white tracking-wide relative z-10">
          Poker Бүртгүүлэх
        </h2>
        <form onSubmit={handleSubmit} className="relative z-10 space-y-4 sm:space-y-5">
          <input
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Нэр"
            className="w-full text-white px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 border border-gold-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base placeholder-gray-400"
            required
          />
          <input
            name="bankType"
            value={formData.bankType}
            onChange={handleInputChange}
            placeholder="Банк нэр"
            className="w-full text-white px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 border border-gold-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base placeholder-gray-400"
            required
          />
          <input
            name="bankAccount"
            value={formData.bankAccount}
            onChange={handleInputChange}
            placeholder="Дансны дугаар"
            className="w-full text-white px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 border border-gold-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base placeholder-gray-400"
            required
          />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Нууц үг"
            className="w-full text-white px-3 py-2 sm:px-4 sm:py-3 bg-gray-800 border border-gold-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base placeholder-gray-400"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 sm:py-3 rounded-lg text-white font-semibold transition bg-red-600 hover:bg-red-700 text-sm sm:text-base md:text-lg disabled:bg-gray-500 shadow-md"
          >
            {loading ? "Бүртгэж байна..." : "Бүртгүүлэх"}
          </button>
        </form>
        <div className="text-center mt-4 sm:mt-6 relative z-10">
          <Link
            href="/login"
            className="text-blue-400 hover:text-gold-300 hover:underline text-xs sm:text-sm md:text-base transition"
          >
            Нэвтрэх
          </Link>
        </div>
        {/* Card suit decoration */}
        <div className="absolute top-2 right-2 text-white opacity-50 text-xl sm:text-2xl md:text-3xl">♠</div>
        <div className="absolute bottom-2 left-2 text-white opacity-50 text-xl sm:text-2xl md:text-3xl">♥</div>
      </div>
    </div>
  );
}