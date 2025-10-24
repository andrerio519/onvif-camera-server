# Sistem Kontrol Kamera ONVIF

Proyek ini adalah sistem kontrol kamera ONVIF berbasis web yang memungkinkan Anda untuk mengontrol kamera IP Anda dengan streaming real-time, kontrol PTZ, dan manajemen preset.

## Fitur

- **Live Streaming:** Streaming video real-time dari kamera ONVIF Anda ke browser.
- **Kontrol PTZ:** Pan, Tilt, dan Zoom kamera Anda secara real-time.
- **Manajemen Preset:** Simpan dan panggil kembali posisi kamera.
- **Informasi Kamera:** Lihat detail perangkat dan profil media.
- **Desain Responsif:** Antarmuka yang ramah seluler untuk mengontrol kamera Anda dari perangkat apa pun.

## Tumpukan Teknologi

**Backend:**

- **Node.js:** Runtime JavaScript untuk server.
- **Express.js:** Kerangka kerja web untuk membuat REST API.
- **node-onvif:** Pustaka untuk berkomunikasi dengan perangkat ONVIF.
- **fluent-ffmpeg:** Pustaka untuk mengubah aliran RTSP ke MJPEG.
- **cors:** Middleware untuk mengaktifkan Cross-Origin Resource Sharing.

**Frontend:**

- **Vanilla JavaScript:** Tidak ada ketergantungan kerangka kerja untuk antarmuka yang ringan dan cepat.
- **Fetch API:** Permintaan HTTP modern untuk berkomunikasi dengan backend.
- **CSS3:** Gradien, animasi, flexbox, dan grid untuk UI modern.

**Streaming:**

- **RTSP:** Real-Time Streaming Protocol untuk menerima umpan kamera.
- **MJPEG:** Motion JPEG untuk streaming video ke browser.
- **FFmpeg:** Mesin transcoding video untuk mengubah RTSP ke MJPEG.

## Instalasi

1.  **Prasyarat:**
    *   Node.js (v14 atau lebih baru)
    *   npm (Node Package Manager)
    *   FFmpeg

2.  **Instal FFmpeg:**
    *   **Windows:** Unduh dari [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html), ekstrak, dan tambahkan ke PATH sistem Anda.
    *   **Linux:** `sudo apt update && sudo apt install ffmpeg`
    *   **macOS:** `brew install ffmpeg`

3.  **Instal Ketergantungan:**
    Buka terminal di folder proyek dan jalankan:
    ```bash
    npm install
    ```

4.  **Jalankan Server:**
    Mulai server backend dengan perintah berikut:
    ```bash
    node server.js
    ```
    Server akan berjalan di `http://localhost:3000`.

## Penggunaan

1.  **Akses Aplikasi:**
    Buka file `frontend/index.html` di browser web Anda.

2.  **Konfigurasi Kamera:**
    - Masukkan **Alamat IP** kamera Anda.
    - Masukkan **Port ONVIF** (biasanya 80, 8000, atau 8080).
    - Masukkan **Nama Pengguna** dan **Kata Sandi** untuk kamera Anda.
    - Klik tombol **"Hubungkan"**.

3.  **Kontrol Kamera:**
    - Gunakan kontrol PTZ untuk menggerakkan kamera.
    - Klik "Mulai Stream" untuk melihat umpan langsung.
    - Simpan dan panggil kembali preset untuk pemosisian kamera cepat.

## Titik Akhir API

Server backend menyediakan titik akhir REST API berikut:

- `POST /api/connect`: Hubungkan ke kamera.
- `POST /api/disconnect`: Putuskan sambungan dari kamera.
- `GET /api/camera/info`: Dapatkan informasi kamera.
- `GET /api/camera/status`: Dapatkan status kamera.
- `POST /api/ptz/move`: Gerakkan kamera (pan, tilt).
- `POST /api/ptz/stop`: Hentikan gerakan PTZ.
- `POST /api/ptz/zoom`: Perbesar atau perkecil.
- `GET /api/ptz/presets`: Dapatkan daftar preset.
- `POST /api/ptz/preset/goto`: Pergi ke preset tertentu.
- `POST /api/ptz/preset/set`: Simpan preset baru.
- `POST /api/ptz/preset/delete`: Hapus preset.
- `GET /api/stream/mjpeg`: Dapatkan aliran video MJPEG.
- `GET /api/health`: Periksa kesehatan server.

## Ketergantungan

- [body-parser](https://www.npmjs.com/package/body-parser): Middleware parsing body Node.js.
- [cors](https://www.npmjs.com/package/cors): Middleware CORS Node.js.
- [express](https://www.npmjs.com/package/express): Kerangka kerja web yang cepat, tidak beropini, dan minimalis untuk Node.js.
- [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg): API fasih untuk FFmpeg.
- [node-onvif](https://www.npmjs.com/package/node-onvif): Pustaka Node.js untuk mengontrol kamera IP yang sesuai dengan ONVIF.
- [ws](https://www.npmjs.com/package/ws): Klien dan server WebSocket yang mudah digunakan, sangat cepat, dan teruji secara menyeluruh untuk Node.js.
