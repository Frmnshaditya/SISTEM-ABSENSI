import React, { useState } from "react";
import { KeyRound, Mail, AlertCircle, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { User } from "../types";
import Logo from "./Logo";

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User, token: string) => void;
}

export default function LoginModal({ onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Mohon ketik alamat email dan password Guru!");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        // Clean flow hold
        setTimeout(() => {
          onLoginSuccess(data.user, data.token);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(data.message || "Email atau password Guru tidak valid!");
      }
    } catch (err) {
      console.error("Login attempt failed:", err);
      setErrorMsg("Koneksi gagal! Silakan cek server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      
      <div
        id="login-dialog-card"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200"
      >
        
        {/* Header decoration block */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />

        {/* Close Button right corner */}
        <button
          onClick={onClose}
          id="btn-close-login"
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-950/45 p-1.5 rounded-full border border-slate-800 shrink-0 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Form area padding */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <div className="flex justify-center mb-4">
              <Logo variant="full" className="h-32 w-auto animate-pulse duration-3000" />
            </div>
            <h3 className="text-white text-xl font-bold tracking-tight">Otentikasi Guru</h3>
            <p className="text-slate-400 text-xs">Akses dashboard admin absensi & registrasi siswa</p>
          </div>

          {/* Quick Demo Help Banner (Super useful!) */}
          <div className="bg-emerald-950/40 border border-emerald-800/50 p-4 rounded-2xl text-xs text-left text-emerald-200 flex gap-3">
            <ShieldAlert className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-300">Kredensial Demo Sandbox (Aktif):</p>
              <div className="mt-1.5 space-y-1 font-mono text-emerald-400">
                <p>Email: <b className="text-white select-all">guru@sekolah.sch.id</b></p>
                <p>Pas: <b className="text-white select-all">password123</b></p>
              </div>
            </div>
          </div>

          {success ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <CheckCircle2 className="h-14 w-14 text-emerald-500 animate-bounce" />
              <h5 className="text-white font-bold text-base">Autentikasi Berhasil!</h5>
              <p className="text-emerald-400 text-xs font-mono">mempersiapkan dashboard administrasi...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              
              {errorMsg && (
                <div className="p-3 bg-red-950/70 border border-red-900 rounded-xl text-xs text-red-200 flex items-start gap-2 animate-pulse">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Email Form */}
              <div className="space-y-1.5">
                <label className="text-slate-300 text-xs font-medium uppercase tracking-wider block">Email Guru</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@sekolah.sch.id"
                    disabled={isLoading}
                    className="w-full bg-slate-950 text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>

              {/* Password Form */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 text-xs font-medium uppercase tracking-wider block">Password</label>
                  <span className="text-[10px] text-slate-500">Kunci Sandi</span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full bg-slate-950 text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>

              {/* Action Button submit */}
              <button
                type="submit"
                id="btn-submit-login"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest font-sans transition shadow-lg shadow-emerald-900/10 cursor-pointer disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? "MENGEVALUASI..." : "LOG IN SEKARANG"}
              </button>

            </form>
          )}

          <div className="text-center pt-2 border-t border-slate-950 text-[10px] text-slate-500">
            Koneksi database aman dengan transkripsi ter-enkripsi.
          </div>
        </div>

      </div>
    </div>
  );
}
