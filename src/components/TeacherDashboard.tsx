import React, { useState, useEffect } from "react";
import { Siswa, Absensi, Settings, AttendanceStats, User, Mapel } from "../types";
import { playSuccessSound, playWarningSound, playErrorSound } from "../utils/audio";
import Logo from "./Logo";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Plus,
  Trash2,
  FileDown,
  Printer,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  Database,
  Grid,
  Sparkles,
  UploadCloud,
  QrCode,
  ArrowRight,
  HelpCircle,
  FileSpreadsheet,
  BookOpen
} from "lucide-react";

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
  siswaList: Siswa[];
  absensiList: Absensi[];
  mapelList: Mapel[];
  stats: AttendanceStats;
  onRefreshData: () => Promise<void>;
}

export default function TeacherDashboard({
  user,
  onLogout,
  settings,
  onUpdateSettings,
  siswaList,
  absensiList,
  mapelList,
  stats,
  onRefreshData,
}: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<"ringkasan" | "siswa" | "laporan" | "pengaturan">("ringkasan");
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("Semua Kelas");
  const [mapelFilter, setMapelFilter] = useState("Semua Mapel");

  // Local form state for student creation
  const [newSiswaName, setNewSiswaName] = useState("");
  const [newSiswaClass, setNewSiswaClass] = useState("XII-IPA-1");
  const [newSiswaNis, setNewSiswaNis] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Excel bulk import states
  const [excelFileError, setExcelFileError] = useState<string | null>(null);
  const [pendingImports, setPendingImports] = useState<any[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // ID Cards Preview popup
  const [activeQrModal, setActiveQrModal] = useState<Siswa | null>(null);

  // Settings Local states
  const [localSchoolName, setLocalSchoolName] = useState(settings.namaSekolah);
  const [localJamMasuk, setLocalJamMasuk] = useState(settings.jamMasuk);
  const [localMapel1Judul, setLocalMapel1Judul] = useState(settings.mapel1_judul || "Mapel Pertama");
  const [localMapel1Mulai, setLocalMapel1Mulai] = useState(settings.mapel1_mulai || "06:00");
  const [localMapel1Jam, setLocalMapel1Jam] = useState(settings.mapel1_jam || "07:15");
  const [localMapel2Judul, setLocalMapel2Judul] = useState(settings.mapel2_judul || "Mapel Kedua");
  const [localMapel2Mulai, setLocalMapel2Mulai] = useState(settings.mapel2_mulai || "08:30");
  const [localMapel2Jam, setLocalMapel2Jam] = useState(settings.mapel2_jam || "10:15");
  const [localMapel3Judul, setLocalMapel3Judul] = useState(settings.mapel3_judul || "Mapel Ketiga");
  const [localMapel3Mulai, setLocalMapel3Mulai] = useState(settings.mapel3_mulai || "11:30");
  const [localMapel3Jam, setLocalMapel3Jam] = useState(settings.mapel3_jam || "13:15");
  const [localMapel4Judul, setLocalMapel4Judul] = useState(settings.mapel4_judul || "Mapel Keempat");
  const [localMapel4Mulai, setLocalMapel4Mulai] = useState(settings.mapel4_mulai || "13:45");
  const [localMapel4Jam, setLocalMapel4Jam] = useState(settings.mapel4_jam || "14:10");
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    setLocalSchoolName(settings.namaSekolah);
    setLocalJamMasuk(settings.jamMasuk);
    setLocalMapel1Judul(settings.mapel1_judul || "Mapel Pertama");
    setLocalMapel1Mulai(settings.mapel1_mulai || "06:00");
    setLocalMapel1Jam(settings.mapel1_jam || "07:15");
    setLocalMapel2Judul(settings.mapel2_judul || "Mapel Kedua");
    setLocalMapel2Mulai(settings.mapel2_mulai || "08:30");
    setLocalMapel2Jam(settings.mapel2_jam || "10:15");
    setLocalMapel3Judul(settings.mapel3_judul || "Mapel Ketiga");
    setLocalMapel3Mulai(settings.mapel3_mulai || "11:30");
    setLocalMapel3Jam(settings.mapel3_jam || "13:15");
    setLocalMapel4Judul(settings.mapel4_judul || "Mapel Keempat");
    setLocalMapel4Mulai(settings.mapel4_mulai || "13:45");
    setLocalMapel4Jam(settings.mapel4_jam || "14:10");
  }, [settings]);

  // General loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scanner Simulator States
  const [simulatorStudentId, setSimulatorStudentId] = useState<string>("");
  const [simulatorTime, setSimulatorTime] = useState<string>("07:05");
  const [simulatorMapel, setSimulatorMapel] = useState(() => mapelList[0]?.nama || "Matematika");
  const [simulatorSesi, setSimulatorSesi] = useState<string>("");
  const [simulationResponse, setSimulationResponse] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (mapelList.length > 0 && !simulatorMapel) {
      setSimulatorMapel(mapelList[0].nama);
    }
  }, [mapelList]);

  // Class management states
  const [kelas, setKelas] = useState<string[]>([]);
  const [newClassNameForm, setNewClassNameForm] = useState("");
  const [classError, setClassError] = useState<string | null>(null);
  const [classSuccess, setClassSuccess] = useState<string | null>(null);

  // Subject (Mata Pelajaran) management states
  const [mapelListState, setMapelListState] = useState<Mapel[]>([]);
  const [newMapelName, setNewMapelName] = useState("");
  const [mapelError, setMapelError] = useState<string | null>(null);
  const [mapelSuccess, setMapelSuccess] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/kelas");
      if (response.ok) {
        const data = await response.json();
        setKelas(data);
      }
    } catch (err) {
      console.error("Gagal memuat daftar kelas:", err);
    }
  };

  const fetchMapels = async () => {
    try {
      const response = await fetch("/api/mapel");
      if (response.ok) {
        const data = await response.json();
        setMapelListState(data);
      }
    } catch (err) {
      console.error("Gagal memuat daftar mata pelajaran:", err);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchMapels();
  }, [siswaList, absensiList]);

  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassError(null);
    setClassSuccess(null);

    const cleanName = newClassNameForm.trim().toUpperCase();
    if (!cleanName) {
      setClassError("Nama kelas tidak boleh kosong!");
      return;
    }

    try {
      const resp = await fetch("/api/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: cleanName }),
      });
      const data = await resp.json();

      if (resp.ok && data.success) {
        setClassSuccess(`Kelas "${cleanName}" berhasil ditambahkan!`);
        setNewClassNameForm("");
        await fetchClasses();
        await onRefreshData();
      } else {
        setClassError(data.message || "Gagal menambahkan kelas baru.");
      }
    } catch (err) {
      setClassError("Gagal menghubungi server database.");
    }
  };

  const handleDeleteClass = async (className: string) => {
    setClassError(null);
    setClassSuccess(null);

    const count = siswaList.filter((s) => s.kelas === className).length;
    if (count > 0) {
      setClassError(`Gagal menghapus! Kelas "${className}" masih memiliki ${count} siswa aktif. Pindahkan/hapus siswa terlebih dahulu.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus kelas "${className}"?`)) {
      return;
    }

    try {
      const resp = await fetch(`/api/kelas/${encodeURIComponent(className)}`, {
        method: "DELETE",
      });
      const data = await resp.json();

      if (resp.ok && data.success) {
        setClassSuccess(`Kelas "${className}" berhasil dihapus!`);
        await fetchClasses();
        if (classFilter === className) {
          setClassFilter("Semua Kelas");
        }
        await onRefreshData();
      } else {
        setClassError(data.message || "Gagal menghapus kelas.");
      }
    } catch (err) {
      setClassError("Gagal menghubungi server database.");
    }
  };

  const handleAddMapelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapelError(null);
    setMapelSuccess(null);

    const cleanName = newMapelName.trim();
    if (!cleanName) {
      setMapelError("Nama mata pelajaran tidak boleh kosong!");
      return;
    }

    try {
      const resp = await fetch("/api/mapel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: cleanName }),
      });
      const data = await resp.json();

      if (resp.ok && data.success) {
        setMapelSuccess(`Mata pelajaran "${cleanName}" berhasil ditambahkan!`);
        setNewMapelName("");
        await fetchMapels();
        await onRefreshData();
      } else {
        setMapelError(data.message || "Gagal menambahkan mata pelajaran.");
      }
    } catch (err) {
      setMapelError("Gagal menghubungi server database.");
    }
  };

  const handleDeleteMapel = async (mapelName: string) => {
    setMapelError(null);
    setMapelSuccess(null);

    const count = absensiList.filter((a) => (a.mapel || "Matematika").toLowerCase() === mapelName.toLowerCase()).length;
    if (count > 0) {
      setMapelError(`Gagal menghapus! Mata pelajaran "${mapelName}" masih digunakan oleh ${count} data riwayat absensi.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus mata pelajaran "${mapelName}"?`)) {
      return;
    }

    try {
      const resp = await fetch(`/api/mapel/${encodeURIComponent(mapelName)}`, {
        method: "DELETE",
      });
      const data = await resp.json();

      if (resp.ok && data.success) {
        setMapelSuccess(`Mata pelajaran "${mapelName}" berhasil dihapus!`);
        await fetchMapels();
        if (mapelFilter === mapelName) {
          setMapelFilter("Semua Mapel");
        }
        await onRefreshData();
      } else {
        setMapelError(data.message || "Gagal menghapus mata pelajaran.");
      }
    } catch (err) {
      setMapelError("Gagal menghubungi server database.");
    }
  };

  const handleToggleMapel = async (mapelName: string, activeState: boolean) => {
    setMapelError(null);
    setMapelSuccess(null);
    try {
      const resp = await fetch("/api/mapel/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: mapelName, aktif: activeState }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setMapelSuccess(`Mata pelajaran "${mapelName}" berhasil ${activeState ? "diaktifkan" : "dinonaktifkan"}!`);
        await fetchMapels();
        await onRefreshData();
      } else {
        setMapelError(data.message || "Gagal mengubah status mata pelajaran.");
      }
    } catch (err) {
      setMapelError("Gagal menghubungi server database.");
    }
  };

  // Extract unique classes dynamically
  const availableClasses = [
    "Semua Kelas",
    ...Array.from(new Set([...kelas, ...siswaList.map((s) => s.kelas)])).filter(Boolean).sort()
  ];

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!newSiswaName || !newSiswaNis || !newSiswaClass) {
      setFormError("Mohon lengkapi seluruh kolom formulir!");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: newSiswaName.trim(),
          kelas: newSiswaClass,
          nis: newSiswaNis.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFormSuccess(true);
        setNewSiswaName("");
        setNewSiswaNis("");
        await onRefreshData();
      } else {
        setFormError(data.message || "Gagal mendaftarkan siswa baru.");
      }
    } catch (err) {
      setFormError("Gagal terhubung dengan server database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data siswa "${name}"? Seluruh riwayat absen siswa bersangkutan juga akan dihapus.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/siswa/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await onRefreshData();
      } else {
        alert("Gagal menghapus siswa.");
      }
    } catch (err) {
      console.error("Delete call failed:", err);
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExcelFileError(null);
    setImportSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsName = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsName];
        const parsed: any[] = XLSX.utils.sheet_to_json(ws);

        if (parsed.length === 0) {
          setExcelFileError("File Excel kosong atau format kolom salah!");
          return;
        }

        // Harmonize headers (Siswa, Kelas, NIS) by matching synonyms
        const mappedList = parsed.map((row: any) => {
          const rowKeys = Object.keys(row);
          const findVal = (terms: string[]) => {
            const matchedKey = rowKeys.find((k) =>
              terms.includes(k.toLowerCase().trim())
            );
            return matchedKey ? row[matchedKey] : "";
          };

          return {
            nama: findVal(["nama", "nama siswa", "name", "student"]),
            kelas: findVal(["kelas", "class", "group"]),
            nis: findVal(["nis", "student number", "code", "no"]),
          };
        }).filter((item) => item.nama && item.nis);

        if (mappedList.length === 0) {
          setExcelFileError("Format kolom Excel tidak cocok! Wajib isi kolom 'nama', 'kelas', dan 'nis'.");
        } else {
          setPendingImports(mappedList);
        }
      } catch (err) {
        setExcelFileError("Error membaca file Excel. Pastikan format file valid (.xlsx)");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (pendingImports.length === 0) return;
    setIsSubmitting(true);

    try {
      const resp = await fetch("/api/siswa/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list: pendingImports }),
      });

      const data = await resp.json();
      if (resp.ok) {
        setImportSuccessMsg(data.message);
        setPendingImports([]);
        await onRefreshData();
      } else {
        setExcelFileError(data.message || "Gagal mengunggah data siswa.");
      }
    } catch (err) {
      setExcelFileError("Gagal terhubung dengan server database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(false);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jamMasuk: localJamMasuk,
          namaSekolah: localSchoolName,
          mapel1_judul: localMapel1Judul,
          mapel1_mulai: localMapel1Mulai,
          mapel1_jam: localMapel1Jam,
          mapel2_judul: localMapel2Judul,
          mapel2_mulai: localMapel2Mulai,
          mapel2_jam: localMapel2Jam,
          mapel3_judul: localMapel3Judul,
          mapel3_mulai: localMapel3Mulai,
          mapel3_jam: localMapel3Jam,
          mapel4_judul: localMapel4Judul,
          mapel4_mulai: localMapel4Mulai,
          mapel4_jam: localMapel4Jam,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onUpdateSettings(data.settings);
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      } else {
        alert(data.message || "Gagal menyimpan pengaturan.");
      }
    } catch (err) {
      alert("Koneksi gagal saat mengubah pengaturan!");
    }
  };

  const handleResetDatabase = async () => {
    if (
      !confirm(
        "Peringatan! Prosedur ini akan menghapus semua siswa buatan Anda dan mengembalikan daftar default dari sistem, serta menyetel ulang semua log absensi. Lanjutkan?"
      )
    ) {
      return;
    }

    try {
      const resp = await fetch("/api/siswa/reset-all", { method: "POST" });
      if (resp.ok) {
        alert("Database berhasil dipulihkan ke setelan default pabrik!");
        await onRefreshData();
      }
    } catch (err) {
      alert("Gagal mereset database.");
    }
  };

  const handleClearAttendanceLogs = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus SELURUH riwayat absensi dari ledger? Tindakan ini bersifat permanen.")) {
      return;
    }

    try {
      const resp = await fetch("/api/absensi/clear", { method: "DELETE" });
      if (resp.ok) {
        await onRefreshData();
        alert("Riwayat kehadiran berhasil dikosongkan!");
      }
    } catch (e) {
      alert("Gagal mengosongkan log.");
    }
  };

  // Dynamic high-res download for the entire Student ID Card layout (including metadata)
  const handleDownloadCard = async () => {
    const cardElement = document.getElementById("student-id-card-print-area");
    if (!cardElement) return;
    try {
      const canvas = await html2canvas(cardElement, {
        useCORS: true,
        allowTaint: true,
        scale: 3, // scale up by 3x for ultra high resolution
        backgroundColor: null,
        onclone: (clonedDoc) => {
          // Clean all style tags containing oklch color functions to prevent html2canvas parsing errors
          clonedDoc.querySelectorAll("style").forEach((styleEl) => {
            if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
              styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/g, "rgba(0, 0, 0, 0.1)");
            }
          });

          // Clean all elements' inline styles containing oklch
          clonedDoc.querySelectorAll("*").forEach((el: any) => {
            const styleAttr = el.getAttribute("style");
            if (styleAttr && styleAttr.includes("oklch")) {
              el.setAttribute("style", styleAttr.replace(/oklch\([^)]+\)/g, "rgba(0, 0, 0, 0.1)"));
            }
          });
        }
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Kartu_Identitas_Siswa_${activeQrModal?.nama?.replace(/\s+/g, "_") || "Siswa"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Gagal mengunduh kartu siswa:", error);
      alert("Terjadi kesalahan saat mengunduh gambar kartu.");
    }
  };

  // PDF Export using jsPDF with high end design
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Outer layout styles
    doc.setFillColor(15, 23, 42); // slate-900 background for top banner
    doc.rect(0, 0, 210, 38, "F");

    // Banner Text
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(settings.namaSekolah.toUpperCase(), 15, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("LAPORAN BULANAN KEHADIRAN SISWA - QR CODE ENGINE LEDGER", 15, 20);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString("id-ID")} - Waktu Indonesia Barat`, 15, 25);
    doc.text(`Waktu Toleransi Sekolah: S/D ${settings.jamMasuk} WIB`, 15, 30);

    // Decorative Green Bar under banner
    doc.setFillColor(52, 211, 153); // emerald 400
    doc.rect(0, 38, 210, 2, "F");

    // Table Content Design
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // dark text
    doc.setFont("helvetica", "bold");

    // Headers
    let currentY = 52;
    doc.setFillColor(241, 245, 249); // light blue gray
    doc.rect(12, currentY - 5, 186, 8, "F");
    
    doc.text("NO", 15, currentY);
    doc.text("NAMA SISWA", 25, currentY);
    doc.text("KELAS", 75, currentY);
    doc.text("NIS", 98, currentY);
    doc.text("PELAJARAN", 121, currentY);
    doc.text("WAKTU MASUK", 154, currentY);
    doc.text("STATUS", 182, currentY);

    doc.setDrawColor(226, 232, 240);
    doc.line(12, currentY + 4, 198, currentY + 4);

    // Filter list logic
    const filteredLogs = absensiList.filter((log) => {
      const student = siswaList.find((s) => s.id === log.siswaId);
      if (!student) return false;

      const matchesSearch = student.nama.toLowerCase().includes(searchQuery.toLowerCase()) || student.nis.includes(searchQuery);
      const matchesClass = classFilter === "Semua Kelas" || student.kelas === classFilter;
      const matchesMapel = mapelFilter === "Semua Mapel" || (log.mapel || "Matematika") === mapelFilter;
      return matchesSearch && matchesClass && matchesMapel;
    });

    doc.setFont("helvetica", "normal");
    filteredLogs.forEach((log, index) => {
      const student = siswaList.find((s) => s.id === log.siswaId);
      if (!student) return;

      currentY += 8;

      // Handle page break
      if (currentY > 275) {
        doc.addPage();
        currentY = 20;
        doc.setFont("helvetica", "bold");
        doc.text("DAFTAR ABSENSI (LANJUTAN)", 15, currentY);
        currentY += 10;
      }

      // Draw subtle row zebra stripes
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(12, currentY - 5, 186, 7.5, "F");
      }

      doc.text(String(index + 1), 15, currentY);
      doc.text(student.nama, 25, currentY);
      doc.text(student.kelas, 75, currentY);
      doc.text(student.nis, 98, currentY);
      doc.text(log.mapel || "Matematika", 121, currentY);
      doc.text(`${log.jam} WIB`, 154, currentY);

      if (log.status === "Terlambat") {
        doc.setTextColor(217, 119, 6); // Amber 600
        doc.setFont("helvetica", "bold");
        doc.text("TERLAMBAT", 182, currentY);
      } else {
        doc.setTextColor(5, 150, 105); // Emerald 600
        doc.setFont("helvetica", "bold");
        doc.text("HADIR", 182, currentY);
      }

      doc.setTextColor(15, 23, 42); // Reset to standard dark
      doc.setFont("helvetica", "normal");
      doc.line(12, currentY + 3, 198, currentY + 3);
    });

    // Summary block in PDF final page
    currentY += 15;
    if (currentY > 240) {
      doc.addPage();
      currentY = 30;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(12, currentY, 186, 25, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, currentY, 186, 25);

    doc.setFont("helvetica", "bold");
    doc.text("REKAP DISKUSI STATUS TERCATAT (FILTER AKTIF):", 15, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Baris Riwayat: ${filteredLogs.length} Entri`, 15, currentY + 13);
    doc.text(`Tercatat Tepat Waktu: ${filteredLogs.filter(l => l.status === "Hadir").length} Hadir`, 15, currentY + 19);
    doc.text(`Tercatat Terlambat: ${filteredLogs.filter(l => l.status === "Terlambat").length} Siswa`, 100, currentY + 19);

    // Save PDF trigger
    doc.save(`Laporan_Absensi_${settings.namaSekolah.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // Excel Export using SheetJS
  const handleExportExcel = () => {
    // Filter list logic
    const filteredLogs = absensiList.filter((log) => {
      const student = siswaList.find((s) => s.id === log.siswaId);
      if (!student) return false;

      const matchesSearch = student.nama.toLowerCase().includes(searchQuery.toLowerCase()) || student.nis.includes(searchQuery);
      const matchesClass = classFilter === "Semua Kelas" || student.kelas === classFilter;
      const matchesMapel = mapelFilter === "Semua Mapel" || (log.mapel || "Matematika") === mapelFilter;
      return matchesSearch && matchesClass && matchesMapel;
    });

    // Generate active attendance data structure
    const dataToExport = filteredLogs.map((log, idx) => {
      const student = siswaList.find((s) => s.id === log.siswaId);
      return {
        No: idx + 1,
        Nama_Siswa: student ? student.nama : "Tidak Dikenal",
        NIS: student ? student.nis : "-",
        Kelas: student ? student.kelas : "-",
        Mata_Pelajaran: log.mapel || "Matematika",
        Tanggal: log.tanggal,
        Jam_Scan: log.jam,
        Status: log.status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi Siswa");
    
    XLSX.writeFile(
      workbook,
      `Rekap_Absensi_${settings.namaSekolah.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Simulator Scanner Dispatch triggers
  const handleRunSimulation = async () => {
    setSimulationResponse(null);
    if (!simulatorStudentId) {
      alert("Pilih siswa yang ingin disimulasikan scan!");
      return;
    }

    const s = siswaList.find((x) => x.id === simulatorStudentId);
    if (!s) return;

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrData: s.qrCodeData,
          forcedTime: `${simulatorTime}:00`,
          mapel: simulatorMapel,
          sesi: simulatorSesi || undefined,
        }),
      });

      const resData = await response.json();
      if (response.ok) {
        if (resData.success) {
          playSuccessSound();
          setSimulationResponse({
            success: true,
            message: `Scan Sukses! ${s.nama} terekam absensi pada ${resData.attendance.jam} (${resData.attendance.status}).`,
          });
        } else {
          playWarningSound();
          setSimulationResponse({
            success: false,
            message: resData.message || "Siswa sudah tercatat absen hari ini.",
          });
        }
      } else {
        playErrorSound();
        setSimulationResponse({
          success: false,
          message: resData.message || "Gagal simulasikan scan.",
        });
      }

      // Re-trigger global refresh
      await onRefreshData();
    } catch (e) {
      playErrorSound();
      setSimulationResponse({ success: false, message: "Koneksi offline saat simulator bekerja." });
    }
  };

  // Student list based on search filters
  const filteredStudents = siswaList.filter((s) => {
    const matchesSearch = s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery);
    const matchesClass = classFilter === "Semua Kelas" || s.kelas === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div id="teacher-dashboard-container" className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      
      {/* Upper Navigation Row */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo variant="icon" className="w-10 h-10 drop-shadow-md shrink-0" />
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">PORTAL GURU <span className="text-indigo-400">CORDOVA</span></h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
              {settings.namaSekolah} • REAL-TIME WORKSTATION
            </p>
          </div>
        </div>

        {/* Current User Card */}
        <div className="flex items-center gap-4">
          <div className="text-right flex flex-col hidden sm:block">
            <span className="text-slate-200 text-xs font-bold leading-none block">{user.nama}</span>
            <span className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest">{user.role} AKADEMIK</span>
          </div>

          <div className="h-9 w-9 rounded-full bg-slate-800 border-2 border-indigo-500/25 flex items-center justify-center text-indigo-400 font-bold uppercase select-none">
            {user.nama.slice(0, 2)}
          </div>

          <button
            onClick={onLogout}
            id="btn-teacher-logout"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer"
            title="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Grid Wrapper */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Left Side Sidebar Buttons */}
        <aside className="w-full lg:w-64 border-r lg:border-b-0 border-b border-slate-800 p-5 space-y-3 shrink-0 bg-slate-900/40">
          
          <p className="text-[10px] text-slate-500 font-bold px-3 py-1 uppercase tracking-widest font-mono">Navigasi Utama</p>

          <button
            onClick={() => setActiveTab("ringkasan")}
            id="sidebar-tab-ringkasan"
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "ringkasan"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <Grid className="h-4 w-4" />
              <span>Ringkasan Kehadiran</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("siswa")}
            id="sidebar-tab-siswa"
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "siswa"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4" />
              <span>Manajemen Siswa</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("laporan")}
            id="sidebar-tab-laporan"
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "laporan"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <FileDown className="h-4 w-4" />
              <span>Riwayat & Ekspor PDF</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("pengaturan")}
            id="sidebar-tab-pengaturan"
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "pengaturan"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-4 w-4" />
              <span>Pengaturan Jam Limit</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          </button>

          {/* Quick Stats Indicator Widget in Sidebar */}
          <div className="pt-6 mt-4 border-t border-slate-800 space-y-3 hidden lg:block text-left px-3">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Status Server</span>
            <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] text-slate-300 font-semibold">Ledger Tersambung</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                Total Siswa: {siswaList.length} <br />
                Absen Hari Ini: {absensiList.filter(al => al.tanggal === stats.todayStr).length}
              </p>
            </div>
          </div>

        </aside>

        {/* Right Side Content Canvas */}
        <main className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
          
          {/* TAB 1: OVERVIEW & GRAPHICS */}
          {activeTab === "ringkasan" && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <h2 className="text-white text-xl font-bold tracking-tight">Ringkasan Kehadiran Hari Ini</h2>
                  <p className="text-xs text-slate-400">Ikhtisar statistik absensi siswa dengan grafik kontras tinggi.</p>
                </div>
                <div className="text-[11px] bg-slate-900/60 border border-slate-850 py-1.5 px-3.5 rounded-xl font-semibold font-mono text-slate-300">
                  Tanggal: {stats.todayStr}
                </div>
              </div>

              {/* Bento statistical grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total registered */}
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl transition duration-150 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider block">Total Siswa</span>
                    <span className="text-white font-mono text-3xl font-bold">{stats.totalSiswa}</span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                {/* Hadir Tepat Waktu (Green Status) */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl transition duration-150 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider block">Hadir</span>
                    <span className="text-white font-mono text-3xl font-bold">{stats.hadir}</span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>

                {/* Terlambat (Amber status) */}
                <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl transition duration-150 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-amber-400 text-xs font-bold uppercase tracking-wider block">Terlambat</span>
                    <span className="text-white font-mono text-3xl font-bold">{stats.terlambat}</span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-450">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>

                {/* Belum Hadir (Red Status) */}
                <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl transition duration-150 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-rose-500 text-xs font-bold uppercase tracking-wider block">Belum Hadir</span>
                    <span className="text-white font-mono text-3xl font-bold">{stats.belumHadir}</span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>

              </div>

              {/* Graphic charts comparison blocks */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* SVG Attendance Ratio visual Donut */}
                <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center backdrop-blur-sm shadow-md">
                  <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider mb-5 self-start">Rasio Kehadiran (%)</h4>
                  
                  {stats.totalSiswa === 0 ? (
                    <div className="text-slate-500 py-12 text-sm">Belum ada siswa terdaftar.</div>
                  ) : (
                    <div className="relative flex items-center justify-center w-full">
                      {/* Interactive responsive SVG circle diagram */}
                      <svg width="180" height="180" viewBox="0 0 100 100" className="transform -rotate-90">
                        {/* Background track */}
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" strokeWidth="12" />
                        
                        {/* Hadir circle slice */}
                        <circle
                           cx="50"
                           cy="50"
                           r="40"
                           fill="transparent"
                           stroke="#10b981" // emerald-500
                           strokeWidth="12"
                           strokeDasharray={`${(stats.hadir / stats.totalSiswa) * 251.2} 251.2`}
                           strokeDashoffset="0"
                        />

                        {/* Terlambat circle slice overlay */}
                        <circle
                           cx="50"
                           cy="50"
                           r="40"
                           fill="transparent"
                           stroke="#f59e0b" // amber-500
                           strokeWidth="12"
                           strokeDasharray={`${(stats.terlambat / stats.totalSiswa) * 251.2} 251.2`}
                           strokeDashoffset={`-${(stats.hadir / stats.totalSiswa) * 251.2}`}
                        />
                      </svg>

                      {/* Overlaid Center text info */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-white text-3xl font-extrabold font-mono leading-none">
                          {Math.round(((stats.hadir + stats.terlambat) / stats.totalSiswa) * 100) || 0}%
                        </span>
                        <span className="text-[10px] text-slate-450 mt-1 uppercase font-semibold">PARTISIPASI</span>
                      </div>
                    </div>
                  )}

                  {/* Legend guide */}
                  <div className="grid grid-cols-3 gap-2 w-full mt-6 text-[10px] uppercase font-mono">
                    <div className="flex flex-col items-center p-2 rounded bg-slate-950/80 border border-slate-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 mb-1" />
                      <span className="text-slate-400">Tepat</span>
                      <span className="text-white font-bold">{Math.round((stats.hadir / stats.totalSiswa) * 100) || 0}%</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded bg-slate-950/80 border border-slate-800">
                      <span className="h-2 w-2 rounded-full bg-amber-500 mb-1" />
                      <span className="text-slate-400">Telat</span>
                      <span className="text-white font-bold">{Math.round((stats.terlambat / stats.totalSiswa) * 100) || 0}%</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded bg-slate-950/80 border border-slate-800">
                      <span className="h-2 w-2 rounded-full bg-red-600 mb-1" />
                      <span className="text-slate-400">Bolos</span>
                      <span className="text-white font-bold">{Math.round((stats.belumHadir / stats.totalSiswa) * 100) || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* SVG Rounded Bar chart comparison (per class) */}
                <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col self-stretch justify-between backdrop-blur-sm shadow-md">
                  <div>
                    <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider mb-1">Rasio Kehadiran Per Tingkat Kelas</h4>
                    <p className="text-[11px] text-slate-500 mb-6">Melihat distribusi kehadiran efektif siswa.</p>
                  </div>

                  <div className="space-y-4">
                    {siswaList.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs">Siswa nihil. Silakan daftarkan atau import terlebih dahulu.</div>
                    ) : (
                      // Aggregate class values and draw SVG bars
                      Array.from(new Set(siswaList.map((s) => s.kelas))).sort().slice(0, 4).map((cls) => {
                        const totalInClass = siswaList.filter((s) => s.kelas === cls).length;
                        const presentInClass = absensiList.filter((a) => {
                          const s = siswaList.find((x) => x.id === a.siswaId);
                          return s && s.kelas === cls && a.tanggal === stats.todayStr;
                        }).length;

                        const percent = totalInClass > 0 ? (presentInClass / totalInClass) * 100 : 0;

                        return (
                          <div key={cls} className="space-y-1.5 text-left">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300 font-semibold">{cls}</span>
                              <span className="text-slate-400 font-mono">
                                Present: {presentInClass} / {totalInClass} ({Math.round(percent)}%)
                              </span>
                            </div>
                            
                            {/* Bar container wrapping simple css */}
                            <div className="h-3.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex items-center justify-start">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition duration-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800 mt-4 text-[10px] text-slate-500 font-mono">
                    Grafik mengkalkulasi total kehadiran murid per kelas dibanding kapasitas terdaftar resmi.
                  </div>
                </div>

              </div>

              {/* QR Scan Simulation Tool (Phenomenal for Sandbox evaluation!) */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-left backdrop-blur-sm shadow-md">
                <span className="text-indigo-400 font-mono text-[10px] tracking-widest font-bold uppercase flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Sandbox Testing Panel
                </span>
                <h3 className="text-white text-base font-bold">Simulator Scanner QR Otomatis</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulasikan pemindaian kartu QR tanpa perlu kamera webcam sungguhan. Pilih nama siswa di daftar, set jam, klik dapet langsung update!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mt-4">
                  {/* Select Student dropdown */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-slate-400 font-medium">Pilih Siswa</label>
                    <select
                      value={simulatorStudentId}
                      onChange={(e) => setSimulatorStudentId(e.target.value)}
                      className="w-full bg-slate-950 text-white rounded-xl py-2 px-3 border border-slate-800 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                    >
                      <option value="">-- Pilih Siswa Daftar --</option>
                      {siswaList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} ({s.kelas} - NIS {s.nis})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Mapel dropdown */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-slate-400 font-medium">Pelajaran Simulasi</label>
                    <select
                      value={simulatorMapel}
                      onChange={(e) => setSimulatorMapel(e.target.value)}
                      className="w-full bg-slate-950 text-white rounded-xl py-2 px-3 border border-slate-800 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-semibold"
                    >
                      {mapelListState.length === 0 ? (
                        <option value="Matematika">Matematika</option>
                      ) : (
                        mapelListState.map((m) => (
                          <option key={m.nama} value={m.nama}>
                            {m.nama.toUpperCase()} {!m.aktif ? " [NON-AKTIF]" : ""}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Select Sesi dropdown */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-slate-400 font-medium">Sesi Pelajaran</label>
                    <select
                      value={simulatorSesi}
                      onChange={(e) => setSimulatorSesi(e.target.value)}
                      className="w-full bg-slate-950 text-white rounded-xl py-2 px-3 border border-slate-800 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium"
                    >
                      <option value="">Auto (Ikut Jam)</option>
                      <option value="1">Sesi 1 ({settings.mapel1_judul || "Pertama"})</option>
                      <option value="2">Sesi 2 ({settings.mapel2_judul || "Kedua"})</option>
                      <option value="3">Sesi 3 ({settings.mapel3_judul || "Ketiga"})</option>
                      <option value="4">Sesi 4 ({settings.mapel4_judul || "Keempat"})</option>
                    </select>
                  </div>

                  {/* Force Custom Time input */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-slate-400 font-medium font-bold text-indigo-400">Jam Masuk</label>
                    <input
                      type="time"
                      value={simulatorTime}
                      onChange={(e) => setSimulatorTime(e.target.value)}
                      className="w-full bg-slate-950 text-white rounded-xl py-1.5 px-3 border border-slate-800 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-semibold font-mono"
                    />
                  </div>

                  {/* Submit dispatch button */}
                  <button
                    onClick={handleRunSimulation}
                    className="md:col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-wider py-2.5 px-3 rounded-xl transition-all duration-155 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/15 h-[34px] mb-[1px]"
                  >
                    Simulasikan </button>
                </div>

                {simulationResponse && (
                  <div className={`mt-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 transition ${
                    simulationResponse.success
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  }`}>
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{simulationResponse.message}</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: MANAJEMEN SISWA (CRUD, EXCEL IMPORT, GENERATE QR CARD) */}
          {activeTab === "siswa" && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-white text-xl font-bold tracking-tight">Manajemen Registrasi Siswa</h2>
                  <p className="text-xs text-slate-400">Edit, tambah, hapus siswa, ekspor kartu QR, atau unggah Excel bulk.</p>
                </div>
              </div>

              {/* Action layout grid split: Left (crud Form & excel) | Right (Student list) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Form control panel and XLSX import */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Form Create Student */}
                  <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-md">
                    <h4 className="text-white text-xs font-bold uppercase tracking-wider border-b border-slate-800/80 pb-2 flex items-center gap-2 text-indigo-400">
                      <Plus className="h-4 w-4" /> Tambah Siswa Baru
                    </h4>

                    {formError && (
                      <div className="p-3 bg-red-500/15 border border-red-500/25 rounded-xl text-xs text-red-400">
                        {formError}
                      </div>
                    )}

                    {formSuccess && (
                      <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-xs text-emerald-450">
                        Siswa berhasil didaftarkan dan data QR Code langsung aktif!
                      </div>
                    )}

                    <form onSubmit={handleCreateStudent} className="space-y-4 text-xs font-semibold">
                      
                      {/* Name input */}
                      <div className="space-y-1">
                        <label className="text-slate-400 block font-medium uppercase text-[10px]">Nama Lengkap Siswa</label>
                        <input
                          type="text"
                          value={newSiswaName}
                          onChange={(e) => {
                            setNewSiswaName(e.target.value);
                            setFormSuccess(false);
                          }}
                          placeholder="Contoh: Muhammad Akhyar"
                          className="w-full bg-slate-950 text-white rounded-xl py-2 px-3 border border-slate-800 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                        />
                      </div>

                      {/* NIS ID Input */}
                      <div className="space-y-1">
                        <label className="text-slate-400 block font-medium uppercase text-[10px]">Nomor Induk Siswa (NIS)</label>
                        <input
                          type="text"
                          value={newSiswaNis}
                          onChange={(e) => {
                            setNewSiswaNis(e.target.value);
                            setFormSuccess(false);
                          }}
                          placeholder="Pencocok QR unik, misal: 10091"
                          className="w-full bg-slate-950 text-white rounded-xl py-2 px-3 border border-slate-800 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                        />
                      </div>

                      {/* Class Input */}
                      <div className="space-y-1">
                        <label className="text-slate-400 block font-medium uppercase text-[10px]">Pembagian Rombel Kelas</label>
                        <select
                          value={newSiswaClass}
                          onChange={(e) => setNewSiswaClass(e.target.value)}
                          className="w-full bg-slate-950 text-white rounded-xl py-2 px-3 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium"
                        >
                          {kelas.map((cls) => (
                            <option key={cls} value={cls}>Kelas {cls}</option>
                          ))}
                          {kelas.length === 0 && (
                            <>
                              <option value="X-MIPA-1">Kelas X - MIPA 1</option>
                              <option value="X-MIPA-2">Kelas X - MIPA 2</option>
                              <option value="X-IPS-1">Kelas X - IPS 1</option>
                              <option value="X-IPS-2">Kelas X - IPS 2</option>
                              <option value="XI-MIPA-1">Kelas XI - MIPA 1</option>
                              <option value="XI-IPS-1">Kelas XI - IPS 1</option>
                              <option value="XII-IPA-1">Kelas XII - IPA 1</option>
                              <option value="XII-IPA-2">Kelas XII - IPA 2</option>
                            </>
                          )}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl uppercase tracking-wider font-sans transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/15"
                      >
                        SIMPAN DATA SISWA
                      </button>

                    </form>
                  </div>

                  {/* Class List Management Container */}
                  <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-md">
                    <h4 className="text-white text-xs font-bold uppercase tracking-wider border-b border-slate-800/80 pb-2 flex items-center gap-2 text-indigo-400">
                      <Grid className="h-4 w-4" /> Manajemen Ruang & Kelas
                    </h4>

                    {classError && (
                      <div className="p-3 bg-red-500/15 border border-red-500/25 rounded-xl text-xs text-red-400">
                        {classError}
                      </div>
                    )}

                    {classSuccess && (
                      <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-xs text-emerald-450">
                        {classSuccess}
                      </div>
                    )}

                    <form onSubmit={handleAddClassSubmit} className="space-y-3">
                      <div>
                        <label className="text-slate-400 block font-medium uppercase text-[10px] mb-1">Nama Kelas Baru</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Contoh: XII-IPA-3"
                            value={newClassNameForm}
                            onChange={(e) => {
                              setNewClassNameForm(e.target.value);
                              setClassError(null);
                              setClassSuccess(null);
                            }}
                            className="flex-1 bg-slate-950 text-white rounded-xl py-2 px-3 border border-slate-800 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition uppercase font-semibold"
                          />
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
                            title="Tambah Kelas"
                          >
                            <Plus className="h-4.5 w-4.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block">Akan dikonversi otomatis ke huruf kapital.</span>
                      </div>
                    </form>

                    <div className="space-y-2 pt-1">
                      <label className="text-slate-400 block font-medium uppercase text-[10px]">Daftar Kelas Terdaftar</label>
                      <div className="max-h-[160px] overflow-y-auto border border-slate-800/50 rounded-xl bg-slate-950/50 p-2.5 divide-y divide-slate-850">
                        {kelas.length === 0 ? (
                          <div className="text-slate-600 text-center py-4 text-[11px]">Belum ada kelas terdaftar</div>
                        ) : (
                          kelas.map((cls) => {
                            const count = siswaList.filter((s) => s.kelas === cls).length;
                            return (
                              <div key={cls} className="flex items-center justify-between py-1.5 text-xs first:pt-0 last:pb-0">
                                <span className="text-slate-200 font-semibold">{cls} <span className="text-[10px] text-slate-500 font-normal">({count} siswa)</span></span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClass(cls)}
                                  className="text-slate-500 hover:text-rose-450 p-1 rounded hover:bg-rose-500/10 transition cursor-pointer"
                                  title={`Hapus Kelas ${cls}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subject List Management Container */}
                  <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-md text-left">
                    <h4 className="text-white text-xs font-bold uppercase tracking-wider border-b border-slate-800/80 pb-2 flex items-center gap-2 text-indigo-400">
                      <BookOpen className="h-4 w-4" /> Manajemen Mata Pelajaran (Mapel)
                    </h4>

                    {mapelError && (
                      <div className="p-3 bg-red-500/15 border border-red-500/25 rounded-xl text-xs text-red-400">
                        {mapelError}
                      </div>
                    )}

                    {mapelSuccess && (
                      <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-xs text-emerald-450">
                        {mapelSuccess}
                      </div>
                    )}

                    <form onSubmit={handleAddMapelSubmit} className="space-y-3">
                      <div>
                        <label className="text-slate-400 block font-medium uppercase text-[10px] mb-1">Nama Mapel Baru</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Contoh: Fisika, Bahasa Indonesia"
                            value={newMapelName}
                            onChange={(e) => {
                              setNewMapelName(e.target.value);
                              setMapelError(null);
                              setMapelSuccess(null);
                            }}
                            className="flex-1 bg-slate-950 text-white rounded-xl py-2 px-3 border border-slate-800 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-semibold"
                          />
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
                            title="Tambah Mapel"
                          >
                            <Plus className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    </form>

                    <div className="space-y-2 pt-1">
                      <label className="text-slate-400 block font-semibold uppercase text-[10px]">Daftar Pelajaran Terdaftar</label>
                      <div className="max-h-[160px] overflow-y-auto border border-slate-800/50 rounded-xl bg-slate-950/50 p-2.5 divide-y divide-slate-850">
                        {mapelListState.length === 0 ? (
                          <div className="text-slate-600 text-center py-4 text-[11px]">Belum ada mata pelajaran terdaftar</div>
                        ) : (
                          mapelListState.map((m) => {
                            const count = absensiList.filter((a) => (a.mapel || "Matematika").toLowerCase() === m.nama.toLowerCase()).length;
                            return (
                              <div key={m.nama} className="flex items-center justify-between py-2 text-xs first:pt-0 last:pb-0">
                                <div className="flex items-center gap-2.5">
                                  {/* Alarm-style switch */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMapel(m.nama, !m.aktif)}
                                    className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                      m.aktif ? "bg-indigo-600" : "bg-slate-800"
                                    }`}
                                    title={m.aktif ? "Matikan (Nonaktifkan) Pelajaran" : "Aktifkan Pelajaran"}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        m.aktif ? "translate-x-3.5" : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                  
                                  <span className={`font-semibold tracking-wide transition-opacity duration-150 ${m.aktif ? "text-slate-200" : "text-slate-500 line-through"}`}>
                                    {m.nama.toUpperCase()} <span className="text-[10px] text-slate-500 font-normal">({count} absensi)</span>
                                  </span>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMapel(m.nama)}
                                  className="text-slate-500 hover:text-rose-450 p-1 rounded hover:bg-rose-500/10 transition cursor-pointer"
                                  title={`Hapus Pelajaran ${m.nama}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SheetJS Excel Bulk Upload Container */}
                  <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-md">
                    <h4 className="text-white text-xs font-bold uppercase tracking-wider border-b border-slate-800/80 pb-2 flex items-center gap-2 text-indigo-400">
                      <UploadCloud className="h-4 w-4" /> Import Siswa Via Excel / CSV
                    </h4>

                    {excelFileError && (
                      <div className="p-3 bg-red-500/15 border border-red-500/25 rounded-xl text-xs text-red-400">
                        {excelFileError}
                      </div>
                    )}

                    {importSuccessMsg && (
                      <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-xs text-emerald-450">
                        {importSuccessMsg}
                      </div>
                    )}

                    <div className="space-y-3.5 text-xs text-left">
                      <p className="text-slate-400 leading-relaxed text-[11px]">
                        Format file Excel wajib memiliki kolom header berikut pada baris pertama sheet:<br />
                        <b className="text-indigo-400 font-mono">nama, kelas, nis</b>
                      </p>

                      <div className="relative border border-slate-800 border-dashed rounded-xl bg-slate-950 hover:bg-slate-900/60 transition flex flex-col items-center justify-center p-5 text-center">
                        <FileSpreadsheet className="h-7 w-7 text-indigo-500/50 mb-2 animate-bounce" />
                        <span className="text-slate-200 font-bold block mb-1">Pilih File Excel Anda</span>
                        <span className="text-[10px] text-slate-500 block">Mendukung format .xlsx (.xls)</span>
                        
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleExcelImport}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>

                      {pendingImports.length > 0 && (
                        <div className="space-y-2.5 pt-2">
                          <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[11px] text-amber-300">
                            <b>Terdeteksi {pendingImports.length} siswa siap diimport!</b> Klik tombol di bawah untuk melangsungkan rekam data ke database. Silakan konfirmasi.
                          </div>
                          
                          <button
                            onClick={handleConfirmImport}
                            disabled={isSubmitting}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-xl uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            KONFIRMASI UNGGAH {pendingImports.length} BARIS
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Column: Registries view with filtration */}
                <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
                  
                  {/* Table search bar */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-850 pb-4">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari siswa (Nama/NIS)..."
                        className="w-full bg-slate-950 text-white rounded-xl pl-9 pr-4 py-2 border border-slate-800 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium transition"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
                      {availableClasses.map((cls) => (
                        <button
                          key={cls}
                          onClick={() => setClassFilter(cls)}
                          className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition shrink-0 cursor-pointer ${
                            classFilter === cls
                              ? "bg-indigo-500/10 text-indigo-450 border border-indigo-500/25"
                              : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80"
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Listings Table */}
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                          <th className="pb-3 pt-1 font-semibold">No</th>
                          <th className="pb-3 pt-1 font-semibold">Nama Siswa</th>
                          <th className="pb-3 pt-1 font-semibold">NIS</th>
                          <th className="pb-3 pt-1 font-semibold">Kelas</th>
                          <th className="pb-3 pt-1 text-center font-semibold">Aksi QR & Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-600">
                              Data siswa tidak ditemukan dengan filter aktif.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((siswa, idx) => (
                            <tr key={siswa.id} className="hover:bg-slate-800/20 group transition duration-150">
                              <td className="py-3.5 font-mono text-slate-500">{idx + 1}</td>
                              <td className="py-3.5 text-white font-bold">{siswa.nama}</td>
                              <td className="py-3.5 font-mono font-medium text-slate-300">{siswa.nis}</td>
                              <td className="py-3.5">
                                <span className="bg-slate-950 border border-slate-800 py-0.5 px-2 rounded-md font-mono text-[10px] text-slate-300 font-semibold">
                                  {siswa.kelas}
                                </span>
                              </td>
                              <td className="py-3.5 text-center">
                                <div className="inline-flex gap-2.5">
                                  <button
                                    onClick={() => setActiveQrModal(siswa)}
                                    className="p-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/30 duration-150 rounded-md text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-1 cursor-pointer"
                                    title="Lihat & Unduh QR Card"
                                  >
                                    <QrCode className="h-3 w-3" />
                                    <span>LIHAT QR CARD</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteStudent(siswa.id, siswa.nama)}
                                    className="p-1.5 bg-slate-950 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-900/40 duration-150 rounded-md cursor-pointer"
                                    title="Hapus Siswa"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 flex justify-between items-center text-[11px] text-slate-500 font-mono border-t border-slate-800/40">
                    <span>Menampilkan {filteredStudents.length} dari {siswaList.length} siswa terdaftar</span>
                    <span className="hidden sm:inline">Pencocokan QR: ABS-[NIS]</span>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 3: RIWAYAT & EKSPOR LAPORAN */}
          {activeTab === "laporan" && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-800/60 pb-5">
                <div>
                  <h2 className="text-white text-xl font-bold tracking-tight">Ledger Absensi & Rekap Laporan</h2>
                  <p className="text-xs text-slate-400">Arsip riwayat kehadiran resmi sekolah. Saring serta ekspor dokumen.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-lg text-xs font-bold transition cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    <Printer className="h-4 w-4" />
                    <span>EXPORT PDF</span>
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 py-2.5 px-4 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <FileDown className="h-4 w-4 text-emerald-400" />
                    <span>EXPORT EXCEL</span>
                  </button>

                  <button
                    onClick={handleClearAttendanceLogs}
                    className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2.5 px-4 rounded-lg text-xs font-bold transition cursor-pointer ml-auto xl:ml-0"
                  >
                    <span>KOSONGKAN LEDGER</span>
                  </button>
                </div>
              </div>

              {/* Saringan Laporan */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-md backdrop-blur-sm">
                               <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-slate-455 font-bold block">Pencarian Siswa</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Nama siswa atau NIS..."
                        className="w-full bg-slate-950 text-white rounded-xl pl-9 pr-4 py-2 border border-slate-800 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-slate-455 font-bold block">Filter Kelas</label>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="w-full bg-slate-950 text-white rounded-xl py-2 px-3 border border-slate-800 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-semibold"
                    >
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-slate-455 font-bold block">Filter Mapel</label>
                    <select
                      value={mapelFilter}
                      onChange={(e) => setMapelFilter(e.target.value)}
                      className="w-full bg-slate-950 text-white rounded-xl py-2 px-3 border border-slate-800 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-semibold"
                    >
                      <option value="Semua Mapel">SEMUA MAPEL</option>
                      {mapelListState.map((m) => (
                        <option key={m.nama} value={m.nama}>
                          {m.nama.toUpperCase()} {!m.aktif ? " [NON-AKTIF]" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-end">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-right w-full">
                      <span className="text-[10px] text-slate-500 font-bold uppercase font-mono block">Data Saringan Aktif</span>
                      <span className="text-indigo-400 text-md font-mono font-bold leading-none block mt-1">
                        {
                          absensiList.filter((log) => {
                            const student = siswaList.find((s) => s.id === log.siswaId);
                            if (!student) return false;
                            const matchesSearch = student.nama.toLowerCase().includes(searchQuery.toLowerCase()) || student.nis.includes(searchQuery);
                            const matchesClass = classFilter === "Semua Kelas" || student.kelas === classFilter;
                            const matchesMapel = mapelFilter === "Semua Mapel" || (log.mapel || "Matematika") === mapelFilter;
                            return matchesSearch && matchesClass && matchesMapel;
                          }).length
                        }{" "}
                        Baris
                      </span>
                    </div>
                  </div>
              </div>

              {/* Daily Separated Reports */}
              {(() => {
                const filtered = absensiList.filter((log) => {
                  const student = siswaList.find((s) => s.id === log.siswaId);
                  if (!student) return false;
                  const matchesSearch = student.nama.toLowerCase().includes(searchQuery.toLowerCase()) || student.nis.includes(searchQuery);
                  const matchesClass = classFilter === "Semua Kelas" || student.kelas === classFilter;
                  const matchesMapel = mapelFilter === "Semua Mapel" || (log.mapel || "Matematika") === mapelFilter;
                  return matchesSearch && matchesClass && matchesMapel;
                });

                // Group by Date
                const groups: { [key: string]: typeof filtered } = {};
                filtered.forEach((log) => {
                  const date = log.tanggal;
                  if (!groups[date]) {
                    groups[date] = [];
                  }
                  groups[date].push(log);
                });

                // Sort dates descending
                const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

                const formatTanggalIndo = (tanggalStr: string) => {
                  try {
                    const [year, month, day] = tanggalStr.split("-").map(Number);
                    if (year && month && day) {
                      const d = new Date(year, month - 1, day);
                      return d.toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      });
                    }
                  } catch (e) {}
                  return tanggalStr;
                };

                if (sortedDates.length === 0) {
                  return (
                    <div className="text-center py-12 bg-slate-950/20 border border-slate-800/60 rounded-2xl text-slate-500 font-medium">
                      Belum ada entri absensi terekam yang cocok untuk saringan aktif.
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {sortedDates.map((date) => {
                      const logsForDate = groups[date];
                      const statsInfo = logsForDate.reduce(
                        (acc, curr) => {
                          if (curr.status === "Hadir") acc.hadir++;
                          else acc.terlambat++;
                          return acc;
                        },
                        { hadir: 0, terlambat: 0 }
                      );

                      return (
                        <div key={date} className="bg-slate-900/30 border border-slate-800/80 p-5 rounded-2xl space-y-4 shadow-sm">
                          {/* Date Group Heading */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/25">
                                <Clock className="h-4 w-4" />
                              </span>
                              <h3 className="text-sm font-bold text-slate-200">
                                {formatTanggalIndo(date)}
                              </h3>
                            </div>
                            
                            <div className="flex items-center gap-2 text-[10px] uppercase font-mono font-bold">
                              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {statsInfo.hadir} Hadir
                              </span>
                              <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {statsInfo.terlambat} Terlambat
                              </span>
                              <span className="px-2 py-1 rounded bg-slate-800 text-slate-350 border border-slate-700">
                                Total: {logsForDate.length} Siswa
                              </span>
                            </div>
                          </div>

                          {/* Table for this date */}
                          <div className="overflow-x-auto w-full">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-800/60 text-slate-500 uppercase font-mono tracking-wider pb-2.5">
                                  <th className="pb-2 text-[10px] w-12">No</th>
                                  <th className="pb-2 text-[10px]">Nama Siswa</th>
                                  <th className="pb-2 text-[10px]">NIS</th>
                                  <th className="pb-2 text-[10px]">Kelas</th>
                                  <th className="pb-2 text-[10px]">Sesi / Pelajaran</th>
                                  <th className="pb-2 text-[10px] font-mono">Waktu Absen</th>
                                  <th className="pb-2 text-[10px]">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850/60">
                                {logsForDate.map((log, index) => {
                                  const student = siswaList.find((s) => s.id === log.siswaId);
                                  
                                  let detailedSesi = log.mapel || "Matematika";
                                  if (log.sesi === "1") {
                                    detailedSesi = `${settings.mapel1_judul || "Sesi 1"} (${detailedSesi})`;
                                  } else if (log.sesi === "2") {
                                    detailedSesi = `${settings.mapel2_judul || "Sesi 2"} (${detailedSesi})`;
                                  } else if (log.sesi === "3") {
                                    detailedSesi = `${settings.mapel3_judul || "Sesi 3"} (${detailedSesi})`;
                                  } else if (log.sesi === "4") {
                                    detailedSesi = `${settings.mapel4_judul || "Sesi 4"} (${detailedSesi})`;
                                  }

                                  return (
                                    <tr key={log.id} className="hover:bg-slate-900/25 transition">
                                      <td className="py-2.5 font-mono text-slate-500">{index + 1}</td>
                                      <td className="py-2.5 text-white font-bold">{student ? student.nama : "Tidak Dikenal"}</td>
                                      <td className="py-2.5 font-mono text-slate-300">{student ? student.nis : "-"}</td>
                                      <td className="py-2.5 font-mono">{student ? student.kelas : "-"}</td>
                                      <td className="py-2.5 text-slate-200 font-semibold">{detailedSesi}</td>
                                      <td className="py-2.5 font-mono text-emerald-400 font-semibold">{log.jam} WIB</td>
                                      <td className="py-2.5">
                                        <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                                          log.status === "Hadir"
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                        }`}>
                                          {log.status.toUpperCase()}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>

            </div>
          )}

          {/* TAB 4: SETTINGS LIMIT TIME */}
          {activeTab === "pengaturan" && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div>
                <h2 className="text-white text-xl font-bold tracking-tight">Pengaturan Parameter Absensi</h2>
                <p className="text-xs text-slate-400">Ubah konfigurasi sekolah, waktu toleransi keterlambatan siswa, atau reset database sandbox.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Form parameters */}
                <form onSubmit={handleUpdateSettingsSubmit} className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-5 text-sm font-semibold shadow-md">
                  <h4 className="text-white text-xs font-bold uppercase tracking-wider border-b border-slate-800/80 pb-2 text-indigo-400">Konfigurasi Aktif</h4>
                  
                  {settingsSuccess && (
                     <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-xs text-emerald-400">
                      Pengaturan absensi berhasil dimutakhirkan ke server!
                    </div>
                  )}

                  {/* School Name */}
                  <div className="space-y-2">
                    <label className="text-slate-300 block font-bold text-xs uppercase tracking-wider">Nama Lembaga / Sekolah</label>
                    <input
                      type="text"
                      value={localSchoolName}
                      onChange={(e) => setLocalSchoolName(e.target.value)}
                      className="w-full bg-slate-950 text-white rounded-xl py-2.5 px-4 border border-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 col-span-2 outline-none transition font-medium"
                      placeholder="Misal: SMA IT CORDOVA 174"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">Diberlakukan pada header scanner, dashboard, dokumen PDF, dan worksheet Excel.</span>
                  </div>

                  {/* Timeout Limit */}
                  <div className="space-y-2">
                    <label className="text-slate-300 block font-bold text-xs uppercase tracking-wider">Batas Waktu Masuk Tepat (Deadline Umum)</label>
                    <input
                      type="time"
                      value={localJamMasuk}
                      onChange={(e) => setLocalJamMasuk(e.target.value)}
                      className="w-full sm:max-w-xs bg-slate-950 text-white rounded-xl py-2.5 px-4 border border-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium"
                    />
                    <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                      Sesuai prosedur umum default penandaan tepat waktu sekolah jika tidak memakai filter mapel per sesi di bawah.
                    </p>
                  </div>

                  {/* Sesi Pelajaran & Batas Kehadiran (4 Mapel) */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-400" />
                      <h5 className="text-[11px] uppercase font-mono text-indigo-400 font-bold tracking-wider">
                        Sesi & Batas Waktu per Pelajaran (Maksimal 4 Mapel per Hari)
                      </h5>
                    </div>
                    
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Siswa dapat memindai kartu QR mereka hingga 4x sehari (sekali per pelajaran). Sistem akan mencatat kehadiran tepat waktu siswa secara independen berdasarkan toleransi waktu masing-masing sesi pelajaran berikut.
                    </p>                     <div className="grid grid-cols-1 gap-3.5">
                      {/* Sesi 1 */}
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 shadow-inner">
                        <span className="text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/35 w-6 h-6 rounded-full flex items-center justify-center font-bold">1</span>
                        <div className="flex-1 w-full space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Judul Sesi/Mapel Pertama</label>
                          <input
                            type="text"
                            value={localMapel1Judul}
                            onChange={(e) => setLocalMapel1Judul(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium transition"
                          />
                        </div>
                        <div className="w-full sm:w-28 space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Mulai Absen</label>
                          <input
                            type="time"
                            value={localMapel1Mulai}
                            onChange={(e) => setLocalMapel1Mulai(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono transition"
                          />
                        </div>
                        <div className="w-full sm:w-28 space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Batas Waktu</label>
                          <input
                            type="time"
                            value={localMapel1Jam}
                            onChange={(e) => setLocalMapel1Jam(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono transition"
                          />
                        </div>
                      </div>

                      {/* Sesi 2 */}
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 shadow-inner">
                        <span className="text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/35 w-6 h-6 rounded-full flex items-center justify-center font-bold">2</span>
                        <div className="flex-1 w-full space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Judul Sesi/Mapel Kedua</label>
                          <input
                            type="text"
                            value={localMapel2Judul}
                            onChange={(e) => setLocalMapel2Judul(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium transition"
                          />
                        </div>
                        <div className="w-full sm:w-28 space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Mulai Absen</label>
                          <input
                            type="time"
                            value={localMapel2Mulai}
                            onChange={(e) => setLocalMapel2Mulai(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono transition"
                          />
                        </div>
                        <div className="w-full sm:w-28 space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Batas Waktu</label>
                          <input
                            type="time"
                            value={localMapel2Jam}
                            onChange={(e) => setLocalMapel2Jam(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono transition"
                          />
                        </div>
                      </div>

                      {/* Sesi 3 */}
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 shadow-inner">
                        <span className="text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/35 w-6 h-6 rounded-full flex items-center justify-center font-bold">3</span>
                        <div className="flex-1 w-full space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Judul Sesi/Mapel Ketiga</label>
                          <input
                            type="text"
                            value={localMapel3Judul}
                            onChange={(e) => setLocalMapel3Judul(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium transition"
                          />
                        </div>
                        <div className="w-full sm:w-28 space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Mulai Absen</label>
                          <input
                            type="time"
                            value={localMapel3Mulai}
                            onChange={(e) => setLocalMapel3Mulai(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono transition"
                          />
                        </div>
                        <div className="w-full sm:w-28 space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Batas Waktu</label>
                          <input
                            type="time"
                            value={localMapel3Jam}
                            onChange={(e) => setLocalMapel3Jam(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono transition"
                          />
                        </div>
                      </div>

                      {/* Sesi 4 */}
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 shadow-inner">
                        <span className="text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/35 w-6 h-6 rounded-full flex items-center justify-center font-bold">4</span>
                        <div className="flex-1 w-full space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Judul Sesi/Mapel Keempat</label>
                          <input
                            type="text"
                            value={localMapel4Judul}
                            onChange={(e) => setLocalMapel4Judul(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium transition"
                          />
                        </div>
                        <div className="w-full sm:w-28 space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Mulai Absen</label>
                          <input
                            type="time"
                            value={localMapel4Mulai}
                            onChange={(e) => setLocalMapel4Mulai(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono transition"
                          />
                        </div>
                        <div className="w-full sm:w-28 space-y-1">
                          <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Batas Waktu</label>
                          <input
                            type="time"
                            value={localMapel4Jam}
                            onChange={(e) => setLocalMapel4Jam(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono transition"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl uppercase tracking-wider transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    Simpan Perubahan </button>
                </form>

                {/* Operations & Reset Block */}
                <div className="lg:col-span-5 bg-rose-500/5 border border-rose-500/10 p-6 rounded-2xl space-y-4">
                  <h4 className="text-rose-400 text-xs font-bold uppercase tracking-wider border-b border-rose-500/10 pb-2">Tindakan Bahaya & Reset</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Operasi berikut akan memodifikasi file penyimpanan persisten `db.json` secara destruktif. Silakan gunakan dengan sangat hati-hati.
                  </p>

                  <div className="space-y-3.5 text-xs pt-2">
                    
                    {/* Recovery factory reset */}
                    <div className="bg-slate-950/80 border border-slate-805 p-4 rounded-xl space-y-2">
                      <span className="text-white font-bold block">Reset Sandbox Kompleks</span>
                      <span className="text-slate-500 text-[10px] block leading-relaxed">
                        Mengembalikan 15 daftar siswa bawaan, memulihkan status database awal, serta menyetel ulang nama institusi sekolah.
                      </span>
                      <button
                        onClick={handleResetDatabase}
                        className="bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/20 transition py-1.5 px-3 rounded-md font-bold text-[10px] tracking-wider uppercase cursor-pointer"
                      >
                        Reset Data Ke Setingan Pabrik
                      </button>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

        </main>

      </div>

      {/* MODAL WINDOW: DYNAMIC PRINT STUDENT ID CARD & QR CODE PREVIEW */}
      {activeQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden p-6 relative animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h4 className="text-white font-bold text-sm">Kartu Pengenal Siswa</h4>
              <button
                onClick={() => setActiveQrModal(null)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 leading-none h-8 w-8 rounded-full border border-slate-750 flex items-center justify-center cursor-pointer"
              >
                <span className="text-xl font-light">&times;</span>
              </button>
            </div>

            {/* Simulated School ID Card Graphic wrapper */}
            <div
              id="student-id-card-print-area"
              className="w-full p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 relative shadow-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #022c22, #020617, #022c22)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              {/* Gold Ornamental Header Accent */}
              <div 
                className="absolute top-0 inset-x-0 h-1.5" 
                style={{ background: "linear-gradient(to right, #d97706, #fbbf24, #d97706)" }}
              />
              
              {/* Subtle Islamic Geometric Backdrop Watermark / Accents */}
              <div 
                className="absolute top-2 right-2 pointer-events-none select-none font-sans text-[42px] leading-none"
                style={{ color: "rgba(16, 185, 129, 0.08)" }}
              >
                ۞
              </div>
              <div 
                className="absolute bottom-2 left-2 pointer-events-none select-none font-sans text-[42px] leading-none"
                style={{ color: "rgba(16, 185, 129, 0.08)" }}
              >
                ۞
              </div>

              {/* Boarding School Header */}
              <div 
                className="space-y-2 w-full pb-3"
                style={{ borderBottom: "1px dashed rgba(245, 158, 11, 0.2)" }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <div 
                    className="h-6 w-6 rounded-full flex items-center justify-center shadow-md"
                    style={{ background: "linear-gradient(135deg, #fbbf24, #d97706)", color: "#022c22" }}
                  >
                    <BookOpen className="h-3 w-3 font-extrabold" />
                  </div>
                  <span 
                    className="text-[9px] uppercase tracking-widest font-sans font-bold"
                    style={{ color: "#fbbf24" }}
                  >
                    KARTU IDENTITAS SISWA
                  </span>
                </div>
                
                <div className="space-y-0.5">
                  <h5 className="text-white text-xs font-bold leading-tight tracking-wide font-sans">{settings.namaSekolah}</h5>
                  <span 
                    className="text-[8px] uppercase tracking-widest font-sans font-medium block"
                    style={{ color: "#94a3b8" }}
                  >
                    Sistem Akademik & Kesiswaan
                  </span>
                </div>
              </div>

              {/* Server-Side Rendered QR code stream with premium Gold Frame */}
              <div className="relative p-1">
                {/* Vintage Corner Brackets Simulation for QR Code */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl" style={{ borderColor: "#fbbf24" }} />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr" style={{ borderColor: "#fbbf24" }} />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl" style={{ borderColor: "#fbbf24" }} />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br" style={{ borderColor: "#fbbf24" }} />
                
                <div 
                  className="h-44 w-44 bg-white p-3 rounded-lg flex items-center justify-center shadow-xl border"
                  style={{ borderColor: "rgba(251, 191, 36, 0.15)" }}
                >
                  <img
                    src={`/api/siswa/${activeQrModal.id}/qr`}
                    alt={`QR Code ${activeQrModal.nama}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              {/* Student Bio */}
              <div className="space-y-1.5 w-full">
                <span className="text-white font-black text-base block tracking-tight leading-snug drop-shadow-sm">
                  {activeQrModal.nama}
                </span>

                <div className="flex items-center justify-center gap-2">
                  <span 
                    className="text-[9px] px-2.5 py-0.5 rounded-md font-sans font-bold uppercase tracking-wide border"
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.1)",
                      borderColor: "rgba(245, 158, 11, 0.25)",
                      color: "#fbbf24"
                    }}
                  >
                    {activeQrModal.kelas}
                  </span>
                  <span 
                    className="text-[9px] px-2.5 py-0.5 rounded-md font-sans font-bold uppercase tracking-wide border"
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      borderColor: "rgba(16, 185, 129, 0.25)",
                      color: "#34d399"
                    }}
                  >
                    SISWA AKTIF
                  </span>
                </div>

                <div className="text-[10px] font-sans flex items-center justify-center gap-1 mt-1" style={{ color: "#94a3b8" }}>
                  <span>NIS:</span>
                  <span className="font-bold tracking-wider" style={{ color: "#e2e8f0" }}>{activeQrModal.nis}</span>
                </div>
              </div>

              {/* Footer text with Islamic star and scan instructions */}
              <div 
                className="text-[8px] font-sans uppercase tracking-widest pt-2.5 w-full flex items-center justify-center gap-1.5"
                style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#64748b"
                }}
              >
                <span>✦</span>
                <span>Scan Terminal Presensi Siswa</span>
                <span>✦</span>
              </div>
            </div>            {/* Controls for card */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => {
                  window.print();
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-3 rounded-lg transition-all duration-155 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/15"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>CETAK SEKARANG</span>
              </button>

              <button
                onClick={handleDownloadCard}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 text-xs font-bold py-2.5 px-3 rounded-lg transition-all duration-155 flex items-center justify-center gap-1.5 text-center cursor-pointer"
              >
                <FileDown className="h-3.5 w-3.5 text-emerald-400" />
                <span>UNDUH IMAGE</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
