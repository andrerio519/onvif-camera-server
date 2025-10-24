// frontend/script.js
        // Global variables
        let cameraConnected = false;
        let streamActive = false;
        let currentSpeed = 0.5;
        const API_BASE = 'http://localhost:3000/api';

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            switchTab('live-view');

            // Speed slider event
            document.getElementById('ptz-speed').addEventListener('input', (e) => {
                currentSpeed = parseFloat(e.target.value);
                document.getElementById('speed-value').textContent = currentSpeed.toFixed(1) + 'x';
            });

            // Check server health
            checkServerHealth();
        });

        // Tab Switching
        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');

            const tabs = Array.from(document.querySelectorAll('.nav-tab'));
            const tabNames = ['live-view', 'profiles', 'tech-stack', 'guide'];
            const index = tabNames.indexOf(tabId);
            if (index !== -1) tabs[index].classList.add('active');
        }

        // Toast Notification System
        function showToast(type, title, message) {
            const container = document.getElementById('notification-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;

            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };

            toast.innerHTML = `
                <div class="toast-icon">${icons[type]}</div>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${message}</div>
                </div>
            `;

            container.appendChild(toast);

            setTimeout(() => toast.classList.add('show'), 100);

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 500);
            }, 5000);
        }

        // Check Server Health
        async function checkServerHealth() {
            try {
                const response = await fetch(`${API_BASE}/health`);
                const data = await response.json();
                if (data.success) {
                    console.log('✅ Server is running');
                }
            } catch (error) {
                showToast('error', 'Server Error', 'Backend server tidak dapat diakses. Pastikan server sudah running!');
                console.error('Server not reachable:', error);
            }
        }

        // Connect Camera
        async function connectCamera() {
            const connectBtn = document.getElementById('btn-connect');
            const connectingIndicator = document.getElementById('connecting-indicator');

            connectBtn.disabled = true;
            connectingIndicator.classList.add('visible');

            const ip = document.getElementById('cameraIp').value.trim();
            const port = document.getElementById('onvifPort').value.trim();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            if (!ip || !port || !username) {
                showToast('warning', 'Input Tidak Lengkap', 'Mohon isi semua field yang diperlukan');
                connectBtn.disabled = false;
                connectingIndicator.classList.remove('visible');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip, port, username, password })
                });

                const data = await response.json();

                if (data.success) {
                    cameraConnected = true;
                    updateUIState(true);
                    updateStatus(true, data.profiles);
                    displayProfiles(data.profiles);

                    showToast('success', 'Koneksi Berhasil!',
                        `Terhubung ke ${data.info.manufacturer} ${data.info.model}`);

                    // Load presets
                    setTimeout(() => loadPresets(), 1000);
                } else {
                    showToast('error', 'Koneksi Gagal', data.error);
                }
            } catch (error) {
                showToast('error', 'Error', 'Tidak dapat terhubung ke server: ' + error.message);
            } finally {
                connectBtn.disabled = false;
                connectingIndicator.classList.remove('visible');
            }
        }

        // Disconnect Camera
        async function disconnectCamera() {
            try {
                await fetch(`${API_BASE}/disconnect`, { method: 'POST' });

                cameraConnected = false;
                streamActive = false;
                updateUIState(false);
                updateStatus(false);

                // Reset video container
                const videoContainer = document.querySelector('.video-container');
                videoContainer.innerHTML = `
                    <div class="connecting-overlay" id="connecting-indicator">
                        <div class="loader"></div>
                        <p>Menyambungkan...</p>
                    </div>
                    <div class="video-placeholder">
                        <div class="icon">📹</div>
                        <h3>Kamera Terputus</h3>
                        <p>Hubungkan kembali untuk melanjutkan</p>
                    </div>
                `;

                // Clear preset list
                document.getElementById('preset-list').innerHTML = `
                    <p style="text-align: center; color: #999; padding: 20px;">
                        Tidak ada preset tersedia
                    </p>
                `;

                showToast('info', 'Disconnected', 'Kamera berhasil diputus');
            } catch (error) {
                showToast('error', 'Error', 'Gagal memutus koneksi');
            }
        }

        // Update UI State
        function updateUIState(connected) {
            // Connection buttons
            document.getElementById('btn-connect').disabled = connected;
            document.getElementById('btn-disconnect').disabled = !connected;

            // Stream buttons
            document.getElementById('btn-start-stream').disabled = !connected;
            document.getElementById('btn-stop-stream').disabled = !connected || !streamActive;

            // PTZ controls
            const ptzButtons = ['ptz-upleft', 'ptz-up', 'ptz-upright', 'ptz-left', 'ptz-stop',
                'ptz-right', 'ptz-downleft', 'ptz-down', 'ptz-downright',
                'zoom-in', 'zoom-out'];
            ptzButtons.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = !connected;
            });

            // Preset controls
            document.getElementById('preset-name').disabled = !connected;
            document.getElementById('btn-save-preset').disabled = !connected;
            document.getElementById('btn-refresh-presets').disabled = !connected;

            // Connection status
            const statusEl = document.getElementById('connection-status');
            if (connected) {
                statusEl.innerHTML = '<span class="status-indicator status-online"></span><span>Terhubung</span>';
            } else {
                statusEl.innerHTML = '<span class="status-indicator status-offline"></span><span>Tidak Terhubung</span>';
            }
        }

        // Display Profiles
        function displayProfiles(profiles) {
            const contentDiv = document.getElementById('profile-info-content');

            if (!profiles || profiles.length === 0) {
                contentDiv.innerHTML = '<p style="text-align: center; color: #999;">Tidak ada media profile yang ditemukan.</p>';
                return;
            }

            let html = '<div style="display: grid; gap: 15px;">';

            profiles.forEach((profile, index) => {
                const videoConfig = profile.video?.encoder || {};
                const audioConfig = profile.audio?.encoder || {};

                html += `
                    <div class="tech-item">
                        <h3>📊 Profile ${index + 1}: ${profile.name || 'Unnamed'}</h3>
                        <ul class="tech-list">
                            <li><strong>Token:</strong> ${profile.token}</li>
                            ${videoConfig.encoding ? `<li><strong>Video Encoding:</strong> ${videoConfig.encoding}</li>` : ''}
                            ${videoConfig.resolution ? `<li><strong>Resolution:</strong> ${videoConfig.resolution.width}x${videoConfig.resolution.height}</li>` : ''}
                            ${videoConfig.framerate ? `<li><strong>Frame Rate:</strong> ${videoConfig.framerate} fps</li>` : ''}
                            ${videoConfig.bitrate ? `<li><strong>Bitrate:</strong> ${videoConfig.bitrate} kbps</li>` : ''}
                            ${profile.ptz ? '<li><strong>PTZ:</strong> ✓ Supported</li>' : '<li><strong>PTZ:</strong> ✗ Not Supported</li>'}
                            ${profile.stream?.rtsp ? `<li><strong>RTSP URL:</strong> <code style="font-size: 0.85em; color: #667eea;">${profile.stream.rtsp}</code></li>` : ''}
                        </ul>
                    </div>
                `;
            });

            html += '</div>';
            contentDiv.innerHTML = html;
        }

        // Load Stream
        function loadStream() {
            if (!cameraConnected) {
                showToast('warning', 'Tidak Terhubung', 'Hubungkan ke kamera terlebih dahulu!');
                return;
            }

            const videoContainer = document.querySelector('.video-container');
            const timestamp = new Date().getTime();
            const streamUrl = `${API_BASE}/stream/mjpeg?t=${timestamp}`;

            console.log('🎬 Loading stream from:', streamUrl);

            // Show loading indicator
            videoContainer.innerHTML = `
        <div class="connecting-overlay visible" id="stream-connecting">
            <div class="loader"></div>
            <p>Memuat stream...</p>
            <p style="font-size: 0.9em; margin-top: 10px; opacity: 0.7;">Mohon tunggu 5-10 detik</p>
        </div>`;

            // Create img element
            const img = document.createElement('img');
            img.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
        display: none;` ;

            img.src = streamUrl;

            // Track loading
            let loadTimeout;
            let isLoaded = false;

            // On load success
            img.onload = function () {
                console.log('✅ Stream loaded successfully!');
                isLoaded = true;
                clearTimeout(loadTimeout);

                // Remove loading overlay
                const overlay = document.getElementById('stream-connecting');
                if (overlay) {
                    overlay.remove();
                }

                // Show image
                img.style.display = 'block';

                streamActive = true;
                document.getElementById('btn-stop-stream').disabled = false;
                document.getElementById('btn-start-stream').disabled = true;

                showToast('success', 'Stream Active', 'Video streaming berhasil dimulai');
            };

            // On error
            img.onerror = function (e) {
                console.error('❌ Stream load error:', e);
                clearTimeout(loadTimeout);
                handleStreamError();
            };

            // Timeout after 15 seconds
            loadTimeout = setTimeout(() => {
                if (!isLoaded) {
                    console.error('⏱️ Stream load timeout');
                    handleStreamError();
                }
            }, 15000);

            // Add image to container
            videoContainer.appendChild(img);

            // Mark as attempting to stream
            streamActive = true;
            document.getElementById('btn-stop-stream').disabled = false;
            document.getElementById('btn-start-stream').disabled = true;

            // Handle Stream Error - IMPROVED
            function handleStreamError() {
                streamActive = false;
                const videoContainer = document.querySelector('.video-container');

                videoContainer.innerHTML = `
        <div class="video-placeholder" style="padding: 30px;">
            <div class="icon">❌</div>
            <h3>Gagal Memuat Stream</h3>
            <p style="margin: 15px 0;">Kemungkinan penyebab:</p>
            <ul style="text-align: left; max-width: 500px; margin: 0 auto; line-height: 1.8;">
                <li><strong>FFmpeg belum terinstall</strong> - Jalankan: <code>ffmpeg -version</code></li>
                <li><strong>RTSP URL tidak valid</strong> - Cek kredensial kamera</li>
                <li><strong>Network timeout</strong> - Pastikan koneksi stabil</li>
                <li><strong>Kamera tidak support RTSP</strong> - Test dengan VLC Player</li>
                <li><strong>Port diblokir firewall</strong> - Buka port 554 (RTSP)</li>
            </ul>
            <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; font-size: 0.9em;">
                <strong>Debug:</strong> Buka console browser (F12) dan server terminal untuk melihat error detail
            </div>
        </div>`;

                document.getElementById('btn-stop-stream').disabled = true;
                document.getElementById('btn-start-stream').disabled = false;

                showToast('error', 'Stream Failed', 'Gagal memuat video. Periksa console untuk detail.');
            }

            // Handle Stream Load
            function handleStreamLoad() {
                const overlay = document.getElementById('stream-connecting');
                if (overlay) overlay.classList.remove('visible');
                updateStatus(true);
                showToast('success', 'Stream Active', 'Video streaming berhasil dimulai');
            }

            // Handle Stream Error
            function handleStreamError(img) {
                streamActive = false;
                img.parentElement.innerHTML = `
                <div class="video-placeholder">
                    <div class="icon">❌</div>
                    <h3>Stream Error</h3>
                    <p>Gagal memuat stream. Pastikan:</p>
                    <ul style="text-align: left; margin-top: 15px; max-width: 400px;">
                        <li>FFmpeg sudah terinstall</li>
                        <li>Kamera support RTSP streaming</li>
                        <li>Network connection stabil</li>
                    </ul>
                </div>`;
                showToast('error', 'Stream Failed', 'Gagal memuat video stream');
            }
        }

        // Stop Stream
        function stopStream() {
            const videoContainer = document.querySelector('.video-container');
            videoContainer.innerHTML = `
                <div class="connecting-overlay" id="connecting-indicator">
                    <div class="loader"></div>
                    <p>Menyambungkan...</p>
                </div>
                <div class="video-placeholder">
                    <div class="icon">⏹️</div>
                    <h3>Stream Dihentikan</h3>
                    <p>Klik "Mulai Stream" untuk melanjutkan</p>
                </div>
            `;

            streamActive = false;
            document.getElementById('btn-stop-stream').disabled = true;
            updateStatus(true);

            showToast('info', 'Stream Stopped', 'Video streaming dihentikan');
        }

        // Update Status
        function updateStatus(online, profiles = []) {
            const statusValue = document.getElementById('status-value');
            const resolutionValue = document.getElementById('resolution-value');
            const fpsValue = document.getElementById('fps-value');
            const bitrateValue = document.getElementById('bitrate-value');

            if (online && profiles.length > 0) {
                statusValue.innerHTML = '<span class="status-indicator status-online"></span>Online';

                const firstProfile = profiles[0];
                if (firstProfile.video && firstProfile.video.encoder) {
                    const encoder = firstProfile.video.encoder;
                    resolutionValue.textContent = `${encoder.resolution.width}x${encoder.resolution.height}`;
                    fpsValue.textContent = encoder.framerate + ' fps';
                    bitrateValue.textContent = `${encoder.bitrate} kbps`;
                }
            } else if (online) {
                statusValue.innerHTML = '<span class="status-indicator status-online"></span>Online';
            } else {
                statusValue.innerHTML = '<span class="status-indicator status-offline"></span>Offline';
                resolutionValue.textContent = '-';
                fpsValue.textContent = '-';
                bitrateValue.textContent = '-';
            }
        }

        // PTZ Move
        async function ptzMove(direction) {
            if (!cameraConnected) {
                showToast('warning', 'Tidak Terhubung', 'Hubungkan ke kamera terlebih dahulu!');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/ptz/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ direction, speed: currentSpeed })
                });

                const data = await response.json();

                if (!data.success) {
                    showToast('error', 'PTZ Error', data.error);
                }
            } catch (error) {
                showToast('error', 'PTZ Error', 'Gagal mengirim perintah: ' + error.message);
            }
        }

        // PTZ Stop
        async function ptzStop() {
            if (!cameraConnected) return;

            try {
                const response = await fetch(`${API_BASE}/ptz/stop`, {
                    method: 'POST'
                });

                const data = await response.json();

                if (!data.success) {
                    showToast('error', 'PTZ Error', data.error);
                }
            } catch (error) {
                showToast('error', 'PTZ Error', 'Gagal menghentikan gerakan');
            }
        }

        // PTZ Zoom
        async function ptzZoom(direction) {
            if (!cameraConnected) {
                showToast('warning', 'Tidak Terhubung', 'Hubungkan ke kamera terlebih dahulu!');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/ptz/zoom`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ direction, speed: currentSpeed })
                });

                const data = await response.json();

                if (!data.success) {
                    showToast('error', 'Zoom Error', data.error);
                } else {
                    showToast('info', 'Zoom', `Zooming ${direction}...`);
                }
            } catch (error) {
                showToast('error', 'Zoom Error', 'Gagal zoom: ' + error.message);
            }
        }

        // Load Presets
        async function loadPresets() {
            if (!cameraConnected) {
                showToast('warning', 'Tidak Terhubung', 'Hubungkan ke kamera terlebih dahulu!');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/ptz/presets`);
                const data = await response.json();

                const presetList = document.getElementById('preset-list');

                if (data.success && data.presets && data.presets.length > 0) {
                    let html = '';

                    data.presets.forEach(preset => {
                        html += `
                            <div class="preset-item">
                                <div>
                                    <div class="preset-name">${preset.name || 'Preset ' + preset.token}</div>
                                    <div class="preset-token">Token: ${preset.token}</div>
                                </div>
                                <div class="preset-actions">
                                    <button class="preset-btn goto" onclick="gotoPreset('${preset.token}')">
                                        📍 Go
                                    </button>
                                    <button class="preset-btn delete" onclick="deletePreset('${preset.token}')">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        `;
                    });

                    presetList.innerHTML = html;
                    showToast('success', 'Presets Loaded', `${data.presets.length} preset ditemukan`);
                } else {
                    presetList.innerHTML = `
                        <p style="text-align: center; color: #999; padding: 20px;">
                            Tidak ada preset tersimpan
                        </p>
                    `;
                    showToast('info', 'No Presets', 'Belum ada preset yang tersimpan');
                }
            } catch (error) {
                showToast('error', 'Error', 'Gagal memuat presets: ' + error.message);
            }
        }

        // Save Preset
        async function savePreset() {
            if (!cameraConnected) {
                showToast('warning', 'Tidak Terhubung', 'Hubungkan ke kamera terlebih dahulu!');
                return;
            }

            const presetName = document.getElementById('preset-name').value.trim();

            if (!presetName) {
                showToast('warning', 'Input Kosong', 'Masukkan nama preset!');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/ptz/preset/set`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: presetName })
                });

                const data = await response.json();

                if (data.success) {
                    showToast('success', 'Preset Saved', `Preset "${presetName}" berhasil disimpan`);
                    document.getElementById('preset-name').value = '';

                    // Reload presets
                    setTimeout(() => loadPresets(), 500);
                } else {
                    showToast('error', 'Save Failed', data.error);
                }
            } catch (error) {
                showToast('error', 'Error', 'Gagal menyimpan preset: ' + error.message);
            }
        }

        // Goto Preset
        async function gotoPreset(token) {
            if (!cameraConnected) return;

            try {
                const response = await fetch(`${API_BASE}/ptz/preset/goto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ preset: token })
                });

                const data = await response.json();

                if (data.success) {
                    showToast('success', 'Moving to Preset', 'Kamera bergerak ke posisi preset');
                } else {
                    showToast('error', 'Error', data.error);
                }
            } catch (error) {
                showToast('error', 'Error', 'Gagal pindah ke preset: ' + error.message);
            }
        }

        // Delete Preset
        async function deletePreset(token) {
            if (!cameraConnected) return;

            if (!confirm('Apakah Anda yakin ingin menghapus preset ini?')) {
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/ptz/preset/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ preset: token })
                });

                const data = await response.json();

                if (data.success) {
                    showToast('success', 'Preset Deleted', 'Preset berhasil dihapus');

                    // Reload presets
                    setTimeout(() => loadPresets(), 500);
                } else {
                    showToast('error', 'Delete Failed', data.error);
                }
            } catch (error) {
                showToast('error', 'Error', 'Gagal menghapus preset: ' + error.message);
            }
        }

        // Keyboard shortcuts for PTZ control
        document.addEventListener('keydown', (e) => {
            if (!cameraConnected) return;

            // Only work when not typing in input fields
            if (e.target.tagName === 'INPUT') return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    ptzMove('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    ptzMove('down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    ptzMove('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    ptzMove('right');
                    break;
                case ' ':
                case 'Escape':
                    e.preventDefault();
                    ptzStop();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    ptzZoom('in');
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    ptzZoom('out');
                    break;
            }
        });

        // Auto-stop PTZ on key release (for better control)
        let moveTimeout;
        const originalPtzMove = ptzMove;
        ptzMove = function (direction) {
            originalPtzMove(direction);

            clearTimeout(moveTimeout);
            moveTimeout = setTimeout(() => {
                ptzStop();
            }, 1000);
        };







// Section Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('[id^="section-"]').forEach(el => {
        el.classList.add('d-none');
    });
    
    // Remove active from all sidebar items
    document.querySelectorAll('.list-group-item').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected section
    const section = document.getElementById(`section-${sectionName}`);
    if (section) {
        section.classList.remove('d-none');
    }
    
    // Add active to clicked item
    event.target.closest('.list-group-item')?.classList.add('active');
}

// Update slider values display
document.getElementById('brightness')?.addEventListener('input', (e) => {
    document.getElementById('brightness-val').textContent = e.target.value;
});

document.getElementById('contrast')?.addEventListener('input', (e) => {
    document.getElementById('contrast-val').textContent = e.target.value;
});

document.getElementById('saturation')?.addEventListener('input', (e) => {
    document.getElementById('saturation-val').textContent = e.target.value;
});

document.getElementById('ptz-speed')?.addEventListener('input', (e) => {
    document.getElementById('speed-value').textContent = parseFloat(e.target.value).toFixed(1) + 'x';
});