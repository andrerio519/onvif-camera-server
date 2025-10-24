const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const onvif = require('node-onvif');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Global variables
let cameraDevice = null;
let cameraInfo = null;
let onvifUsername = null;
let onvifPassword = null;
let ffmpegProcess = null;
let streamClients = new Set();

// Helper: Format Stream URI dengan kredensial
function formatStreamUri(rtspUrl, username, password) {
    try {
        const url = new URL(rtspUrl);
        url.username = username;
        url.password = password;
        return url.toString();
    } catch (error) {
        console.error('Error formatting stream URI:', error.message);
        return rtspUrl;
    }
}

// ===== ENDPOINT: Connect ke Kamera ONVIF =====
app.post('/api/connect', async (req, res) => {
    try {
        const { ip, port, username, password } = req.body;

        if (!ip || !port || !username) {
            return res.status(400).json({
                success: false,
                error: 'Semua field harus diisi (IP, Port, Username)'
            });
        }

        onvifUsername = username;
        onvifPassword = password || '';

        console.log(`🔌 Mencoba koneksi ke: ${ip}:${port}`);

        cameraDevice = new onvif.OnvifDevice({
            xaddr: `http://${ip}:${port}/onvif/device_service`,
            user: username,
            pass: password || ''
        });

        await Promise.race([
            cameraDevice.init(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout (10s)')), 30000)
            )
        ]);

        cameraInfo = {
            manufacturer: cameraDevice.information?.Manufacturer || 'Unknown',
            model: cameraDevice.information?.Model || 'Unknown',
            firmwareVersion: cameraDevice.information?.FirmwareVersion || 'N/A',
            serialNumber: cameraDevice.information?.SerialNumber || 'N/A',
            hardwareId: cameraDevice.information?.HardwareId || 'N/A',
            URI: cameraDevice.xaddr
        };

        const profiles = cameraDevice.getProfileList();
        const ptzSupported = profiles.some(p => p.ptz);

        console.log('✅ Koneksi berhasil!');
        console.log('📷 Info Kamera:', cameraInfo);
        console.log('📊 Jumlah Profiles:', profiles.length);
        console.log('🎮 PTZ Support:', ptzSupported);

        res.json({
            success: true,
            message: 'Berhasil terhubung ke kamera',
            info: cameraInfo,
            profiles: profiles,
            ptzSupported: ptzSupported,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error koneksi:', error.message);
        cameraDevice = null;
        res.status(500).json({
            success: false,
            error: error.message || 'Gagal terhubung ke kamera'
        });
    }
});

// ===== ENDPOINT: Disconnect Kamera =====
app.post('/api/disconnect', (req, res) => {
    try {
        if (ffmpegProcess) {
            ffmpegProcess.kill('SIGKILL');
            ffmpegProcess = null;
        }

        streamClients.clear();
        cameraDevice = null;
        cameraInfo = null;

        console.log('🔌 Kamera disconnected');

        res.json({
            success: true,
            message: 'Kamera berhasil diputus'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ENDPOINT: Get Camera Info =====
app.get('/api/camera/info', (req, res) => {
    if (!cameraDevice) {
        return res.status(400).json({
            success: false,
            error: 'Kamera belum terhubung'
        });
    }

    res.json({
        success: true,
        info: cameraInfo,
        connected: true
    });
});

// ===== ENDPOINT: Get Camera Status =====
app.get('/api/camera/status', async (req, res) => {
    try {
        if (!cameraDevice) {
            return res.json({
                success: true,
                connected: false,
                message: 'Tidak ada kamera terhubung'
            });
        }

        let ptzStatus = null;
        try {
            ptzStatus = await cameraDevice.ptzGetStatus();
        } catch (e) {
            console.log('PTZ status tidak tersedia');
        }

        res.json({
            success: true,
            connected: true,
            info: cameraInfo,
            ptzStatus: ptzStatus,
            streamActive: ffmpegProcess !== null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ENDPOINT: PTZ Move =====
app.post('/api/ptz/move', async (req, res) => {
    try {
        if (!cameraDevice) {
            return res.status(400).json({
                success: false,
                error: 'Kamera belum terhubung'
            });
        }

        const { direction, speed = 0.5 } = req.body;
        let x = 0, y = 0, z = 0;

        switch (direction.toLowerCase()) {
            case 'up': y = speed; break;
            case 'down': y = -speed; break;
            case 'left': x = -speed; break;
            case 'right': x = speed; break;
            case 'upleft': x = -speed; y = speed; break;
            case 'upright': x = speed; y = speed; break;
            case 'downleft': x = -speed; y = -speed; break;
            case 'downright': x = speed; y = -speed; break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid direction'
                });
        }

        await cameraDevice.ptzMove({
            speed: { x, y, z },
            timeout: 1
        });

        console.log(`🎮 PTZ Move: ${direction} (speed: ${speed})`);

        res.json({
            success: true,
            message: `Camera moved ${direction}`,
            direction: direction,
            speed: speed
        });

    } catch (error) {
        console.error('❌ PTZ Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ENDPOINT: PTZ Stop =====
app.post('/api/ptz/stop', async (req, res) => {
    try {
        if (!cameraDevice) {
            return res.status(400).json({
                success: false,
                error: 'Kamera belum terhubung'
            });
        }

        await cameraDevice.ptzStop();
        console.log('⏹️ PTZ Stopped');

        res.json({
            success: true,
            message: 'Camera stopped'
        });

    } catch (error) {
        console.error('❌ PTZ Stop Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ENDPOINT: PTZ Zoom =====
app.post('/api/ptz/zoom', async (req, res) => {
    try {
        if (!cameraDevice) {
            return res.status(400).json({
                success: false,
                error: 'Kamera belum terhubung'
            });
        }

        const { direction, speed = 0.5 } = req.body;
        const z = direction === 'in' ? speed : -speed;

        await cameraDevice.ptzMove({
            speed: { x: 0, y: 0, z },
            timeout: 1
        });

        console.log(`🔍 Zoom ${direction} (speed: ${speed})`);

        res.json({
            success: true,
            message: `Zoomed ${direction}`,
            direction: direction,
            speed: speed
        });

    } catch (error) {
        console.error('❌ Zoom Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ENDPOINT: Get Presets =====
app.get('/api/ptz/presets', async (req, res) => {
    try {
        if (!cameraDevice) {
            return res.status(400).json({
                success: false,
                error: 'Kamera belum terhubung'
            });
        }

        const presets = await cameraDevice.ptzGetPresets();

        console.log('📋 Presets:', presets?.length || 0);

        res.json({
            success: true,
            presets: presets || [],
            count: presets?.length || 0
        });

    } catch (error) {
        console.error('❌ Get Presets Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            presets: []
        });
    }
});

// ===== ENDPOINT: Goto Preset =====
app.post('/api/ptz/preset/goto', async (req, res) => {
    try {
        if (!cameraDevice) {
            return res.status(400).json({
                success: false,
                error: 'Kamera belum terhubung'
            });
        }

        const { preset } = req.body;

        if (!preset) {
            return res.status(400).json({
                success: false,
                error: 'Preset token required'
            });
        }

        await cameraDevice.ptzGotoPreset({ preset });
        console.log(`📍 Moved to Preset: ${preset}`);

        res.json({
            success: true,
            message: `Moved to preset ${preset}`,
            preset: preset
        });

    } catch (error) {
        console.error('❌ Goto Preset Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ENDPOINT: Set Preset =====
app.post('/api/ptz/preset/set', async (req, res) => {
    try {
        if (!cameraDevice) {
            return res.status(400).json({
                success: false,
                error: 'Kamera belum terhubung'
            });
        }

        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Preset name required'
            });
        }

        await cameraDevice.ptzSetPreset({ name });
        console.log(`💾 Preset saved: "${name}"`);

        res.json({
            success: true,
            message: `Preset "${name}" saved`,
            name: name
        });

    } catch (error) {
        console.error('❌ Set Preset Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ENDPOINT: Delete Preset =====
app.post('/api/ptz/preset/delete', async (req, res) => {
    try {
        if (!cameraDevice) {
            return res.status(400).json({
                success: false,
                error: 'Kamera belum terhubung'
            });
        }

        const { preset } = req.body;

        if (!preset) {
            return res.status(400).json({
                success: false,
                error: 'Preset token required'
            });
        }

        await cameraDevice.ptzRemovePreset({ preset });
        console.log(`🗑️ Preset deleted: ${preset}`);

        res.json({
            success: true,
            message: `Preset deleted`,
            preset: preset
        });

    } catch (error) {
        console.error('❌ Delete Preset Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ENDPOINT: Get Stream URL =====
app.get('/api/stream/url', async (req, res) => {
    try {
        if (!cameraDevice || !cameraDevice.current_profile) {
            return res.status(400).json({
                success: false,
                error: 'Kamera belum terhubung atau tidak ada profil aktif'
            });
        }

        let streamUri = cameraDevice.current_profile.stream.rtsp;
        streamUri = formatStreamUri(streamUri, onvifUsername, onvifPassword);

        res.json({
            success: true,
            streamUrl: streamUri,
            profile: cameraDevice.current_profile.name
        });

    } catch (error) {
        console.error('❌ Get Stream URL Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== ENDPOINT: MJPEG Stream (Using spawn for better control) =====
app.get('/api/stream/mjpeg', async (req, res) => {
    if (!cameraDevice || !cameraDevice.current_profile) {
        return res.status(400).send('Kamera belum terhubung atau tidak ada profil aktif');
    }

    try {
        let streamUri = cameraDevice.current_profile.stream.rtsp;
        streamUri = formatStreamUri(streamUri, onvifUsername, onvifPassword);

        console.log('📺 Starting MJPEG stream from:', streamUri);

        res.writeHead(200, {
            'Content-Type': 'multipart/x-mixed-replace; boundary=ffmpeg',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Connection': 'close'
        });

        streamClients.add(res);

        // Kill existing stream if any
        if (ffmpegProcess && streamClients.size === 1) {
            ffmpegProcess.kill('SIGKILL');
            ffmpegProcess = null;
        }

        // FFmpeg command with spawn
        const args = [
            '-rtsp_transport', 'tcp',
            '-i', streamUri,
            '-f', 'mpjpeg',
            '-q:v', '5',
            '-vf', 'scale=1280:-2',
            '-r', '15',
            '-'
        ];

        console.log('▶️ FFmpeg command:', 'ffmpeg', args.join(' '));

        ffmpegProcess = spawn('ffmpeg', args);

        // Handle stdout (video data)
        ffmpegProcess.stdout.on('data', (data) => {
            if (!res.destroyed) {
                res.write(data);
            }
        });

        // Handle stderr (logs)
        ffmpegProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('frame=')) {
                // Frame info - don't spam console
                process.stdout.write('.');
            } else if (msg.includes('error') || msg.includes('Error')) {
                console.error('FFmpeg error:', msg);
            }
        });

        // Handle process errors
        ffmpegProcess.on('error', (error) => {
            console.error('❌ FFmpeg process error:', error.message);
            streamClients.delete(res);
            if (!res.destroyed) {
                res.end();
            }
        });

        // Handle process exit
        ffmpegProcess.on('close', (code) => {
            console.log(`\n⏹️ FFmpeg exited with code ${code}`);
            streamClients.delete(res);
            if (!res.destroyed) {
                res.end();
            }
            if (streamClients.size === 0) {
                ffmpegProcess = null;
            }
        });

        // Handle client disconnect
        req.on('close', () => {
            console.log('\n🔌 Client disconnected from stream');
            streamClients.delete(res);

            if (streamClients.size === 0 && ffmpegProcess) {
                console.log('⏹️ No more clients, stopping stream');
                ffmpegProcess.kill('SIGKILL');
                ffmpegProcess = null;
            }
        });

    } catch (error) {
        console.error('❌ Stream Error:', error.message);
        streamClients.delete(res);
        if (!res.headersSent) {
            res.status(500).send('Stream error: ' + error.message);
        }
    }
});

// ===== ENDPOINT: Health Check =====
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        connected: cameraDevice !== null,
        streaming: ffmpegProcess !== null,
        clients: streamClients.size,
        timestamp: new Date().toISOString()
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// Endpoint Setting 
app.post('/api/camera/image/settings', async (req, res) => {
    try {
        const { brightness, contrast, saturation, sharpness } = req.body;

        await cameraDevice.services.imaging.setImagingSettings({
            brightness: brightness,
            contrast: contrast,
            saturation: saturation,
            sharpness: sharpness
        });

        res.json({ success: true, message: 'Image settings updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Backend endpoint
app.post('/api/audio/control', async (req, res) => {
    try {
        const { action, volume } = req.body; // action: 'mute', 'unmute', 'volume'

        if (action === 'volume') {
            // Set volume menggunakan ONVIF audio encoder config
            await cameraDevice.services.media.setAudioEncoderConfiguration({
                token: cameraDevice.current_profile.audio.encoder.token,
                configuration: {
                    sessionTimeout: 'PT60S',
                    volume: volume
                }
            });
        }

        res.json({ success: true, message: 'Audio updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Backend untuk event subscription
const EventEmitter = require('events');
const cameraEvents = new EventEmitter();

app.post('/api/events/subscribe', async (req, res) => {
    try {
        // Subscribe to camera events
        await cameraDevice.services.events.createPullPointSubscription();

        // Poll events setiap 1 detik
        setInterval(async () => {
            try {
                const messages = await cameraDevice.services.events.pullMessages({
                    timeout: 'PT1S',
                    messageLimit: 10
                });

                if (messages && messages.length > 0) {
                    messages.forEach(msg => {
                        // Emit event ke frontend via WebSocket
                        cameraEvents.emit('motion', msg);
                    });
                }
            } catch (e) {
                console.log('No new events');
            }
        }, 1000);

        res.json({ success: true, message: 'Subscribed to events' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// WebSocket connection untuk event real-time
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'motion') {
        showMotionAlert(data);
    }
};

function showMotionAlert(data) {
    const alertDiv = document.getElementById('motion-alerts');
    const alert = document.createElement('div');
    alert.className = 'motion-alert';
    alert.innerHTML = `
        <span>⚠️ Motion detected at ${new Date().toLocaleTimeString()}</span>
    `;
    alertDiv.prepend(alert);
}

// Backend recording dengan FFmpeg
let recordingProcess = null;

app.post('/api/recording/start', async (req, res) => {
    try {
        const { duration, filename } = req.body;
        const streamUri = formatStreamUri(
            cameraDevice.current_profile.stream.rtsp,
            onvifUsername,
            onvifPassword
        );

        const outputPath = `./recordings/${filename || Date.now()}.mp4`;

        recordingProcess = spawn('ffmpeg', [
            '-i', streamUri,
            '-t', duration || '60', // default 60 detik
            '-c', 'copy',
            outputPath
        ]);

        recordingProcess.on('close', (code) => {
            console.log('Recording finished:', outputPath);
        });

        res.json({
            success: true,
            message: 'Recording started',
            outputPath: outputPath
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// WebSocket endpoint untuk real-time events
const expressWs = require('express-ws')(app);
app.ws('/events', (ws, req) => {
    console.log('WebSocket client connected');

    cameraEvents.on('motion', (data) => {
        ws.send(JSON.stringify({ type: 'motion', data }));
    });
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    if (ffmpegProcess) {
        ffmpegProcess.kill('SIGKILL');
    }
    process.exit(0);
});

// Start Server
app.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 ONVIF Camera Control Server');
    console.log('========================================');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📋 API Endpoints:`);
    console.log(`   🔌 POST /api/connect         - Connect to camera`);
    console.log(`   🔌 POST /api/disconnect      - Disconnect camera`);
    console.log(`   📷 GET  /api/camera/info     - Get camera info`);
    console.log(`   📊 GET  /api/camera/status   - Get camera status`);
    console.log(`   🎮 POST /api/ptz/move        - Move camera`);
    console.log(`   ⏹️  POST /api/ptz/stop        - Stop movement`);
    console.log(`   🔍 POST /api/ptz/zoom        - Zoom in/out`);
    console.log(`   📋 GET  /api/ptz/presets     - Get presets`);
    console.log(`   📍 POST /api/ptz/preset/goto - Go to preset`);
    console.log(`   💾 POST /api/ptz/preset/set  - Save preset`);
    console.log(`   🗑️  POST /api/ptz/preset/delete - Delete preset`);
    console.log(`   📺 GET  /api/stream/mjpeg    - MJPEG stream`);
    console.log(`   💚 GET  /api/health          - Health check`);
    console.log('========================================');
    console.log('✅ Server ready!');
    console.log('========================================\n');
});