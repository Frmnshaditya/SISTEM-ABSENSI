/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Siswa {
  id: string;
  nama: string;
  kelas: string;
  nis: string;
  qrCodeData: string;
}

export interface Absensi {
  id: string;
  siswaId: string;
  tanggal: string; // YYYY-MM-DD
  jam: string;     // HH:MM:SS
  status: "Hadir" | "Terlambat";
  mapel?: string;   // Mata Pelajaran
  sesi?: string;    // Sesi Mapel ("1" | "2" | "3" | "4")
}

export interface Mapel {
  nama: string;
  aktif: boolean;
}

export interface Settings {
  jamMasuk: string;
  namaSekolah: string;
  mapel1_judul?: string;
  mapel1_mulai?: string;
  mapel1_jam?: string;
  mapel2_judul?: string;
  mapel2_mulai?: string;
  mapel2_jam?: string;
  mapel3_judul?: string;
  mapel3_mulai?: string;
  mapel3_jam?: string;
  mapel4_judul?: string;
  mapel4_mulai?: string;
  mapel4_jam?: string;
}

export interface AttendanceStats {
  totalSiswa: number;
  hadir: number;
  terlambat: number;
  belumHadir: number;
  todayStr: string;
}

export interface User {
  id: string;
  nama: string;
  email: string;
  role: "guru";
}

export interface ScanResult {
  success: boolean;
  message: string;
  student?: Siswa;
  attendance?: Absensi;
}
