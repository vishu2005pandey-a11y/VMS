/**
 * Central Cloud Telemetry & Sync Engine
 * Enables local Toll Plaza servers to automatically stream live hardware health,
 * active VMS messages, and FASTag transactions upward to Central HQ (Render/Cloud).
 */

class CloudSyncEngine {
  constructor(options = {}) {
    this.centralUrl = options.centralUrl || process.env.CENTRAL_CLOUD_URL || '';
    this.plazaCode = options.plazaCode || 'TECSIDEL-NHAI-01';
    this.syncIntervalSec = options.syncIntervalSec || 10;
    this.timer = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.lastSyncStatus = 'INITIALIZING';
    this.packetsSent = 0;
  }

  setCentralUrl(url) {
    this.centralUrl = url;
  }

  start(getPlazaDataCallback) {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(async () => {
      if (!this.centralUrl || this.isSyncing) return;

      try {
        this.isSyncing = true;
        const plazaData = getPlazaDataCallback();
        const payload = {
          plazaCode: plazaData.plazaInfo.plazaCode,
          plazaName: plazaData.plazaInfo.plazaName,
          timestamp: new Date().toISOString(),
          activeDevicesCount: plazaData.devices.filter(d => d.status === 'connected').length,
          totalDevicesCount: plazaData.devices.length,
          devices: plazaData.devices.map(d => ({
            id: d.id,
            name: d.name,
            type: d.type,
            ip: d.ip,
            port: d.port,
            protocol: d.protocol,
            status: d.status,
            laneNumber: d.laneNumber,
            laneSignal: d.laneSignal,
            currentMessage: d.currentMessage,
            telemetry: d.telemetry,
            lastSeen: d.lastSeen
          }))
        };

        const targetEndpoint = `${this.centralUrl.replace(/\/$/, '')}/api/central/sync`;
        const res = await fetch(targetEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          this.packetsSent++;
          this.lastSyncTime = new Date().toISOString();
          this.lastSyncStatus = 'SYNCED_OK';
        } else {
          this.lastSyncStatus = `HTTP_${res.status}`;
        }
      } catch (err) {
        this.lastSyncStatus = `ERROR: ${err.message}`;
      } finally {
        this.isSyncing = false;
      }
    }, this.syncIntervalSec * 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getStatus() {
    return {
      centralUrl: this.centralUrl,
      syncIntervalSec: this.syncIntervalSec,
      lastSyncTime: this.lastSyncTime,
      lastSyncStatus: this.lastSyncStatus,
      packetsSent: this.packetsSent
    };
  }
}

module.exports = CloudSyncEngine;
