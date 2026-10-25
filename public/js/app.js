/**
 * Production Toll Plaza VMS Operations Central Controller
 * Real network communication, persistent fleet management, LAN scanner, and live monitoring.
 */

class TollVMSApp {
  constructor() {
    this.ws = null;
    this.deviceManager = new DeviceManager(this);
    this.packetMonitor = null;
    this.ledCanvas = null;
    this.plazaInfo = {
      plazaName: "Tecsidel Toll Operations Center",
      plazaCode: "TECSIDEL-TCS"
    };

    // Web Serial API port handle if user connects directly via USB-RS485
    this.serialPort = null;
    this.serialWriter = null;

    this.activeTab = 'tab-overview';
    this.selectedColor = 'R';
    this.selectedEffect = 'S';
  }

  init() {
    this.initCanvas();
    this.initPacketMonitor();
    this.initWebSocket();
    this.setupEventListeners();
    this.renderPresets();
    this.renderHindiChips();
  }

  initCanvas() {
    const canvasElem = document.getElementById('vms-canvas');
    if (canvasElem) {
      this.ledCanvas = new LEDMatrixCanvas(canvasElem, {
        matrixWidth: 192,
        matrixHeight: 64,
        dotPitch: 4,
        dotRadius: 1.5,
        lines: ["Don't Drink and Drive", 'शराब पी कर गाड़ी ना चलाएं'],
        color: 'R',
        effect: 'S',
        speed: 5,
        brightness: 1.0
      });
    }
  }

  initPacketMonitor() {
    const logElem = document.getElementById('packet-log-container');
    if (logElem) {
      this.packetMonitor = new PacketMonitor(logElem);
    }
  }

  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    const connect = () => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        const statusPill = document.getElementById('header-ws-status');
        if (statusPill) {
          statusPill.innerHTML = `<span class="status-indicator"></span> System: LIVE`;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      this.ws.onclose = () => {
        const statusPill = document.getElementById('header-ws-status');
        if (statusPill) {
          statusPill.innerHTML = `<span class="status-indicator amber"></span> Reconnecting...`;
        }
        setTimeout(connect, 2500);
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
      };
    };

    connect();
  }

  handleServerMessage(data) {
    if (data.type === 'INIT_STATE') {
      if (data.plazaInfo) this.setPlazaInfo(data.plazaInfo);
      if (data.devices) this.deviceManager.setDevices(data.devices);
      this.updateHeaderStats(data.devices || []);
    } else if (data.type === 'DEVICES_UPDATED') {
      this.deviceManager.setDevices(data.devices);
      this.updateHeaderStats(data.devices);
    } else if (data.type === 'PLAZA_INFO_UPDATED') {
      this.setPlazaInfo(data.plazaInfo);
    } else if (data.type === 'PACKET_LOG') {
      if (this.packetMonitor) {
        this.packetMonitor.addPacket(data);
      }
    }
  }

  setPlazaInfo(info) {
    this.plazaInfo = info;
    const titleElem = document.getElementById('header-plaza-name');
    const codeElem = document.getElementById('header-plaza-code');
    if (titleElem && info.plazaName) titleElem.textContent = info.plazaName;
    if (codeElem && info.plazaCode) codeElem.textContent = info.plazaCode;
  }

  updateHeaderStats(devices) {
    const connectedCount = devices.filter(d => d.status === 'connected').length;
    const statsElem = document.getElementById('header-hardware-count');
    if (statsElem) {
      statsElem.textContent = `${connectedCount} / ${devices.length} Online`;
      statsElem.style.color = connectedCount > 0 ? 'var(--led-green)' : 'var(--led-red)';
    }
  }

  setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Device Dropdown change
    const deviceDropdown = document.getElementById('device-select-dropdown');
    if (deviceDropdown) {
      deviceDropdown.addEventListener('change', (e) => {
        this.deviceManager.selectDevice(e.target.value);
      });
    }

    // Input fields live preview
    const line1 = document.getElementById('input-line1');
    const line2 = document.getElementById('input-line2');
    const line3 = document.getElementById('input-line3');
    const speedSlider = document.getElementById('input-speed');
    const brightnessSlider = document.getElementById('input-brightness');

    const updatePreview = () => {
      const l1 = line1 ? line1.value : '';
      const l2 = line2 ? line2.value : '';
      const l3 = line3 ? line3.value : '';
      const spd = speedSlider ? parseInt(speedSlider.value, 10) : 5;
      const brt = brightnessSlider ? parseFloat(brightnessSlider.value) : 1.0;

      if (this.ledCanvas) {
        this.ledCanvas.updateContent({
          lines: [l1, l2, l3].filter(Boolean),
          color: this.selectedColor,
          effect: this.selectedEffect,
          speed: spd,
          brightness: brt
        });
      }
    };

    [line1, line2, line3].forEach(input => {
      if (input) input.addEventListener('input', updatePreview);
    });

    if (speedSlider) speedSlider.addEventListener('input', updatePreview);
    if (brightnessSlider) brightnessSlider.addEventListener('input', updatePreview);

    // Color buttons
    document.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedColor = btn.getAttribute('data-color');
        updatePreview();
      });
    });

    // Effect selector
    const effectSelect = document.getElementById('input-effect');
    if (effectSelect) {
      effectSelect.addEventListener('change', (e) => {
        this.selectedEffect = e.target.value;
        updatePreview();
      });
    }

    // Transmit / Send Button
    const sendBtn = document.getElementById('btn-send-message');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendCurrentMessage());
    }

    // Clear Screen Button
    const clearBtn = document.getElementById('btn-clear-screen');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearCurrentScreen());
    }

    // Master Emergency Button
    const emergencyBtn = document.getElementById('btn-emergency-broadcast');
    if (emergencyBtn) {
      emergencyBtn.addEventListener('click', () => this.triggerEmergencyBroadcast());
    }

    // Direct Web Serial Connect Button
    const serialBtn = document.getElementById('btn-connect-serial');
    if (serialBtn) {
      serialBtn.addEventListener('click', () => this.connectWebSerial());
    }
  }

  switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === tabId);
    });

    this.activeTab = tabId;

    if (tabId === 'tab-overview' || tabId === 'tab-matrix') {
      setTimeout(() => {
        if (this.ledCanvas) this.ledCanvas.rasterizeText();
      }, 50);
    }
  }

  onDeviceSelected(device) {
    const l1 = document.getElementById('input-line1');
    const l2 = document.getElementById('input-line2');
    if (l1 && device.currentMessage) l1.value = device.currentMessage.line1 || '';
    if (l2 && device.currentMessage) l2.value = device.currentMessage.line2 || '';

    if (device.matrixWidth && device.matrixHeight && this.ledCanvas) {
      this.ledCanvas.setDimensions(device.matrixWidth, device.matrixHeight);
    }

    // Update telemetry strip
    const protoVal = document.getElementById('hud-proto-val');
    const ipVal = document.getElementById('hud-ip-val');
    const pingVal = document.getElementById('hud-ping-val');
    const statusVal = document.getElementById('hud-status-val');

    if (protoVal) protoVal.textContent = device.protocol || 'NHAI_ASCII';
    if (ipVal) ipVal.textContent = `${device.ip}:${device.port}`;
    if (pingVal) pingVal.textContent = device.telemetry?.pingMs ? `${device.telemetry.pingMs} ms` : (device.status === 'connected' ? '<10 ms' : 'Offline');
    if (statusVal) {
      statusVal.textContent = device.status === 'connected' ? 'ONLINE' : 'OFFLINE';
      statusVal.style.color = device.status === 'connected' ? 'var(--led-green)' : 'var(--led-red)';
    }

    const badgeTitle = document.getElementById('display-badge-title');
    if (badgeTitle) {
      badgeTitle.textContent = `${device.name.toUpperCase()} [${device.ip}]`;
    }
  }

  renderPresets() {
    const listElem = document.getElementById('presets-list-container');
    if (!listElem || !window.VMS_PRESETS) return;

    listElem.innerHTML = window.VMS_PRESETS.map(preset => {
      return `
        <div class="preset-card" onclick="window.app.applyPreset('${preset.id}')">
          <div class="preset-icon">${preset.icon}</div>
          <div class="preset-content">
            <h4>${preset.title}</h4>
            <p>${preset.desc}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  applyPreset(presetId) {
    const preset = window.VMS_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const l1 = document.getElementById('input-line1');
    const l2 = document.getElementById('input-line2');
    const l3 = document.getElementById('input-line3');
    if (l1) l1.value = preset.line1 || '';
    if (l2) l2.value = preset.line2 || '';
    if (l3) l3.value = preset.line3 || '';

    this.selectedColor = preset.color || 'R';
    this.selectedEffect = preset.effect || 'S';

    document.querySelectorAll('.color-option').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-color') === this.selectedColor);
    });

    const effectSelect = document.getElementById('input-effect');
    if (effectSelect) effectSelect.value = this.selectedEffect;

    const speedSlider = document.getElementById('input-speed');
    if (speedSlider) speedSlider.value = preset.speed || 5;

    if (this.ledCanvas) {
      this.ledCanvas.updateContent({
        lines: [preset.line1, preset.line2, preset.line3].filter(Boolean),
        color: this.selectedColor,
        effect: this.selectedEffect,
        speed: preset.speed || 5
      });
    }

    this.showNotification(`Loaded Preset: "${preset.title}"`, 'info');
  }

  renderHindiChips() {
    const container = document.getElementById('hindi-chips-container');
    if (!container || !window.HINDI_QUICK_PHRASES) return;

    container.innerHTML = window.HINDI_QUICK_PHRASES.map(phrase => {
      return `<button class="chip-btn" type="button" onclick="window.app.insertHindiPhrase('${phrase}')">${phrase}</button>`;
    }).join('');
  }

  insertHindiPhrase(phrase) {
    const l2 = document.getElementById('input-line2');
    if (l2) {
      l2.value = phrase;
      l2.dispatchEvent(new Event('input'));
    }
  }

  async sendCurrentMessage() {
    const dev = this.deviceManager.getSelectedDevice();
    if (!dev) return;

    const line1 = document.getElementById('input-line1')?.value || '';
    const line2 = document.getElementById('input-line2')?.value || '';
    const line3 = document.getElementById('input-line3')?.value || '';
    const speed = document.getElementById('input-speed')?.value || '05';
    const brightness = Math.round((parseFloat(document.getElementById('input-brightness')?.value || 1.0)) * 15);

    const payload = {
      deviceIds: [dev.id],
      command: 'D',
      line1,
      line2,
      line3,
      color: this.selectedColor,
      effect: this.selectedEffect,
      speed,
      brightness
    };

    try {
      this.showNotification(`Transmitting to ${dev.name} [${dev.ip}:${dev.port}]...`, 'info');
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.results && data.results[0]?.success) {
        this.showNotification(`Success: Hardware ACK received in ${data.results[0].latency} ms`, 'success');
      } else {
        const errMsg = data.results?.[0]?.error || data.error || 'Connection Failed';
        this.showNotification(`Transmission Error: ${errMsg}`, 'error');
      }
    } catch (e) {
      this.showNotification(`Network Error: ${e.message}`, 'error');
    }
  }

  async clearCurrentScreen() {
    const dev = this.deviceManager.getSelectedDevice();
    if (!dev) return;

    try {
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceIds: [dev.id], command: 'C' })
      });
      const l1 = document.getElementById('input-line1');
      const l2 = document.getElementById('input-line2');
      if (l1) l1.value = '';
      if (l2) l2.value = '';
      if (this.ledCanvas) this.ledCanvas.updateContent({ lines: [''] });
      this.showNotification('Display cleared.', 'info');
    } catch (e) {
      this.showNotification(`Error: ${e.message}`, 'error');
    }
  }

  async setLaneSignal(laneId, signal) {
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceIds: [laneId],
          command: 'L',
          laneSignal: signal
        })
      });
      const data = await res.json();
      if (data.success) {
        this.showNotification(`Lane switched to ${signal === 'G' ? 'OPEN (Green Arrow)' : 'CLOSED (Red Cross)'}`, 'success');
      }
    } catch (e) {
      this.showNotification(`Error: ${e.message}`, 'error');
    }
  }

  async simulateLaneTransaction(laneId, type) {
    const lane = this.deviceManager.devices.find(d => d.id === laneId);
    if (!lane) return;

    let l1 = 'FASTag OK';
    let l2 = '₹85 DEDUCTED';
    let color = 'G';

    if (type === 'LOW_BAL') {
      l1 = 'LOW FASTag BAL';
      l2 = 'RECHARGE FASTag';
      color = 'A';
    } else if (type === 'BLACKLIST') {
      l1 = 'TAG BLACKLISTED';
      l2 = 'STOP - PAY CASH';
      color = 'R';
    }

    try {
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceIds: [laneId],
          command: 'D',
          line1: l1,
          line2: l2,
          color,
          effect: 'S'
        })
      });
      this.showNotification(`Lane ${lane.laneNumber || ''} Transaction: ${l1}`, 'info');
    } catch (e) {
      this.showNotification(`Error: ${e.message}`, 'error');
    }
  }

  async probeDevice(deviceId) {
    const dev = this.deviceManager.devices.find(d => d.id === deviceId);
    if (!dev) return;

    this.showNotification(`Testing TCP socket to ${dev.ip}:${dev.port}...`, 'info');
    const result = await this.deviceManager.testConnection(dev.ip, dev.port, dev.protocol);
    if (result.reachable) {
      this.showNotification(`Socket ONLINE! Latency: ${result.latency} ms`, 'success');
    } else {
      this.showNotification(`Socket OFFLINE: ${result.error}`, 'error');
    }
  }

  triggerEmergencyBroadcast() {
    if (!confirm('BROADCAST EMERGENCY HAZARD ALERT TO ALL PLAZA & APPROACH DISPLAYS?')) return;

    fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceIds: ['ALL'],
        command: 'D',
        line1: 'ACCIDENT AHEAD 2 KM',
        line2: 'DRIVE SLOW - CAUTION',
        color: 'R',
        effect: 'F',
        speed: '08'
      })
    }).then(() => {
      this.showNotification('EMERGENCY ALERT DISPATCHED TO ALL HARDWARE DISPLAYS!', 'error');
    });
  }

  async runSubnetScan() {
    const subnet = document.getElementById('scan-subnet')?.value || '192.168.1';
    const startHost = parseInt(document.getElementById('scan-start')?.value || 100, 10);
    const endHost = parseInt(document.getElementById('scan-end')?.value || 130, 10);
    const port = parseInt(document.getElementById('scan-port')?.value || 5005, 10);

    const scanBtn = document.getElementById('btn-run-scan');
    const resultsContainer = document.getElementById('scan-results-container');
    if (scanBtn) scanBtn.textContent = '⏳ Scanning LAN...';
    if (resultsContainer) resultsContainer.innerHTML = '<p style="color: var(--accent-cyan); padding: 12px;">Scanning IP range...</p>';

    try {
      const res = await fetch('/api/scan-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet, startHost, endHost, port })
      });
      const data = await res.json();
      if (data.success && data.discovered) {
        if (data.discovered.length === 0) {
          resultsContainer.innerHTML = `<p style="color: var(--text-muted); padding: 12px;">No active VMS listening on ${subnet}.${startHost}-${endHost}:${port}. Check IP subnet or cables.</p>`;
        } else {
          resultsContainer.innerHTML = `
            <div style="margin-top: 10px;">
              <h5 style="color: var(--led-green); margin-bottom: 8px;">Discovered ${data.discovered.length} Active VMS Hardware:</h5>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${data.discovered.map(d => `
                  <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.4); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                    <span style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-cyan);">${d.ip}:${d.port}</span>
                    <button class="btn btn-primary btn-sm" onclick="window.app.quickAddDiscovered('${d.ip}', ${d.port})">
                      ➕ Add to Fleet
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      }
    } catch (e) {
      if (resultsContainer) resultsContainer.innerHTML = `<p style="color: var(--led-red); padding: 12px;">Scan error: ${e.message}</p>`;
    } finally {
      if (scanBtn) scanBtn.textContent = '🔍 Scan Subnet';
    }
  }

  quickAddDiscovered(ip, port) {
    this.deviceManager.openAddModal('GANTRY');
    document.getElementById('new-dev-ip').value = ip;
    document.getElementById('new-dev-port').value = port;
    document.getElementById('new-dev-name').value = `VMS Display [${ip}]`;
  }

  async connectWebSerial() {
    if (!('serial' in navigator)) {
      alert('Web Serial API is not supported in this browser. Please use Chrome or Edge for direct USB-to-RS485 connection.');
      return;
    }

    try {
      this.serialPort = await navigator.serial.requestPort();
      await this.serialPort.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' });
      this.serialWriter = this.serialPort.writable.getWriter();
      this.showNotification('Direct RS485 Serial Port Connected!', 'success');

      const btn = document.getElementById('btn-connect-serial');
      if (btn) btn.innerHTML = '🔌 RS485 Connected';
    } catch (err) {
      this.showNotification(`Serial Port error: ${err.message}`, 'error');
    }
  }

  showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      border-radius: 8px;
      background: ${type === 'success' ? '#065f46' : (type === 'error' ? '#991b1b' : '#1e293b')};
      color: #fff;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.2);
      z-index: 9999;
      animation: fadeIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new TollVMSApp();
  window.app.init();
});
