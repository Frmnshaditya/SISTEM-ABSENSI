import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, AlertTriangle, RefreshCw, QrCode, Sparkles } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure: (errorMessage: string) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // States for student simulator fallback
  const [siswaOptions, setSiswaOptions] = useState<any[]>([]);
  const [selectedSimSiswa, setSelectedSimSiswa] = useState<string>("");
  const [showSimPanel, setShowSimPanel] = useState<boolean>(false);

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-container";

  // Fetch registered students to feed the instant emulator fallback list
  useEffect(() => {
    fetch("/api/siswa")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSiswaOptions(data);
          if (data.length > 0) {
            setSelectedSimSiswa(data[0].qrCodeData || `ABS-${data[0].nis}`);
          }
        }
      })
      .catch((err) => console.error("Gagal memuat siswa untuk simulasi:", err));
  }, []);

  // Check camera permissions and retrieve available inputs
  useEffect(() => {
    let testStream: MediaStream | null = null;

    async function initCameraSequence() {
      try {
        setScannerError(null);
        
        // Secure context guard and fallback trigger
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // Explicitly trigger standard browser query
          testStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available, otherwise first camera
          const backCamera = devices.find(
            (device) =>
              device.label.toLowerCase().includes("back") ||
              device.label.toLowerCase().includes("rear") ||
              device.label.toLowerCase().includes("environment")
          );
          setActiveCameraId(backCamera ? backCamera.id : devices[0].id);
          setHasPermission(true);
        } else {
          setHasPermission(false);
          setScannerError("Kamera fisik tidak terdeteksi atau tidak diizinkan.");
        }
      } catch (err: any) {
        console.warn("Camera check returned with warning:", err);
        setHasPermission(false);
        setScannerError("Akses kamera ditolak atau dibatasi oleh sandbox browser.");
      } finally {
        // Release initial test track so camera isn't locked by the browser test hook
        if (testStream) {
          testStream.getTracks().forEach((track) => track.stop());
        }
      }
    }

    initCameraSequence();

    return () => {
      // Clean up scanning active instances when component unmounts
      stopScanning();
    };
  }, []);

  // Trigger scanning whenever camera device selection is active
  useEffect(() => {
    if (activeCameraId && hasPermission && !isScanning) {
      startScanning(activeCameraId);
    }
  }, [activeCameraId, hasPermission]);

  const startScanning = async (cameraId: string) => {
    try {
      setScannerError(null);
      // Wait a tiny moment to ensure previous element is clean
      await stopScanning();

      const html5QrCode = new Html5Qrcode(scannerId);
      qrCodeInstanceRef.current = html5QrCode;

      setIsScanning(true);

      await html5QrCode.start(
        cameraId,
        {
          fps: 12,
          qrbox: (width, height) => {
            // Responsive box sizing
            const side = Math.min(width, height) * 0.65;
            return { width: Math.max(side, 180), height: Math.max(side, 180) };
          },
        },
        (decodedText) => {
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // General noisy scanner frame warnings, avoid polluting general user logs
          onScanFailure(errorMessage);
        }
      );
    } catch (err: any) {
      console.error("Failed to start scanning on selected camera:", err);
      setIsScanning(false);
      setScannerError(`Gagal membaca kamera: ${err?.message || err}`);
    }
  };

  const stopScanning = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (err) {
        console.warn("Error stopping scanner instance during recycle:", err);
      }
    }
    qrCodeInstanceRef.current = null;
    setIsScanning(false);
  };

  const toggleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setActiveCameraId(nextCamera.id);
  };

  return (
    <div id="qr-scanner-element-card" className="relative flex flex-col items-center justify-center w-full max-w-sm mx-auto overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5">
      
      {/* Absolute top badge indicators */}
      <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isScanning ? 'bg-indigo-400' : 'bg-red-400'} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isScanning ? 'bg-indigo-500' : 'bg-red-500'}`}></span>
        </span>
        <span className="text-white text-[10px] font-mono font-bold drop-shadow bg-slate-950/80 py-1 px-2.5 rounded-md border border-slate-800">
          {isScanning ? "CAMERA FEED ACTIVE" : "OFFLINE"}
        </span>
      </div>

      {/* Cameras switch button if multiple */}
      {cameras.length > 1 && (
        <button
          onClick={toggleCamera}
          id="btn-switch-camera"
          className="absolute top-5 right-5 z-10 p-2 bg-slate-950/80 hover:bg-slate-950 text-indigo-400 rounded-lg border border-slate-800 transition duration-150 backdrop-blur-md cursor-pointer"
          title="Ganti Lensa Kamera"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      )}

      {/* Main video scan portal content */}
      <div className="relative w-full aspect-square bg-slate-950 rounded-xl flex items-center justify-center overflow-hidden border border-slate-800/80 mt-10">
        <div id={scannerId} className="w-full h-full object-cover [&>video]:object-cover" />

        {/* Fancy Overlay Guidelines */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark mask overlays for standard center box framing visual */}
            <div className="absolute inset-0 border-[32px] sm:border-[48px] border-slate-950/60 flex items-center justify-center">
              
              {/* Dynamic scan corners */}
              <div className="absolute inset-0 w-full h-full">
                {/* TL corner */}
                <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                {/* TR corner */}
                <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                {/* BL corner */}
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                {/* BR corner */}
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>

                {/* Pulsing indigo laser tracking line */}
                <div className="absolute left-0 right-0 w-full h-[2px] bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] top-1/2 -translate-y-1/2 opacity-50" />
              </div>

            </div>
          </div>
        )}

        {/* State fallbacks for loading / errors / permission issues */}
        {hasPermission === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-6 text-center">
            <Camera className="h-10 w-10 text-indigo-400 animate-pulse mb-3" />
            <h4 className="text-white text-sm font-semibold">Mengakses Kamera...</h4>
            <p className="text-xs text-slate-500 mt-1">Mohon berikan izin akses kamera/webcam pada browser.</p>
          </div>
        )}

        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-1000 p-5 text-center overflow-y-auto">
            <CameraOff className="h-9 w-9 text-rose-500 mb-2 animate-pulse" />
            <h4 className="text-white text-xs font-semibold">Akses Kamera Terhambat</h4>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[250px] leading-relaxed">
              Izin ditolak atau dibatasi oleh browser. Tapi tenang, Anda tetap bisa mengetes absensi memakai simulasi di bawah ini!
            </p>

            <div className="mt-3.5 w-full bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2 text-left">
              <span className="text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider block flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Sandbox Absen Simulator
              </span>
              <div className="space-y-2">
                <select
                  value={selectedSimSiswa}
                  onChange={(e) => setSelectedSimSiswa(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-800 outline-none font-medium focus:border-indigo-500"
                >
                  {siswaOptions.map((s) => (
                    <option key={s.id} value={s.qrCodeData || `ABS-${s.nis}`}>
                      [{s.kelas}] {s.nama}
                    </option>
                  ))}
                  {siswaOptions.length === 0 && (
                    <option value="">(Belum ada data siswa)</option>
                  )}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedSimSiswa) {
                      onScanSuccess(selectedSimSiswa);
                    }
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-extrabold py-2 px-3 rounded-lg transition-all duration-155 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>SIMULASIKAN TAP PRESENSI</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {scannerError && hasPermission !== false && (
          <div className="absolute bottom-4 left-4 right-4 z-10 flex items-start gap-2 bg-red-950/95 border border-red-800 p-2.5 rounded-lg text-xs text-red-200 backdrop-blur-md">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span>{scannerError}</span>
          </div>
        )}
      </div>

      <div className="w-full mt-4 text-center space-y-3.5">
        <p className="text-slate-400 text-xs">Posisikan kode QR Siswa tepat di tengah bingkai pendeteksian</p>
        
        {/* Instant test selector if they want simple click simulation even when camera works */}
        <div className="pt-2 border-t border-slate-850/50">
          <button
            type="button"
            onClick={() => setShowSimPanel(!showSimPanel)}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto py-1 px-2.5 rounded bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10"
          >
            <Sparkles className="h-3 w-3" />
            <span>{showSimPanel ? "Sembunyikan Panel Simulasi" : "Gunakan Panel Simulasi (Demo)"}</span>
          </button>

          {showSimPanel && (
            <div className="mt-3.5 bg-slate-950/50 border border-slate-850 p-3 rounded-xl space-y-2 text-left animate-in fade-in duration-300">
              <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider">Fast Scan Simulator</span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Gunakan dropdown ini untuk langsung memicu proses absen siswa tanpa perlu lembar printout QR:
              </p>
              
              <div className="flex gap-2">
                <select
                  value={selectedSimSiswa}
                  onChange={(e) => setSelectedSimSiswa(e.target.value)}
                  className="flex-1 bg-slate-900 text-white rounded-lg p-1.5 text-xs border border-slate-800 outline-none font-medium"
                >
                  {siswaOptions.map((s) => (
                    <option key={s.id} value={s.qrCodeData || `ABS-${s.nis}`}>
                      [{s.kelas}] {s.nama}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedSimSiswa) {
                      onScanSuccess(selectedSimSiswa);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <span>Tap</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
