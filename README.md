# ONVIF Camera Control System

This project is a web-based ONVIF camera control system that allows you to control your IP camera with real-time streaming, PTZ control, and preset management.

## Features

-   **Live Streaming:** Real-time video streaming from your ONVIF camera to your browser.
-   **PTZ Control:** Pan, Tilt, and Zoom your camera in real-time.
-   **Preset Management:** Save and recall camera positions.
-   **Camera Information:** View device details and media profiles.
-   **Responsive Design:** A mobile-friendly interface for controlling your camera from any device.

## Tech Stack

**Backend:**

-   **Node.js:** A JavaScript runtime for the server.
-   **Express.js:** A web framework for creating the REST API.
-   **node-onvif:** A library for communicating with ONVIF devices.
-   **fluent-ffmpeg:** A library for converting the RTSP stream to MJPEG.
-   **cors:** A middleware for enabling Cross-Origin Resource Sharing.

**Frontend:**

-   **Vanilla JavaScript:** No framework dependencies for a lightweight and fast interface.
-   **Fetch API:** Modern HTTP requests for communicating with the backend.
-   **CSS3:** Gradients, animations, flexbox, and grid for a modern UI.

**Streaming:**

-   **RTSP:** Real-Time Streaming Protocol for receiving the camera feed.
-   **MJPEG:** Motion JPEG for streaming video to the browser.
-   **FFmpeg:** A video transcoding engine for converting RTSP to MJPEG.

## Installation

1.  **Prerequisites:**
    *   Node.js (v14 or later)
    *   npm (Node Package Manager)
    *   FFmpeg

2.  **Install FFmpeg:**
    *   **Windows:** Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html), extract, and add to your system's PATH.
    *   **Linux:** `sudo apt update && sudo apt install ffmpeg`
    *   **macOS:** `brew install ffmpeg`

3.  **Install Dependencies:**
    Open a terminal in the project folder and run:
    ```bash
    npm install
    ```

4.  **Run the Server:**
    Start the backend server with the following command:
    ```bash
    node server.js
    ```
    The server will run at `http://localhost:3000`.

## Usage

1.  **Access the Application:**
    Open the `frontend/index.html` file in your web browser.

2.  **Configure the Camera:**
    -   Enter the **IP Address** of your camera.
    -   Enter the **ONVIF Port** (usually 80, 8000, or 8080).
    -   Enter the **Username** and **Password** for your camera.
    -   Click the **"Hubungkan"** (Connect) button.

3.  **Control the Camera:**
    -   Use the PTZ controls to move the camera.
    -   Click "Mulai Stream" (Start Stream) to view the live feed.
    -   Save and recall presets for quick camera positioning.

## API Endpoints

The backend server provides the following REST API endpoints:

-   `POST /api/connect`: Connect to the camera.
-   `POST /api/disconnect`: Disconnect from the camera.
-   `GET /api/camera/info`: Get camera information.
-   `GET /api/camera/status`: Get camera status.
-   `POST /api/ptz/move`: Move the camera (pan, tilt).
-   `POST /api/ptz/stop`: Stop PTZ movement.
-   `POST /api/ptz/zoom`: Zoom in or out.
-   `GET /api/ptz/presets`: Get the list of presets.
-   `POST /api/ptz/preset/goto`: Go to a specific preset.
-   `POST /api/ptz/preset/set`: Save a new preset.
-   `POST /api/ptz/preset/delete`: Delete a preset.
-   `GET /api/stream/mjpeg`: Get the MJPEG video stream.
-   `GET /api/health`: Check the server's health.

## Dependencies

-   [body-parser](https://www.npmjs.com/package/body-parser): Node.js body parsing middleware.
-   [cors](https://www.npmjs.com/package/cors): Node.js CORS middleware.
-   [express](https://www.npmjs.com/package/express): Fast, unopinionated, minimalist web framework for Node.js.
-   [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg): A fluent API to FFmpeg.
-   [node-onvif](https://www.npmjs.com/package/node-onvif): A Node.js library for controlling ONVIF-compliant IP cameras.
-   [ws](https://www.npmjs.com/package/ws): A simple to use, blazing fast, and thoroughly tested WebSocket client and server for Node.js.



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
