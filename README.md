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
