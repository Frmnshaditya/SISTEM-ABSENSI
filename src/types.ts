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
}

export interface Mapel {
  nama: string;
  aktif: boolean;
}

export interface Settings {
  jamMasuk: string;
  namaSekolah: string;
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
