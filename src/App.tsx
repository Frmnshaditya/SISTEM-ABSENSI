import { useState, useEffect } from "react";
import { User, Siswa, Absensi, Settings, AttendanceStats, Mapel } from "./types";
import ScannerTab from "./components/ScannerTab";
import TeacherDashboard from "./components/TeacherDashboard";
import LoginModal from "./components/LoginModal";
import Logo from "./components/Logo";
import { Sparkles, Users, Lock, ChevronRight, CornerDownRight, Landmark, Sun, Moon } from "lucide-react";

export default function App() {
  // Navigation mode states: "public" (scanner terminal) vs "guru" (workstation dashboard)
  const [viewMode, setViewMode] = useState<"public" | "guru">("public");
  
  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("app_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    localStorage.setItem("app_theme", theme);
  }, [theme]);
  
  // Authentication states
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("guru_session_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("guru_session_token");
  });

  // Database core states
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [settings, setSettings] = useState<Settings>({
    jamMasuk: "07:15",
    namaSekolah: "SMA IT CORDOVA 174",
  });
  const [stats, setStats] = useState<AttendanceStats>({
    totalSiswa: 0,
    hadir: 0,
    terlambat: 0,
    belumHadir: 0,
    todayStr: new Date().toISOString().split("T")[0],
  });

  const [isLoading, setIsLoading] = useState(true);

  // Read data from Server
  const fetchData = async () => {
    try {
      // 1. Fetch current settings configuration
      const settingsResp = await fetch("/api/settings");
      if (settingsResp.ok) {
        const sData = await settingsResp.json();
        setSettings(sData);
      }

      // 1.5 Fetch subjects (Mata Pelajaran)
      const mapelResp = await fetch("/api/mapel");
      if (mapelResp.ok) {
        const mList = await mapelResp.json();
        setMapelList(mList);
      }

      // 2. Fetch student list
      const siswaResp = await fetch("/api/siswa");
      if (siswaResp.ok) {
        const sList = await siswaResp.json();
        setSiswaList(sList);
      }

      // 3. Fetch attendance history
      const absensiResp = await fetch("/api/absensi");
      if (absensiResp.ok) {
        const aList = await absensiResp.json();
        setAbsensiList(aList);
      }

      // 4. Fetch summary stats
      const statsResp = await fetch("/api/stats");
      if (statsResp.ok) {
        const statsData = await statsResp.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to query fullstack data records:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // On mount: fetch registers and bind real-time Server-Sent Events listener
  useEffect(() => {
    fetchData();

    // Establish persistent, event-driven realtime stream directly to backend Express SSE
    const eventSource = new EventSource("/api/events");

    eventSource.onopen = () => {
      console.log("[ABSENSI-SSE] Stream pipeline successfully opened.");
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log("[ABSENSI-SSE] Received live broadcast event:", payload.type);

        // Instantly reload local list files without manual page refreshing!
        if (
          payload.type === "SCAN_SUCCESS" ||
          payload.type === "SISWA_ADDED" ||
          payload.type === "SISWA_DELETED" ||
          payload.type === "SISWA_IMPORTED" ||
          payload.type === "DATABASE_RESET" ||
          payload.type === "ABSENSI_CLEARED"
        ) {
          fetchData();
        }
      } catch (err) {
        console.error("Error reading event stream payload:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("[ABSENSI-SSE] Connection error. Standard fallback reconnect retry in index...", err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleLoginSuccess = (user: User, token: string) => {
    setLoggedInUser(user);
    setToken(token);
    localStorage.setItem("guru_session_user", JSON.stringify(user));
    localStorage.setItem("guru_session_token", token);
    setViewMode("guru"); // Automatically forward logged in Guru to administrative dashboard!
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setToken(null);
    localStorage.removeItem("guru_session_user");
    localStorage.removeItem("guru_session_token");
    setViewMode("public"); // Return to unattended scanner
  };

  // Extract a live feed of today's scans for public terminal scrolling
  const getTodayRecentScans = () => {
    const today = stats.todayStr;
    return absensiList
      .filter((a) => a.tanggal === today)
      .map((a) => {
        const student = siswaList.find((s) => s.id === a.siswaId) || {
          id: a.siswaId,
          nama: "Siswa Terhapus",
          kelas: "N/A",
          nis: "N/A",
          qrCodeData: "",
        };
        return { student, attendance: a };
      })
      .reverse(); // Newest scans at the top!
  };

  const handleNewScanLocally = (scannedStudent: Siswa, attendanceLog: Absensi) => {
    // Append scanned info instantly to help reactivity if network latencies arise
    setAbsensiList((prev) => [attendanceLog, ...prev]);
    fetchData(); // Trigger fresh background state fetch too
  };

  if (isLoading) {
    return (
      <div id="full-spinner" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans space-y-3">
        <div className="h-12 w-12 rounded-2xl border-4 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-white text-xs font-semibold uppercase tracking-widest font-mono text-emerald-400">
          MEMUAT DATABASE ABSENSI...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans select-none antialiased">
      
      {/* Absolute top dashboard mode warning toolbar for easier preview testing */}
      <div className="bg-slate-900 border-b border-slate-800 py-2.5 px-6 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Logo variant="icon" className="h-4 w-4 shrink-0" />
          <span><b>SISTEM ABSENSI CORDOVA 174</b> • Status Database: <b className="text-emerald-400">AKTIF (JSON)</b></span>
        </div>

        {/* View Toggle pills & Theme Switcher */}
        <div className="flex items-center gap-3">
          {/* Theme Switcher Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="py-1 px-2.5 bg-slate-950 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition duration-150 flex items-center gap-1.5 font-bold cursor-pointer hover:bg-slate-900"
            title="Ganti Tema (Gelap/Terang)"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400 animate-spin-slow" />
                <span className="text-[10px] uppercase">bright</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-[10px] uppercase">dark</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode("public")}
            id="pill-view-public"
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition duration-150 cursor-pointer ${
              viewMode === "public"
                ? "bg-slate-100 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Terminal Scan QR
          </button>
          
          <button
            onClick={() => {
              if (loggedInUser) {
                setViewMode("guru");
              } else {
                setIsLoginOpen(true);
              }
            }}
            id="pill-view-guru"
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition duration-150 cursor-pointer flex items-center gap-1 ${
              viewMode === "guru"
                ? "bg-slate-150 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {!loggedInUser && <Lock className="h-2.5 w-2.5 mr-0.5" />}
            Portal Guru / Admin
          </button>
        </div>
      </div>
    </div>

      {/* Main Content Layout routing */}
      {viewMode === "public" ? (
        <ScannerTab
          settings={settings}
          recentScans={getTodayRecentScans()}
          mapelList={mapelList}
          onOpenLogin={() => {
            if (loggedInUser) {
              setViewMode("guru");
            } else {
              setIsLoginOpen(true);
            }
          }}
          onNewScan={handleNewScanLocally}
        />
      ) : (
        loggedInUser && (
          <TeacherDashboard
            user={loggedInUser}
            onLogout={handleLogout}
            settings={settings}
            onUpdateSettings={(newSettings) => setSettings(newSettings)}
            siswaList={siswaList}
            absensiList={absensiList}
            mapelList={mapelList}
            stats={stats}
            onRefreshData={fetchData}
          />
        )
      )}

      {/* Pop-up global Teacher Login overlay */}
      {isLoginOpen && (
        <LoginModal
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

    </div>
  );
}
