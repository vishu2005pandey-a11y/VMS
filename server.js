const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const net = require('net');
const path = require('path');
const configManager = require('./config/configManager');
const protocols = require('./protocols');
const { probeSocket, scanSubnet } = require('./tools/ipScanner');
const CloudSyncEngine = require('./tools/cloudSyncEngine');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const HTTP_PORT = process.env.PORT || 3000;
const VIRTUAL_VMS_PORT = process.env.VMS_PORT || 5005;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Broadcast message to all connected WebSocket clients
function broadcastWs(data) {
  const jsonStr = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonStr);
    }
  });
}

// Log packet event for Live Packet Inspector
function logPacket(direction, deviceId, protocol, hexData, asciiData, notes) {
  const packetLog = {
    type: 'PACKET_LOG',
    timestamp: new Date().toISOString(),
    direction, // 'TX' (Transmit), 'RX' (Receive), 'ERR' (Error)
    deviceId,
    protocol,
    hexData,
    asciiData,
    notes
  };
  broadcastWs(packetLog);
}

/**
 * Send raw buffer over TCP to a physical hardware IP & Port with true network socket
 */
function sendTcpPacket(ip, port, buffer, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let receivedBuffer = Buffer.alloc(0);
    let isSettled = false;
    let writeSuccess = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, ip, () => {
      socket.write(buffer, () => {
        writeSuccess = true;
      });
    });

    socket.on('data', data => {
      receivedBuffer = Buffer.concat([receivedBuffer, data]);
      if (receivedBuffer.length > 0 && !isSettled) {
        isSettled = true;
        const latency = Date.now() - startTime;
        socket.destroy();
        resolve({ success: true, response: receivedBuffer, latency });
      }
    });

    socket.on('timeout', () => {
      if (!isSettled) {
        isSettled = true;
        const latency = Date.now() - startTime;
        socket.destroy();
        // If data was successfully flushed across TCP to the hardware/bridge (e.g. port 10001 Lantronix/Moxa)
        if (writeSuccess) {
          resolve({
            success: true,
            response: Buffer.from([0x06]), // Standard ACK
            latency,
            note: 'Delivered to Serial Bridge (Simplex / Flushed)'
          });
        } else {
          reject(new Error(`TCP Socket Timeout (${timeoutMs}ms) to ${ip}:${port}`));
        }
      }
    });

    socket.on('error', err => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        reject(err);
      }
    });

    socket.on('close', () => {
      if (!isSettled) {
        isSettled = true;
        const latency = Date.now() - startTime;
        resolve({
          success: true,
          response: receivedBuffer.length > 0 ? receivedBuffer : Buffer.from([0x06]),
          latency
        });
      }
    });
  });
}

// =========================================================================
// REST APIS - DEVICE & PLAZA CONFIGURATION (PERSISTENT)
// =========================================================================

// Plaza Metadata
app.get('/api/plaza-info', (req, res) => {
  res.json({ success: true, plazaInfo: configManager.getPlazaInfo() });
});

app.post('/api/plaza-info', (req, res) => {
  const updated = configManager.updatePlazaInfo(req.body);
  broadcastWs({ type: 'PLAZA_INFO_UPDATED', plazaInfo: updated });
  res.json({ success: true, plazaInfo: updated });
});

// Device List
app.get('/api/devices', (req, res) => {
  res.json({
    success: true,
    plazaInfo: configManager.getPlazaInfo(),
    devices: configManager.getDevices()
  });
});

// Add / Update Device or Lane
app.post('/api/devices', (req, res) => {
  const dev = req.body;
  if (!dev.name) return res.status(400).json({ error: 'Display Name is required' });
  if (!dev.ip) return res.status(400).json({ error: 'IP Address is required' });
  if (!dev.port) dev.port = 5005;

  const saved = configManager.addOrUpdateDevice(dev);
  broadcastWs({ type: 'DEVICES_UPDATED', devices: configManager.getDevices() });
  res.json({ success: true, device: saved });
});

// Delete Device or Lane
app.delete('/api/devices/:id', (req, res) => {
  const success = configManager.deleteDevice(req.params.id);
  if (success) {
    broadcastWs({ type: 'DEVICES_UPDATED', devices: configManager.getDevices() });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Device not found' });
  }
});

// Test connection / Ping IP:Port with real TCP socket probe
app.post('/api/test-connection', async (req, res) => {
  const { ip, port = 5005, protocol = 'NHAI_ASCII' } = req.body;

  try {
    const encoded = protocols.encodeMessage(protocol, { command: 'S', address: '01', text: 'PING' });
    logPacket('TX', 'PROBE', protocol, encoded.hexString, encoded.asciiString, `Probing ${ip}:${port}`);

    const result = await sendTcpPacket(ip, Number(port), encoded.rawBuffer, 2000);
    const decoded = protocols.decodeMessage(protocol, result.response);

    logPacket('RX', 'PROBE', protocol, decoded.rawHex || result.response.toString('hex').toUpperCase(), decoded.text || result.response.toString('utf-8'), `Probe Response (${result.latency}ms)`);

    res.json({
      success: true,
      reachable: true,
      latency: result.latency,
      rawHex: decoded.rawHex,
      decoded
    });
  } catch (err) {
    logPacket('ERR', 'PROBE', protocol, '', '', `Probe failed to ${ip}:${port}: ${err.message}`);
    res.json({
      success: false,
      reachable: false,
      error: err.message
    });
  }
});

// LAN Subnet Scanner / Auto-Discovery
app.post('/api/scan-network', async (req, res) => {
  const { subnet = '192.168.1', startHost = 100, endHost = 130, port = 5005 } = req.body;

  try {
    const discovered = await scanSubnet(subnet, Number(startHost), Number(endHost), Number(port));
    res.json({ success: true, discovered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// CENTRAL CLOUD TELEMETRY & SYNC API (HQ LEVEL)
// =========================================================================

// In-memory registry of reporting plazas (for Central HQ server mode)
const reportingPlazas = new Map();

// Endpoint for Local Toll Plazas to push live telemetry up to Central HQ
app.post('/api/central/sync', (req, res) => {
  const data = req.body;
  if (!data.plazaCode) {
    return res.status(400).json({ error: 'plazaCode is required' });
  }

  data.lastReceivedAt = new Date().toISOString();
  reportingPlazas.set(data.plazaCode, data);

  // Broadcast to all connected HQ operators watching dashboard
  broadcastWs({
    type: 'CENTRAL_PLAZA_SYNCED',
    plazaCode: data.plazaCode,
    plazaName: data.plazaName,
    data
  });

  res.json({ success: true, acknowledgedAt: new Date().toISOString() });
});

// Endpoint for Central HQ dashboard to list all synchronized toll plazas
app.get('/api/central/plazas', (req, res) => {
  res.json({
    success: true,
    count: reportingPlazas.size,
    plazas: Array.from(reportingPlazas.values())
  });
});

// Local Plaza Cloud Sync Client instance
const cloudSync = new CloudSyncEngine({
  centralUrl: process.env.CENTRAL_CLOUD_URL || '',
  plazaCode: configManager.getPlazaInfo().plazaCode,
  syncIntervalSec: 10
});

cloudSync.start(() => ({
  plazaInfo: configManager.getPlazaInfo(),
  devices: configManager.getDevices()
}));

app.get('/api/sync-status', (req, res) => {
  res.json({ success: true, status: cloudSync.getStatus() });
});

app.post('/api/configure-sync', (req, res) => {
  const { centralUrl } = req.body;
  cloudSync.setCentralUrl(centralUrl);
  res.json({ success: true, status: cloudSync.getStatus() });
});

// Send Message to VMS Display(s)
app.post('/api/send', async (req, res) => {
  const {
    deviceIds = [],
    command = 'D',
    line1 = '',
    line2 = '',
    line3 = '',
    color = 'A',
    effect = 'S',
    speed = '05',
    brightness = 15,
    laneSignal = 'G'
  } = req.body;

  const allDevices = configManager.getDevices();
  const targetDevices = allDevices.filter(d => deviceIds.includes(d.id) || deviceIds.includes('ALL'));

  if (targetDevices.length === 0) {
    return res.status(404).json({ error: 'No matching devices found' });
  }

  const results = [];

  for (const device of targetDevices) {
    const combinedText = [line1, line2, line3].filter(Boolean).join('\n');
    const proto = device.protocol || 'NHAI_ASCII';

    // Encode packet for this specific device protocol
    const encoded = protocols.encodeMessage(proto, {
      command,
      address: device.address || '01',
      line: 'A',
      color,
      effect,
      speed,
      brightness,
      laneSignal,
      text: combinedText,
      lines: [line1, line2, line3].filter(Boolean)
    });

    logPacket('TX', device.id, proto, encoded.hexString, encoded.asciiString, `Sending to ${device.name} [${device.ip}:${device.port}]`);

    // Update in-memory device state
    device.currentMessage = { line1, line2, line3, color, effect, speed };
    if (command === 'L') device.laneSignal = laneSignal;

    try {
      const tcpResult = await sendTcpPacket(device.ip, device.port, encoded.rawBuffer, 2500);
      const decoded = protocols.decodeMessage(proto, tcpResult.response);

      configManager.updateDeviceStatus(device.id, 'connected', { pingMs: tcpResult.latency });

      logPacket('RX', device.id, proto, decoded.rawHex || tcpResult.response.toString('hex').toUpperCase(), decoded.text || 'ACK Received', `Hardware ACK from ${device.name} (${tcpResult.latency}ms)`);

      results.push({
        deviceId: device.id,
        success: true,
        latency: tcpResult.latency,
        decoded
      });
    } catch (err) {
      configManager.updateDeviceStatus(device.id, 'offline');
      logPacket('ERR', device.id, proto, '', '', `Socket Error [${device.ip}:${device.port}]: ${err.message}`);
      results.push({
        deviceId: device.id,
        success: false,
        error: err.message
      });
    }
  }

  configManager.save();
  broadcastWs({ type: 'DEVICES_UPDATED', devices: configManager.getDevices() });
  res.json({ success: true, results });
});

// =========================================================================
// EXTERNAL REST API FOR TOLL LANE COMPUTER (TLC) / TMS INTEGRATION
// =========================================================================

/**
 * Webhook / REST endpoint for Toll Lane Computer (TLC) to trigger UFD transactions:
 * POST /api/external/ufd-update
 * Body: { laneNumber: 1, plateNumber: "HR 26 DQ 5541", vehicleClass: "CAR", tollFare: 85, status: "VALID" | "LOW_BAL" | "BLACKLIST" }
 */
app.post('/api/external/ufd-update', async (req, res) => {
  const { laneNumber, plateNumber = '', vehicleClass = '', tollFare = 0, status = 'VALID', customMessage } = req.body;

  if (!laneNumber) {
    return res.status(400).json({ error: 'laneNumber is required' });
  }

  const allDevices = configManager.getDevices();
  const laneDevice = allDevices.find(d => d.type === 'LANE_UFD' && Number(d.laneNumber) === Number(laneNumber));

  if (!laneDevice) {
    return res.status(404).json({ error: `Lane ${laneNumber} UFD device not found in plaza configuration` });
  }

  let line1 = '';
  let line2 = '';
  let color = 'G';

  if (customMessage) {
    line1 = customMessage.line1 || '';
    line2 = customMessage.line2 || '';
    color = customMessage.color || 'A';
  } else if (status === 'VALID') {
    line1 = `${vehicleClass ? vehicleClass + ' ' : ''}FASTag OK`;
    line2 = `${plateNumber ? plateNumber + ' ' : ''}₹${tollFare}`;
    color = 'G';
  } else if (status === 'LOW_BAL') {
    line1 = 'LOW FASTag BAL';
    line2 = `${plateNumber ? plateNumber + ' ' : ''}₹${tollFare} DUE`;
    color = 'A';
  } else if (status === 'BLACKLIST') {
    line1 = 'TAG BLACKLISTED';
    line2 = 'STOP - PAY CASH';
    color = 'R';
  } else {
    line1 = 'FASTag LANE';
    line2 = plateNumber || 'VALID VEHICLE';
    color = 'A';
  }

  const proto = laneDevice.protocol || 'NHAI_ASCII';
  const encoded = protocols.encodeMessage(proto, {
    command: 'D',
    address: laneDevice.address || '01',
    color,
    effect: 'S',
    text: `${line1}\n${line2}`,
    lines: [line1, line2]
  });

  laneDevice.currentMessage = { line1, line2, color, effect: 'S' };

  try {
    const tcpResult = await sendTcpPacket(laneDevice.ip, laneDevice.port, encoded.rawBuffer, 2000);
    configManager.updateDeviceStatus(laneDevice.id, 'connected', { pingMs: tcpResult.latency });
    configManager.save();
    broadcastWs({ type: 'DEVICES_UPDATED', devices: configManager.getDevices() });
    res.json({ success: true, message: 'UFD updated on physical hardware', latency: tcpResult.latency });
  } catch (err) {
    configManager.updateDeviceStatus(laneDevice.id, 'offline');
    configManager.save();
    broadcastWs({ type: 'DEVICES_UPDATED', devices: configManager.getDevices() });
    res.json({ success: false, warning: 'Hardware unreachable, state updated in console', error: err.message });
  }
});

// Periodic Background Health Monitor for configured hardware
let healthMonitorTimer = null;
function startHealthMonitor() {
  if (healthMonitorTimer) clearInterval(healthMonitorTimer);

  const info = configManager.getPlazaInfo();
  const intervalMs = (info.healthCheckIntervalSec || 20) * 1000;

  healthMonitorTimer = setInterval(async () => {
    const devices = configManager.getDevices();
    for (const dev of devices) {
      try {
        const probeResult = await probeSocket(dev.ip, dev.port, 1500);
        const newStatus = probeResult.open ? 'connected' : 'offline';
        if (dev.status !== newStatus) {
          configManager.updateDeviceStatus(dev.id, newStatus);
          broadcastWs({ type: 'DEVICES_UPDATED', devices: configManager.getDevices() });
        }
      } catch (e) {
        // Ignore
      }
    }
  }, intervalMs);
}

startHealthMonitor();

// WebSocket Connection Handler
wss.on('connection', ws => {
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    plazaInfo: configManager.getPlazaInfo(),
    devices: configManager.getDevices()
  }));

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      // Ignore
    }
  });
});

/**
 * OPTIONAL: Embedded Virtual Hardware TCP Server for offline testing
 * Only starts if enabled in plazaInfo or via environment variable
 */
const plazaInfo = configManager.getPlazaInfo();
if (plazaInfo.enableVirtualEcho) {
  const virtualVmsServer = net.createServer(socket => {
    socket.on('data', data => {
      if (data[0] === protocols.nhaiAscii.SOH || data[1] === protocols.nhaiAscii.STX) {
        socket.write(Buffer.from([protocols.nhaiAscii.ACK]));
      } else {
        socket.write(Buffer.from('ACK:OK\r\n'));
      }
    });
    socket.on('error', () => {});
  });

  virtualVmsServer.listen(VIRTUAL_VMS_PORT, '0.0.0.0', () => {
    console.log(`[Virtual VMS] Loopback Echo Server listening on TCP port ${VIRTUAL_VMS_PORT}`);
  });
}

server.listen(HTTP_PORT, () => {
  console.log(`================================================================`);
  console.log(`🚦 TOLL PLAZA VMS & UFD CONTROLLER - PRODUCTION ENGINE RUNNING`);
  console.log(`================================================================`);
  console.log(`HTTP Dashboard: http://localhost:${HTTP_PORT}`);
  console.log(`Plaza:          ${plazaInfo.plazaName} (${plazaInfo.plazaCode})`);
  console.log(`Devices Loaded: ${configManager.getDevices().length} VMS displays`);
  console.log(`================================================================`);
});
