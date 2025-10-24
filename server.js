const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const onvif = require('node-onvif');
const ffmpeg = require('fluent-ffmpeg');

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
let currentStream = null;
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

        // Validasi input
        if (!ip || !port || !username ) {
            return res.status(400).json({
                success: false,
                error: 'Semua field harus diisi (IP, Port, Username, )'
            });
        }

        onvifUsername = username;
        onvifPassword = password;

        console.log(`🔌 Mencoba koneksi ke: ${ip}:${port}`);

        // Buat instance ONVIF device
        cameraDevice = new onvif.OnvifDevice({
            xaddr: `http://${ip}:${port}/onvif/device_service`,
            user: username,
            pass: password
        });

        // Inisialisasi koneksi dengan timeout
        await Promise.race([
            cameraDevice.init(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000)
            )
        ]);

        // Simpan info kamera
        cameraInfo = {
            manufacturer: cameraDevice.information?.Manufacturer || 'Unknown',
            model: cameraDevice.information?.Model || 'Unknown',
            firmwareVersion: cameraDevice.information?.FirmwareVersion || 'N/A',
            serialNumber: cameraDevice.information?.SerialNumber || 'N/A',
            hardwareId: cameraDevice.information?.HardwareId || 'N/A',
            URI: cameraDevice.xaddr
        };

        // Dapatkan profile kamera
        const profiles = cameraDevice.getProfileList();
        
        // Check PTZ capability
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
        if (currentStream) {
            currentStream.kill('SIGKILL');
            currentStream = null;
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

        // Coba dapatkan status PTZ
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
            streamActive: currentStream !== null,
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

        // Mapping direction ke velocity
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

        // Kirim perintah PTZ
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

// ===== ENDPOINT: MJPEG Stream =====
app.get('/api/stream/mjpeg', async (req, res) => {
    if (!cameraDevice || !cameraDevice.current_profile) {
        return res.status(400).send('Kamera belum terhubung atau tidak ada profil aktif');
    }

    try {
        let streamUri = cameraDevice.current_profile.stream.rtsp;
        streamUri = formatStreamUri(streamUri, onvifUsername, onvifPassword);

        console.log('📺 Starting MJPEG stream...');

        res.writeHead(200, {
            'Content-Type': 'multipart/x-mixed-replace; boundary=--boundary',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Pragma': 'no-cache'
        });

        streamClients.add(res);

        // Convert RTSP to MJPEG menggunakan FFmpeg
        const stream = ffmpeg(streamUri)
            .inputOptions([
                '-rtsp_transport', 'tcp',
                '-analyzeduration', '1000000',
                '-probesize', '1000000'
            ])
            .outputOptions([
                '-f', 'mjpeg',
                '-q:v', '5',
                '-vf', 'scale=1280:-1'
            ])
            .on('start', (cmd) => {
                console.log('▶️ FFmpeg started:', cmd.substring(0, 100) + '...');
            })
            .on('error', (err) => {
                console.error('❌ FFmpeg Error:', err.message);
                streamClients.delete(res);
            })
            .on('end', () => {
                console.log('⏹️ FFmpeg stream ended');
                streamClients.delete(res);
            });

        currentStream = stream;
        stream.pipe(res, { end: true });

        req.on('close', () => {
            console.log('🔌 Client disconnected from stream');
            streamClients.delete(res);
            if (streamClients.size === 0 && currentStream) {
                currentStream.kill('SIGKILL');
                currentStream = null;
            }
        });

    } catch (error) {
        console.error('❌ Stream Error:', error.message);
        res.status(500).send('Stream error: ' + error.message);
    }
});

// ===== ENDPOINT: Health Check =====
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        connected: cameraDevice !== null,
        streaming: currentStream !== null,
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

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    if (currentStream) {
        currentStream.kill('SIGKILL');
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