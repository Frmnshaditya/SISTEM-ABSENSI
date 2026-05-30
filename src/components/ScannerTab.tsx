import { useState, useEffect } from "react";
import QRScanner from "./QRScanner";
import { playSuccessSound, playErrorSound, playWarningSound } from "../utils/audio";
import { Siswa, Absensi, Settings, Mapel } from "../types";
import Logo from "./Logo";
import { Clock, LogIn, User, CheckCircle, AlertCircle, Bookmark, ShieldAlert, BookOpen } from "lucide-react";

interface ScannerTabProps {
  onOpenLogin: () => void;
  settings: Settings;
  recentScans: Array<{ student: Siswa; attendance: Absensi }>;
  mapelList: Mapel[];
  onNewScan: (student: Siswa, attendance: Absensi) => void;
}

export default function ScannerTab({ onOpenLogin, settings, recentScans, mapelList, onNewScan }: ScannerTabProps) {
  const [timeState, setTimeState] = useState<Date>(new Date());
  
  // Get active subjects
  const activeMapels = mapelList.filter(m => m.aktif);

  // Subject selected in the screen
  const [selectedMapel, setSelectedMapel] = useState<string>("");

  useEffect(() => {
    if (activeMapels.length > 0) {
      if (!selectedMapel || !activeMapels.some(m => m.nama === selectedMapel)) {
        setSelectedMapel(activeMapels[0].nama);
      }
    } else {
      setSelectedMapel("Matematika");
    }
  }, [mapelList, selectedMapel]);

  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    student?: Siswa;
    attendance?: Absensi;
    show: boolean;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Digital clock ticking effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeState(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle auto-fade-out of scanned student banner toast
  useEffect(() => {
    if (scanResult && scanResult.show) {
      const toastTimer = setTimeout(() => {
        setScanResult((prev) => (prev ? { ...prev, show: false } : null));
      }, 5000);
      return () => clearTimeout(toastTimer);
    }
  }, [scanResult]);

  const handleScanSuccess = async (qrData: string) => {
    if (isLoading) return; // Prevent parsing bursts
    setIsLoading(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData, mapel: selectedMapel }),
      });

      const resData = await response.json();

      if (response.ok) {
        if (resData.success) {
          // Play success chime sound
          playSuccessSound();
          setScanResult({
            success: true,
            message: resData.message,
            student: resData.student,
            attendance: resData.attendance,
            show: true,
          });
          // Update the localized logs if server SSE doesn't push fast enough
          onNewScan(resData.student, resData.attendance);
        } else {
          // Student exists but is a double scan preventing forgery
          playWarningSound();
          setScanResult({
            success: false,
            message: resData.message,
            student: resData.student,
            show: true,
          });
        }
      } else {
        // QR text not associated with any recorded student
        playErrorSound();
        setScanResult({
          success: false,
          message: resData.message || "Gagal memproses QR Code.",
          show: true,
        });
      }
    } catch (err: any) {
      console.error("Scan dispatch failed:", err);
      playErrorSound();
      setScanResult({
        success: false,
        message: "Gagal tersambung ke server absensi.",
        show: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanFailure = (err: string) => {
    // Keep it silent because html5-qrcode scans multiple times per second and fires errors
  };

  // Human-formatted date
  const formatTanggalIndo = (date: Date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName}, ${day} ${monthName} ${year}`;
  };

  return (
    <div id="scanner-view-box" className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo variant="icon" className="w-10 h-10 drop-shadow-md shrink-0" />
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">{settings.namaSekolah} <span className="text-indigo-400">QR</span></h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">TAP SCAN CARD • LIVE ATTENDANCE MONITORING</p>
          </div>
        </div>

        <button
          onClick={onOpenLogin}
          id="btn-goto-login"
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border border-slate-700 hover:border-indigo-500/30 shadow-md cursor-pointer"
        >
          <LogIn className="h-4 w-4" />
          MASUK DASHBOARD GURU
        </button>
      </header>

      {/* Main Split Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Hardware Scanning Viewport */}
        <section className="lg:col-span-5 space-y-6">
          
          {/* Dynamic Interactive Master Clock */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <span className="text-indigo-400 font-mono text-xs tracking-widest font-semibold uppercase flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 animate-pulse text-indigo-400" /> WAKTU ABSENSI SEKARANG
            </span>
            <span className="text-white text-4xl sm:text-5xl font-extrabold font-mono tracking-tighter tabular-nums drop-shadow-lg">
              {timeState.toLocaleTimeString("id-ID", { hourCycle: "h23" })}
            </span>
            <span className="text-slate-400 text-xs mt-2 font-medium">
              {formatTanggalIndo(timeState)}
            </span>
            <div className="mt-4 flex items-center gap-3 text-[11px] bg-slate-950 py-2 px-4 rounded-full border border-slate-800/80 text-slate-400">
              <span>Jam Masuk Batas: <b className="text-slate-200 font-mono">{settings.jamMasuk} WIB</b></span>
              <span className="text-slate-700">|</span>
              <span className="text-indigo-400 font-bold tracking-wide animate-pulse">LIVE SYNC</span>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 w-full text-left bg-slate-950/80 p-4 rounded-xl border border-slate-800/80">
              <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-mono font-bold block mb-1">JADWAL & BATAS ABSENSI SESI</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[10px] pb-1 border-b border-slate-900 uppercase font-mono text-slate-500 font-bold tracking-wider">
                  <span>Sesi / Mapel</span>
                  <div className="flex gap-5 font-mono">
                    <span className="w-10 text-right">Mulai</span>
                    <span className="w-10 text-right">Batas</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-[11px] py-0.5">
                  <span className="text-slate-300 font-medium truncate max-w-[130px]">{settings.mapel1_judul || "Mapel Pertama"}</span>
                  <div className="flex gap-5 font-mono text-[11px]">
                    <span className="w-10 text-right text-sky-400">{settings.mapel1_mulai || "06:00"}</span>
                    <b className="w-10 text-right text-emerald-400">{settings.mapel1_jam || "07:15"}</b>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] py-0.5 border-t border-slate-900/60 pt-1">
                  <span className="text-slate-300 font-medium truncate max-w-[130px]">{settings.mapel2_judul || "Mapel Kedua"}</span>
                  <div className="flex gap-5 font-mono text-[11px]">
                    <span className="w-10 text-right text-sky-400">{settings.mapel2_mulai || "08:30"}</span>
                    <b className="w-10 text-right text-emerald-400">{settings.mapel2_jam || "10:15"}</b>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] py-0.5 border-t border-slate-900/60 pt-1">
                  <span className="text-slate-300 font-medium truncate max-w-[130px]">{settings.mapel3_judul || "Mapel Ketiga"}</span>
                  <div className="flex gap-5 font-mono text-[11px]">
                    <span className="w-10 text-right text-sky-400">{settings.mapel3_mulai || "11:30"}</span>
                    <b className="w-10 text-right text-emerald-400">{settings.mapel3_jam || "13:15"}</b>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] py-0.5 border-t border-slate-900/60 pt-1">
                  <span className="text-slate-300 font-medium truncate max-w-[130px]">{settings.mapel4_judul || "Mapel Keempat"}</span>
                  <div className="flex gap-5 font-mono text-[11px]">
                    <span className="w-10 text-right text-sky-400">{settings.mapel4_mulai || "13:45"}</span>
                    <b className="w-10 text-right text-emerald-400">{settings.mapel4_jam || "14:10"}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Subject Selector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-indigo-400">
              <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/25">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block leading-none">Mata Pelajaran Aktif</span>
                <span className="text-white text-xs font-semibold">Absensi terikat dengan pelajaran terpilih</span>
              </div>
            </div>
            
            <div className="space-y-1.5 focus-within:ring-1 focus-within:ring-indigo-500 rounded-xl transition duration-150">
              <select
                id="select-subject-scanner"
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className="w-full bg-slate-950 text-white font-bold rounded-xl py-3 px-3.5 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-xs tracking-wide transition cursor-pointer"
              >
                {activeMapels.length === 0 ? (
                  <option value="Matematika">Matematika</option>
                ) : (
                  activeMapels.map((mapel) => (
                    <option key={mapel.nama} value={mapel.nama} className="font-semibold text-slate-200">
                      MAPEL: {mapel.nama.toUpperCase()}
                    </option>
                  ))
                )}
              </select>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              * Siswa yang memindai kartu QR akan langsung tercatat khusus pada pelajaran ini. Siswa diperbolehkan memindai ulang untuk pelajaran yang berbeda di hari yang sama.
            </p>
          </div>

          {/* Camera QR Card */}
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onScanFailure={handleScanFailure}
          />
        </section>

        {/* Right Side: Scan Response Banner Details & Live Activity Feed */}
        <section className="lg:col-span-7 space-y-6 flex flex-col h-full self-stretch justify-start">
          
          {/* Dynamic Scanning Pop-up Toast Details (Anchored on status scan) */}
          <div className="min-h-[160px] flex items-center justify-center relative">
            {scanResult && scanResult.show ? (
              <div
                id="live-scan-banner"
                className={`w-full border p-6 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-5 transition duration-300 animate-in fade-in slide-in-from-top-4 ${
                  scanResult.success
                    ? scanResult.attendance?.status === "Hadir"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-100"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-100"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-100"
                }`}
              >
                {/* Simulated Student Dynamic Rounded Avatar */}
                <div className={`h-16 w-16 shrink-0 rounded-xl flex items-center justify-center text-xl font-bold shadow-md ${
                  scanResult.success
                    ? scanResult.attendance?.status === "Hadir"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}>
                  {scanResult.student ? (
                    scanResult.student.nama.charAt(0) + (scanResult.student.nama.split(" ")[1]?.charAt(0) || "")
                  ) : (
                    <ShieldAlert className="h-8 w-8 text-rose-400" />
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-white font-bold text-lg">
                      {scanResult.student ? scanResult.student.nama : "KARTU SALAH / TIDAK VALID"}
                    </span>
                    {scanResult.success && scanResult.attendance && (
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md ${
                        scanResult.attendance.status === "Hadir"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                        {scanResult.attendance.status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 drop-shadow-sm font-medium">
                    {scanResult.message}
                  </p>

                  {scanResult.student && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-400 font-mono mt-1">
                      <span>NIS: <b className="text-white">{scanResult.student.nis}</b></span>
                      <span>Kelas: <b className="text-white">{scanResult.student.kelas}</b></span>
                      {scanResult.attendance && (
                        <>
                          <span>Waktu: <b className="text-indigo-400">{scanResult.attendance.jam} WIB</b></span>
                          <span>Pelajaran: <b className="text-indigo-400">{scanResult.attendance.mapel || "Matematika"}</b></span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Indicator Icon */}
                <div className="shrink-0 pointer-events-none">
                  {scanResult.success ? (
                    <CheckCircle className="h-12 w-12 text-emerald-400 animate-pulse drop-shadow" />
                  ) : (
                    <AlertCircle className="h-12 w-12 text-rose-400 animate-bounce drop-shadow" />
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full bg-slate-900/25 border border-slate-800 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center text-slate-500 py-10 shadow-inner">
                <div className="w-12 h-12 rounded-xl bg-slate-800/40 flex items-center justify-center mb-3 text-slate-600">
                  <Bookmark className="h-6 w-6 animate-pulse text-indigo-500/50" />
                </div>
                <h5 className="font-semibold text-slate-300 text-sm">Menunggu Imbasan Kartu QR</h5>
                <p className="text-slate-500 text-xs mt-1 max-w-[280px]">
                  Tunjukkan kode QR absen Anda ke depan kamera untuk mencatat jam kehadiran.
                </p>
              </div>
            )}
          </div>

          {/* Real-time Attendance Feed Box */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col flex-1 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-400 font-medium animate-pulse flex items-center gap-1.5">
                  <span className="w-2h-2 rounded-full bg-indigo-500 w-2.5 h-2.5"></span>
                </span>
                <h4 className="text-white text-sm font-bold tracking-tight uppercase">AKTIVITAS TERKINI (HARI INI)</h4>
              </div>
              <span className="text-[10px] text-indigo-400 font-mono font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">{recentScans.length} SISWA TERCATAT</span>
            </div>

            <div className="overflow-y-auto space-y-3 max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {recentScans.length === 0 ? (
                <div className="py-12 text-center text-slate-600 text-xs flex flex-col items-center justify-center">
                  <User className="h-6 w-6 text-slate-800 mb-1" />
                  Belum ada siswa yang melakukan absensi hari ini.
                </div>
              ) : (
                recentScans.map((log, idx) => (
                  <div
                    key={`${log.attendance.id}-${idx}`}
                    className="flex items-center justify-between p-4 bg-slate-850/50 hover:bg-slate-800/60 rounded-xl border border-slate-700/50 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                        {log.student.nama.charAt(0) + (log.student.nama.split(" ")[1]?.charAt(0) || "")}
                      </div>

                      <div className="text-left">
                        <p className="text-white text-sm font-semibold">{log.student.nama}</p>
                        <p className="text-xs text-slate-500 italic">
                          {log.student.kelas} • NIS: {log.student.nis} • Pelajaran: <b className="text-indigo-400/80 font-bold not-italic">{log.attendance.mapel || "Matematika"}</b>
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          log.attendance.status === "Hadir"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                        }`}>
                          {log.attendance.status === "Hadir" ? "Tepat Waktu" : "Terlambat"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-450 font-mono">{log.attendance.jam}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </main>

      <footer className="py-5 border-t border-slate-800/80 bg-slate-950 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-auto">
        {settings.namaSekolah} • SANS QR-ABSENSI CONTROLLER V1.0 • ALL CHANNELS SECURE
      </footer>

    </div>
  );
}
