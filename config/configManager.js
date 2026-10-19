const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'plaza_config.json');

const DEFAULT_CONFIG = {
  plazaInfo: {
    plazaName: "Tecsidel Toll Operations Center",
    plazaCode: "TECSIDEL-NHAI-01",
    highwayName: "Tecsidel Intelligent Transportation Systems (ITS)",
    operator: "Tecsidel Toll Automation & ATMS Division",
    healthCheckIntervalSec: 20,
    enableVirtualEcho: false // Disabled by default for real production
  },
  devices: [
    {
      id: "canopy-01",
      name: "Overhead Canopy Gantry VMS",
      type: "GANTRY",
      laneNumber: null,
      ip: "192.168.1.100",
      port: 5005,
      protocol: "NHAI_ASCII",
      address: "01",
      matrixWidth: 192,
      matrixHeight: 32,
      status: "standby",
      lastSeen: null,
      currentMessage: {
        line1: "FASTag LANE ONLY",
        line2: "कृपया लेन न बदलें",
        color: "A",
        effect: "S",
        speed: "05"
      }
    },
    {
      id: "approach-01",
      name: "Highway Approach 1KM VMS",
      type: "APPROACH",
      laneNumber: null,
      ip: "192.168.1.101",
      port: 5005,
      protocol: "NTCIP_1203",
      address: "02",
      matrixWidth: 160,
      matrixHeight: 32,
      status: "standby",
      lastSeen: null,
      currentMessage: {
        line1: "TOLL PLAZA 1 KM AHEAD",
        line2: "SPEED LIMIT 30 KM/H",
        color: "A",
        effect: "S",
        speed: "05"
      }
    },
    {
      id: "lane-01",
      name: "Lane 01 - FASTag UFD & LCS",
      type: "LANE_UFD",
      laneNumber: 1,
      ip: "192.168.1.111",
      port: 5005,
      protocol: "NHAI_ASCII",
      address: "11",
      matrixWidth: 96,
      matrixHeight: 32,
      laneSignal: "G",
      status: "standby",
      lastSeen: null,
      currentMessage: {
        line1: "FASTag VALID",
        line2: "PROCEED TO LANE",
        color: "G",
        effect: "S",
        speed: "05"
      }
    },
    {
      id: "lane-02",
      name: "Lane 02 - FASTag UFD & LCS",
      type: "LANE_UFD",
      laneNumber: 2,
      ip: "192.168.1.112",
      port: 5005,
      protocol: "NHAI_ASCII",
      address: "12",
      matrixWidth: 96,
      matrixHeight: 32,
      laneSignal: "G",
      status: "standby",
      lastSeen: null,
      currentMessage: {
        line1: "FASTag VALID",
        line2: "PROCEED TO LANE",
        color: "G",
        effect: "S",
        speed: "05"
      }
    },
    {
      id: "lane-03",
      name: "Lane 03 - Cash / ETC Hybrid & LCS",
      type: "LANE_UFD",
      laneNumber: 3,
      ip: "192.168.1.113",
      protocol: "NHAI_ASCII",
      address: "13",
      matrixWidth: 96,
      matrixHeight: 32,
      laneSignal: "G",
      status: "standby",
      lastSeen: null,
      currentMessage: {
        line1: "CASH & FASTAG",
        line2: "STOP - PAY TOLL",
        color: "A",
        effect: "S",
        speed: "05"
      }
    },
    {
      id: "lane-04",
      name: "Lane 04 - FASTag UFD & LCS",
      type: "LANE_UFD",
      laneNumber: 4,
      ip: "192.168.1.114",
      port: 5005,
      protocol: "NHAI_ASCII",
      address: "14",
      matrixWidth: 96,
      matrixHeight: 32,
      laneSignal: "G",
      status: "standby",
      lastSeen: null,
      currentMessage: {
        line1: "FASTag VALID",
        line2: "PROCEED TO LANE",
        color: "G",
        effect: "S",
        speed: "05"
      }
    }
  ]
};

class ConfigManager {
  constructor() {
    this.config = null;
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
      }

      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        this.config = JSON.parse(raw);
      } else {
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        this.save();
      }
    } catch (err) {
      console.error('[ConfigManager] Error reading config file, using defaults:', err.message);
      this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
  }

  save() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[ConfigManager] Failed to write config file:', err.message);
      return false;
    }
  }

  getPlazaInfo() {
    return this.config.plazaInfo;
  }

  updatePlazaInfo(info) {
    this.config.plazaInfo = { ...this.config.plazaInfo, ...info };
    this.save();
    return this.config.plazaInfo;
  }

  getDevices() {
    return this.config.devices;
  }

  getDeviceById(id) {
    return this.config.devices.find(d => d.id === id);
  }

  addOrUpdateDevice(device) {
    if (!device.id) {
      if (device.type === 'LANE_UFD' && device.laneNumber) {
        device.id = `lane-${String(device.laneNumber).padStart(2, '0')}`;
      } else {
        device.id = 'dev-' + Date.now();
      }
    }

    const idx = this.config.devices.findIndex(d => d.id === device.id);
    if (idx >= 0) {
      this.config.devices[idx] = { ...this.config.devices[idx], ...device };
    } else {
      this.config.devices.push(device);
    }

    this.save();
    return this.getDeviceById(device.id);
  }

  deleteDevice(id) {
    const initialLen = this.config.devices.length;
    this.config.devices = this.config.devices.filter(d => d.id !== id);
    if (this.config.devices.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  updateDeviceStatus(id, status, telemetry = null) {
    const dev = this.getDeviceById(id);
    if (dev) {
      dev.status = status;
      if (status === 'connected') {
        dev.lastSeen = new Date().toISOString();
      }
      if (telemetry) {
        dev.telemetry = { ...(dev.telemetry || {}), ...telemetry };
      }
      // Note: we don't necessarily write to disk on every telemetry tick to avoid flash wear
    }
  }
}

module.exports = new ConfigManager();
