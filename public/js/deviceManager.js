/**
 * Production Toll Plaza Device Fleet & Lane Manager
 * Supports dynamic addition, editing, removal of Lanes & VMS boards,
 * persistent synchronization, and live LAN subnet scanning.
 */

class DeviceManager {
  constructor(app) {
    this.app = app;
    this.devices = [];
    this.selectedDeviceId = 'canopy-01';
  }

  setDevices(devices) {
    this.devices = devices;
    // If selected device was deleted, select first available
    if (!this.devices.some(d => d.id === this.selectedDeviceId) && this.devices.length > 0) {
      this.selectedDeviceId = this.devices[0].id;
    }
    this.render();
  }

  getSelectedDevice() {
    return this.devices.find(d => d.id === this.selectedDeviceId) || this.devices[0];
  }

  selectDevice(id) {
    this.selectedDeviceId = id;
    const dev = this.getSelectedDevice();
    if (dev && this.app.onDeviceSelected) {
      this.app.onDeviceSelected(dev);
    }
    this.render();
  }

  async testConnection(ip, port, protocol) {
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port, protocol })
      });
      return await res.json();
    } catch (e) {
      return { success: false, reachable: false, error: e.message };
    }
  }

  async saveDevice(deviceData) {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      });
      const data = await res.json();
      if (data.success) {
        this.app.showNotification(`VMS "${deviceData.name}" saved to plaza registry!`, 'success');
      }
      return data;
    } catch (e) {
      this.app.showNotification(`Failed to save: ${e.message}`, 'error');
      return { success: false, error: e.message };
    }
  }

  async deleteDevice(id) {
    const dev = this.devices.find(d => d.id === id);
    const name = dev ? dev.name : 'this device';
    if (!confirm(`Are you sure you want to permanently remove "${name}" from the plaza network?`)) return;

    try {
      const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.app.showNotification(`Removed "${name}" from plaza registry.`, 'info');
      }
    } catch (e) {
      this.app.showNotification(`Error: ${e.message}`, 'error');
    }
  }

  openEditModal(deviceId) {
    const dev = this.devices.find(d => d.id === deviceId);
    if (!dev) return;

    document.getElementById('edit-dev-id').value = dev.id;
    document.getElementById('new-dev-name').value = dev.name;
    document.getElementById('new-dev-ip').value = dev.ip;
    document.getElementById('new-dev-port').value = dev.port;
    document.getElementById('new-dev-proto').value = dev.protocol || 'NHAI_ASCII';
    document.getElementById('new-dev-type').value = dev.type || 'GANTRY';
    document.getElementById('new-dev-lane').value = dev.laneNumber || '';
    document.getElementById('new-dev-matrix').value = `${dev.matrixWidth || 192}x${dev.matrixHeight || 32}`;

    document.getElementById('modal-device-title').textContent = `Edit Hardware: ${dev.name}`;
    document.getElementById('modal-add-device').style.display = 'flex';
  }

  openAddModal(defaultType = 'GANTRY') {
    document.getElementById('form-add-device').reset();
    document.getElementById('edit-dev-id').value = '';
    document.getElementById('modal-device-title').textContent = 'Add Physical VMS Hardware';
    document.getElementById('new-dev-type').value = defaultType;
    document.getElementById('new-dev-proto').value = 'HUIDU_A3';
    document.getElementById('new-dev-port').value = 10001;

    if (defaultType === 'LANE_UFD') {
      const existingLanes = this.devices.filter(d => d.type === 'LANE_UFD' && d.laneNumber).map(d => Number(d.laneNumber));
      const nextLane = existingLanes.length > 0 ? Math.max(...existingLanes) + 1 : 1;
      document.getElementById('new-dev-lane').value = nextLane;
      document.getElementById('new-dev-name').value = `Lane ${String(nextLane).padStart(2, '0')} - FASTag UFD & LCS`;
      document.getElementById('new-dev-matrix').value = '96x32';
      document.getElementById('new-dev-ip').value = `192.168.1.${110 + nextLane}`;
    }

    document.getElementById('modal-add-device').style.display = 'flex';
  }

  render() {
    // 1. Target VMS Dropdown in Overview Top Bar
    const dropdown = document.getElementById('device-select-dropdown');
    if (dropdown) {
      dropdown.innerHTML = this.devices.map(d => {
        const isSel = d.id === this.selectedDeviceId ? 'selected' : '';
        const statusIcon = d.status === 'connected' ? '🟢' : '🔴';
        return `<option value="${d.id}" ${isSel}>${statusIcon} ${d.name} [${d.ip}:${d.port}]</option>`;
      }).join('');
    }

    // 2. Hardware Fleet Grid
    const fleetGrid = document.getElementById('fleet-devices-grid');
    if (fleetGrid) {
      fleetGrid.innerHTML = this.devices.map(d => {
        const isSel = d.id === this.selectedDeviceId;
        const isConnected = d.status === 'connected';
        const statusBadge = isConnected
          ? `<span style="background: rgba(0, 230, 118, 0.15); color: var(--led-green); border: 1px solid var(--led-green); padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">ONLINE</span>`
          : `<span style="background: rgba(255, 51, 75, 0.15); color: var(--led-red); border: 1px solid var(--led-red); padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">OFFLINE</span>`;

        return `
          <div class="card" style="border: ${isSel ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)'};">
            <div class="card-header">
              <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; color: #fff;">${d.name}</h4>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 3px;">
                  IP: <span style="color: var(--accent-cyan); font-weight: 600;">${d.ip}</span> | PORT: <span style="color: var(--accent-cyan);">${d.port}</span>
                </div>
              </div>
              <div>${statusBadge}</div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; font-size: 0.78rem;">
              <div>
                <div style="color: var(--text-muted); font-size: 0.68rem;">PROTOCOL</div>
                <div style="font-weight: 600; color: #fbbf24;">${d.protocol || 'NHAI'}</div>
              </div>
              <div>
                <div style="color: var(--text-muted); font-size: 0.68rem;">RESOLUTION</div>
                <div style="font-weight: 600; color: var(--text-primary);">${d.matrixWidth || 192}×${d.matrixHeight || 32}</div>
              </div>
              <div>
                <div style="color: var(--text-muted); font-size: 0.68rem;">PING</div>
                <div style="font-weight: 600; color: ${isConnected ? 'var(--led-green)' : 'var(--text-muted)'};">
                  ${d.telemetry?.pingMs ? d.telemetry.pingMs + ' ms' : (isConnected ? '< 10 ms' : 'Offline')}
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 12px; align-items: center; flex-wrap: wrap;">
              <button class="btn btn-secondary" onclick="window.app.probeDevice('${d.id}')" style="font-size: 0.75rem; padding: 6px 10px;">
                ⚡ Test Socket
              </button>
              <button class="btn btn-secondary" onclick="window.app.deviceManager.openEditModal('${d.id}')" style="font-size: 0.75rem; padding: 6px 10px;">
                ✏️ Edit
              </button>
              <button class="btn btn-secondary" onclick="window.app.deviceManager.deleteDevice('${d.id}')" style="font-size: 0.75rem; padding: 6px 10px; color: var(--led-red); border-color: rgba(255, 51, 75, 0.3);">
                🗑️ Remove
              </button>
              <button class="btn btn-primary" onclick="window.app.selectDevice('${d.id}')" style="font-size: 0.75rem; padding: 6px 12px; margin-left: auto;">
                ${isSel ? 'Active Target' : 'Select Target'}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // 3. Lane Cards in Lane Overview Tab
    const lanesContainer = document.getElementById('lanes-cards-container');
    if (lanesContainer) {
      const laneDevs = this.devices.filter(d => d.type === 'LANE_UFD').sort((a, b) => (Number(a.laneNumber) || 0) - (Number(b.laneNumber) || 0));

      if (laneDevs.length === 0) {
        lanesContainer.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed var(--border-color);">
            <p style="color: var(--text-muted); margin-bottom: 12px;">No Toll Lanes configured currently.</p>
            <button class="btn btn-primary" onclick="window.app.deviceManager.openAddModal('LANE_UFD')">➕ Add Lane 01</button>
          </div>
        `;
        return;
      }

      lanesContainer.innerHTML = laneDevs.map(lane => {
        const isOpen = lane.laneSignal === 'G';
        const signalIcon = isOpen ? '↓' : '✕';
        const signalClass = isOpen ? 'signal-open' : 'signal-closed';
        const signalText = isOpen ? 'OPEN' : 'CLOSED';
        const isOnline = lane.status === 'connected';

        return `
          <div class="lane-card">
            <div class="lane-header">
              <div class="lane-title">
                <span>🛣️ Lane ${String(lane.laneNumber || '01').padStart(2, '0')}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${lane.ip}:${lane.port}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isOnline ? 'var(--led-green)' : 'var(--led-red)'};" title="${isOnline ? 'Hardware Online' : 'Hardware Offline'}"></span>
                <div class="lane-signal-badge ${signalClass}">${signalIcon}</div>
              </div>
            </div>

            <!-- Hardware UFD Mirror Box -->
            <div class="lane-ufd-display">
              <div class="ufd-line1">${lane.currentMessage?.line1 || 'FASTag LANE'}</div>
              <div class="ufd-line2">${lane.currentMessage?.line2 || 'VALID VEHICLE'}</div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
              <span style="color: var(--text-muted);">Signal: <strong style="color: ${isOpen ? 'var(--led-green)' : 'var(--led-red)'}">${signalText}</strong></span>
              <span style="color: var(--text-muted);">Hardware: <strong style="color: ${isOnline ? 'var(--led-green)' : 'var(--led-red)'}">${isOnline ? 'ONLINE' : 'OFFLINE'}</strong></span>
            </div>

            <!-- Lane Open / Close Controls -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="btn btn-secondary" onclick="window.app.setLaneSignal('${lane.id}', 'G')" style="border-color: rgba(0, 230, 118, 0.4); color: var(--led-green); font-size: 0.78rem; padding: 6px;">
                🟢 Open (↓)
              </button>
              <button class="btn btn-secondary" onclick="window.app.setLaneSignal('${lane.id}', 'R')" style="border-color: rgba(255, 51, 75, 0.4); color: var(--led-red); font-size: 0.78rem; padding: 6px;">
                🔴 Close (✕)
              </button>
            </div>

            <!-- TLC FASTag Transaction Simulator buttons -->
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary" onclick="window.app.simulateLaneTransaction('${lane.id}', 'SUCCESS')" style="font-size: 0.72rem; padding: 5px; flex: 1;">
                💳 FASTag ₹85
              </button>
              <button class="btn btn-secondary" onclick="window.app.simulateLaneTransaction('${lane.id}', 'LOW_BAL')" style="font-size: 0.72rem; padding: 5px; flex: 1;">
                ⚠️ Low Bal
              </button>
              <button class="btn btn-secondary" onclick="window.app.simulateLaneTransaction('${lane.id}', 'BLACKLIST')" style="font-size: 0.72rem; padding: 5px; flex: 1;">
                🚫 Blacklist
              </button>
            </div>

            <!-- Lane Edit / Delete Action Strip -->
            <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="window.app.deviceManager.openEditModal('${lane.id}')" style="font-size: 0.7rem; padding: 4px 8px;">
                ✏️ Edit
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.app.deviceManager.deleteDevice('${lane.id}')" style="font-size: 0.7rem; padding: 4px 8px; color: var(--led-red);">
                🗑️ Delete
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

window.DeviceManager = DeviceManager;
