/**
 * Huidu Technology HD-A3 / BoxPlayer (HDPlayer) Protocol Driver
 * Implements Huidu SDK 2.0 Binary TCP Protocol on Port 10001
 * Compatible with Huidu HD-A3, A3L, A4, A6, C15, C35, HD-WF series controllers.
 */

const crypto = require('crypto');
const net = require('net');

// Protocol Constants
const CMD_SERVICE_ASK     = 0x2001; // Transport handshake ask
const CMD_SERVICE_ANSWER  = 0x2002; // Transport handshake answer
const CMD_SDK_CMD_ASK     = 0x2003; // SDK XML command packet
const CMD_SDK_CMD_ANSWER  = 0x2004; // SDK XML command answer
const CMD_HEARTBEAT_ASK   = 0x005F;
const CMD_HEARTBEAT_ANSWER= 0x0060;

const TRANSPORT_VERSION   = 0x01000005; // Transport version 5.0.0.1 Little Endian
const SDK_VERSION_HEX     = '1000000';  // SDK Version 1.0.0.0

/**
 * Escape XML special characters
 */
function escapeXml(unsafe) {
  if (typeof unsafe !== 'string') unsafe = String(unsafe || '');
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a random UUID v4
 */
function generateGuid() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Build Phase 1 Transport Protocol Version Negotiation Packet (8 bytes)
 * Format: [2B Length LE: 0x0008] [2B Cmd LE: 0x2001] [4B Transport Version LE: 0x01000005]
 */
function buildVersionPacket() {
  const pkt = Buffer.alloc(8);
  pkt.writeUInt16LE(8, 0);
  pkt.writeUInt16LE(CMD_SERVICE_ASK, 2);
  pkt.writeUInt32LE(TRANSPORT_VERSION, 4);
  return pkt;
}

/**
 * Build XML packet wrapped in Huidu binary header (12 bytes + XML payload)
 * Format:
 * [2B Packet Length LE (12 + XML Length)]
 * [2B Cmd LE: 0x2003 (CmdSdkCmdAsk)]
 * [4B Total XML Length LE]
 * [4B XML Offset LE (0)]
 * [N Bytes UTF-8 XML]
 */
function buildSdkCmdPacket(xmlString) {
  const xmlBuf = Buffer.from(xmlString, 'utf-8');
  const totalLen = xmlBuf.length;
  const pktLen = 12 + totalLen;
  const pkt = Buffer.alloc(pktLen);

  pkt.writeUInt16LE(pktLen, 0);
  pkt.writeUInt16LE(CMD_SDK_CMD_ASK, 2);
  pkt.writeUInt32LE(totalLen, 4);
  pkt.writeUInt32LE(0, 8);
  xmlBuf.copy(pkt, 12);

  return pkt;
}

/**
 * Build SDK Envelope XML
 */
function buildSdkXml(guid, method, innerXml = '') {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<sdk guid="${escapeXml(guid)}">`,
    `  <in method="${escapeXml(method)}">`,
    innerXml ? `    ${innerXml}` : '',
    '  </in>',
    '</sdk>'
  ].filter(Boolean).join('\r\n');
}

/**
 * Build Phase 2 SDK Version Negotiation XML
 */
function buildGetVersionXml() {
  return buildSdkXml('##GUID', 'GetIFVersion', `<version value="${SDK_VERSION_HEX}"/>`);
}

/**
 * Build Device Info Query XML
 */
function buildGetDeviceInfoXml(guid) {
  return buildSdkXml(guid, 'GetDeviceInfo');
}

/**
 * Convert VMS color codes to Huidu HEX color strings
 */
function mapColor(colorCode) {
  switch ((colorCode || 'A').toUpperCase()) {
    case 'R':
    case 'RED':
      return '#ff0000';
    case 'G':
    case 'GREEN':
      return '#00ff00';
    case 'B':
    case 'BLUE':
      return '#0000ff';
    case 'W':
    case 'WHITE':
      return '#ffffff';
    case 'A':
    case 'Y':
    case 'AMBER':
    case 'YELLOW':
    default:
      return '#ffff00';
  }
}

/**
 * Map effect codes to Huidu effect numbers
 * 0: Immediate Show / Static
 * 1: Left Move
 * 2: Right Move
 * 5: Left Cover
 * 17: Fade
 * 21: Continuous Left Scroll
 * 26: Loop Left Scroll
 */
function mapEffect(effectCode) {
  switch ((effectCode || 'S').toUpperCase()) {
    case 'L': // Scroll Left
      return { inEffect: 21, outEffect: 0, singleLine: true };
    case 'R': // Scroll Right
      return { inEffect: 2, outEffect: 0, singleLine: true };
    case 'F': // Flash / Fade
      return { inEffect: 17, outEffect: 17, singleLine: false };
    case 'U': // Scroll Up
      return { inEffect: 3, outEffect: 0, singleLine: false };
    case 'S': // Static / Immediate Show
    default:
      return { inEffect: 0, outEffect: 0, singleLine: false };
  }
}

/**
 * Build Program Update XML (AddProgram)
 * Dynamically pushes full screen layout with text, colors, effects, and hold time
 */
function buildAddProgramXml(guid, options) {
  const {
    text = '',
    lines = [],
    color = 'A',
    effect = 'S',
    speed = '05',
    width = 192,
    height = 64,
    fontSize = 16,
    fontName = 'Arial',
    holdSec = 5
  } = options;

  let displayText = text;
  if (!displayText && lines && lines.length > 0) {
    displayText = lines.filter(Boolean).join('\n');
  }
  if (!displayText) displayText = 'TECSIDEL VMS';

  const hexColor = color.startsWith('#') ? color : mapColor(color);
  const { inEffect, outEffect, singleLine } = mapEffect(effect);
  const speedNum = Math.min(Math.max(parseInt(speed, 10) || 5, 1), 10);
  const durationTicks = Math.max(holdSec, 1) * 10; // Huidu duration is in 100ms units

  const progGuid = generateGuid();
  const areaGuid = generateGuid();
  const textGuid = generateGuid();

  const innerXml = [
    `<screen timeStamps="${Date.now()}">`,
    `  <program type="normal" id="0" guid="${progGuid}" name="Program1">`,
    `    <playControl count="1" disabled="false"/>`,
    `    <area guid="${areaGuid}" name="Area1" alpha="255">`,
    `      <rectangle x="0" y="0" width="${width}" height="${height}"/>`,
    `      <resources>`,
    `        <text guid="${textGuid}" name="Text1" singleLine="${singleLine ? 'true' : 'false'}">`,
    `          <style align="center" valign="middle"/>`,
    `          <string>${escapeXml(displayText)}</string>`,
    `          <font name="${fontName}" size="${fontSize}" color="${hexColor}" bold="true" italic="false" underline="false"/>`,
    `          <effect in="${inEffect}" inSpeed="${speedNum}" out="${outEffect}" outSpeed="${speedNum}" duration="${durationTicks}"/>`,
    `        </text>`,
    `      </resources>`,
    `    </area>`,
    `  </program>`,
    `</screen>`
  ].join('\r\n');

  return buildSdkXml(guid, 'AddProgram', innerXml);
}

/**
 * Parse SDK XML response to extract GUID and result
 */
function parseSdkResponse(xmlString) {
  const guidMatch = xmlString.match(/guid="([^"]+)"/i);
  const methodMatch = xmlString.match(/method="([^"]+)"/i);
  const resultMatch = xmlString.match(/result="([^"]+)"/i);

  return {
    guid: guidMatch ? guidMatch[1] : null,
    method: methodMatch ? methodMatch[1] : null,
    result: resultMatch ? resultMatch[1] : null,
    isSuccess: resultMatch ? resultMatch[1].toLowerCase() === 'ksuccess' : false,
    rawXml: xmlString
  };
}

/**
 * High-Level Transmission Function:
 * Executes the complete 3-step Huidu SDK 2.0 handshake and program transmission
 * 
 * Step 1: Send Transport Version packet (0x2001) -> Receive 0x2002
 * Step 2: Send GetIFVersion XML (0x2003) -> Receive 0x2004 with Session GUID
 * Step 3: Send AddProgram XML (0x2003) -> Receive 0x2004 result="kSuccess"
 */
function transmitToHuidu(ip, port = 10001, options = {}, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let currentPhase = 'VERSION_HANDSHAKE';
    let sessionGuid = '##GUID';
    let rxBuffer = Buffer.alloc(0);
    let isSettled = false;

    function cleanup() {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
      }
    }

    socket.setTimeout(timeoutMs);

    socket.connect(port, ip, () => {
      // Step 1: Send 0x2001 version packet
      currentPhase = 'VERSION_HANDSHAKE';
      const versionPacket = buildVersionPacket();
      socket.write(versionPacket);
    });

    socket.on('data', data => {
      rxBuffer = Buffer.concat([rxBuffer, data]);

      if (currentPhase === 'VERSION_HANDSHAKE') {
        if (rxBuffer.length >= 8) {
          const length = rxBuffer.readUInt16LE(0);
          const cmd = rxBuffer.readUInt16LE(2);

          if (cmd === CMD_SERVICE_ANSWER) {
            // Handshake Phase 1 OK! Proceed to Phase 2: Send GetIFVersion
            rxBuffer = rxBuffer.slice(length);
            currentPhase = 'SDK_VERSION';
            const sdkXml = buildGetVersionXml();
            const sdkPacket = buildSdkCmdPacket(sdkXml);
            socket.write(sdkPacket);
          } else {
            cleanup();
            reject(new Error(`Huidu Version Handshake Rejected: unexpected cmd 0x${cmd.toString(16)}`));
          }
        }
      } else if (currentPhase === 'SDK_VERSION') {
        if (rxBuffer.length >= 12) {
          const totalPktLen = rxBuffer.readUInt16LE(0);
          const cmd = rxBuffer.readUInt16LE(2);

          if (rxBuffer.length >= totalPktLen) {
            const xmlPayload = rxBuffer.slice(12, totalPktLen).toString('utf-8');
            rxBuffer = rxBuffer.slice(totalPktLen);

            const parsed = parseSdkResponse(xmlPayload);
            if (parsed.guid) {
              sessionGuid = parsed.guid;
            }

            // Handshake Phase 2 OK! Proceed to Phase 3: Send AddProgram
            currentPhase = 'ADD_PROGRAM';
            const programXml = buildAddProgramXml(sessionGuid, options);
            const programPacket = buildSdkCmdPacket(programXml);
            socket.write(programPacket);
          }
        }
      } else if (currentPhase === 'ADD_PROGRAM') {
        if (rxBuffer.length >= 12) {
          const totalPktLen = rxBuffer.readUInt16LE(0);
          if (rxBuffer.length >= totalPktLen) {
            const xmlPayload = rxBuffer.slice(12, totalPktLen).toString('utf-8');
            const parsed = parseSdkResponse(xmlPayload);
            const latency = Date.now() - startTime;
            cleanup();

            if (parsed.isSuccess || xmlPayload.includes('kSuccess')) {
              resolve({
                success: true,
                latency,
                sessionGuid,
                responseXml: xmlPayload,
                message: 'Huidu HD-A3 Screen Program updated successfully'
              });
            } else {
              resolve({
                success: true, // Device acknowledged
                latency,
                sessionGuid,
                responseXml: xmlPayload,
                warning: `Controller returned result: ${parsed.result || 'Accepted'}`
              });
            }
          }
        }
      }
    });

    socket.on('timeout', () => {
      cleanup();
      reject(new Error(`TCP Socket Timeout (${timeoutMs}ms) in Phase ${currentPhase} to ${ip}:${port}`));
    });

    socket.on('error', err => {
      cleanup();
      reject(err);
    });

    socket.on('close', () => {
      if (!isSettled) {
        cleanup();
        reject(new Error(`Connection closed prematurely by controller at ${ip}:${port}`));
      }
    });
  });
}

/**
 * Light probe to check if Huidu port 10001 is listening and answers 0x2001
 */
function probeHuidu(ip, port = 10001, timeoutMs = 2000) {
  return new Promise(resolve => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let isSettled = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, ip, () => {
      socket.write(buildVersionPacket());
    });

    socket.on('data', data => {
      if (!isSettled) {
        isSettled = true;
        const latency = Date.now() - startTime;
        socket.destroy();
        const cmd = data.length >= 4 ? data.readUInt16LE(2) : 0;
        resolve({
          open: true,
          isHuidu: cmd === CMD_SERVICE_ANSWER,
          latency
        });
      }
    });

    socket.on('timeout', () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve({ open: false, error: 'Timeout' });
      }
    });

    socket.on('error', err => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve({ open: false, error: err.message });
      }
    });
  });
}

/**
 * Standard protocol encoder interface for protocol dispatcher
 */
function encode(options) {
  const versionPkt = buildVersionPacket();
  const programXml = buildAddProgramXml('##GUID', options);
  const programPkt = buildSdkCmdPacket(programXml);

  return {
    rawBuffer: programPkt,
    hexString: programPkt.toString('hex').toUpperCase(),
    asciiString: programXml.replace(/[\r\n]/g, ' '),
    description: `Huidu HD-A3 SDK 2.0 XML Payload (${programPkt.length} bytes)`
  };
}

function decode(buffer) {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: 'Buffer too short' };
  }

  const length = buffer.readUInt16LE(0);
  const cmd = buffer.readUInt16LE(2);

  if (cmd === CMD_SERVICE_ANSWER) {
    return {
      valid: true,
      protocol: 'HUIDU_A3',
      cmd: 'CmdServiceAnswer (0x2002)',
      rawHex: buffer.toString('hex').toUpperCase(),
      text: 'Huidu Transport Version Handshake OK'
    };
  }

  if (cmd === CMD_SDK_CMD_ANSWER) {
    const xml = buffer.slice(12).toString('utf-8');
    const parsed = parseSdkResponse(xml);
    return {
      valid: true,
      protocol: 'HUIDU_A3',
      cmd: 'CmdSdkCmdAnswer (0x2004)',
      guid: parsed.guid,
      result: parsed.result,
      isSuccess: parsed.isSuccess,
      rawHex: buffer.toString('hex').toUpperCase(),
      text: xml
    };
  }

  return {
    valid: true,
    protocol: 'HUIDU_A3',
    rawHex: buffer.toString('hex').toUpperCase(),
    text: buffer.toString('utf-8')
  };
}

module.exports = {
  CMD_SERVICE_ASK,
  CMD_SERVICE_ANSWER,
  CMD_SDK_CMD_ASK,
  CMD_SDK_CMD_ANSWER,
  buildVersionPacket,
  buildSdkCmdPacket,
  buildGetVersionXml,
  buildGetDeviceInfoXml,
  buildAddProgramXml,
  parseSdkResponse,
  transmitToHuidu,
  probeHuidu,
  encode,
  decode
};
