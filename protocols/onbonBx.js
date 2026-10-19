/**
 * Onbon BX Series (BX-5 / BX-6 / BX-6E / BX-5E) Controller Card Protocol
 * Heavily used in Indian and international highway VMS & LED matrix signage boards.
 *
 * Typical Packet structure:
 * [Header: 4 bytes A5 A5 A5 A5]
 * [Dest Addr: 2 bytes FE FF]
 * [Src Addr:  2 bytes 00 00]
 * [Reserved:  2 bytes 00 00]
 * [Cmd Group: 1 byte]
 * [Cmd Code:  1 byte]
 * [Data Len:  2 bytes Little Endian]
 * [Payload:   N bytes]
 * [Checksum:  2 bytes CRC16 / Checksum16]
 * [Tail:      1 byte 5A]
 */

function calculateChecksum16(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum = (sum + buffer[i]) & 0xFFFF;
  }
  return sum;
}

/**
 * Encode dynamic text area for Onbon BX
 */
function encode(options) {
  const {
    command = 'D',     // 'D'=Display Text, 'B'=Brightness, 'C'=Clear, 'S'=Status
    text = '',
    brightness = 15,
    font = 'Arial',
    color = 'A',       // 'A'=Amber, 'R'=Red, 'G'=Green, 'W'=White
    effect = 'S'       // 'S'=Static, 'L'=Scroll Left, 'F'=Flash
  } = options;

  let cmdGroup = 0xA3;
  let cmdCode = 0x06;  // Send dynamic area / text
  let payloadBuffer;

  if (command === 'B') {
    // Set Brightness Command
    cmdGroup = 0xA4;
    cmdCode = 0x03;
    payloadBuffer = Buffer.from([0x01, Math.min(15, Math.max(0, brightness))]);
  } else if (command === 'C') {
    // Clear Screen
    cmdGroup = 0xA3;
    cmdCode = 0x01;
    payloadBuffer = Buffer.from([0x00]);
  } else if (command === 'S') {
    // System Status Query
    cmdGroup = 0xA1;
    cmdCode = 0x01;
    payloadBuffer = Buffer.from([0x00]);
  } else {
    // Text Data Payload
    // Color byte: 1=Red, 2=Green, 3=Yellow/Amber, 7=White
    let colorByte = 0x03;
    if (color === 'R') colorByte = 0x01;
    else if (color === 'G') colorByte = 0x02;
    else if (color === 'W') colorByte = 0x07;

    // Display effect: 0x01=Static, 0x03=Left Move, 0x04=Flash
    let effectByte = 0x01;
    if (effect === 'L') effectByte = 0x03;
    else if (effect === 'F') effectByte = 0x04;

    const textBuf = Buffer.from(text, 'utf-8');

    // Dynamic Area Header (Area ID, coordinate X/Y, Width/Height, Display Mode, Stay Time, Speed, Color)
    const areaHeader = Buffer.from([
      0x00, 0x00,             // Area ID = 0
      0x00, 0x00, 0x00, 0x00, // X0, Y0
      0x80, 0x00, 0x20, 0x00, // Width 128, Height 32 (standard sample)
      effectByte,             // Display Mode
      0x05,                   // Speed (1-16)
      0x03, 0x00,             // Stay Time (3 seconds)
      colorByte,              // Text Color
      0x01                    // Sound / Options
    ]);

    payloadBuffer = Buffer.concat([areaHeader, textBuf]);
  }

  const dataLen = payloadBuffer.length;
  const headerPart = Buffer.from([
    0xA5, 0xA5, 0xA5, 0xA5, // Packet Preamble
    0xFE, 0xFF,             // Broadcast destination
    0x00, 0x00,             // Source
    0x00, 0x00,             // Reserved
    cmdGroup,
    cmdCode,
    dataLen & 0xFF,
    (dataLen >> 8) & 0xFF
  ]);

  const bodyToSum = Buffer.concat([headerPart.slice(4), payloadBuffer]);
  const checksum = calculateChecksum16(bodyToSum);

  const packet = Buffer.concat([
    headerPart,
    payloadBuffer,
    Buffer.from([checksum & 0xFF, (checksum >> 8) & 0xFF]),
    Buffer.from([0x5A]) // Packet Tail
  ]);

  return {
    rawBuffer: packet,
    hexString: packet.toString('hex').toUpperCase(),
    asciiString: packet.toString('latin1').replace(/[\x00-\x1F\x7F]/g, c => `[${c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}]`),
    description: `Onbon BX Frame: CmdGroup=0x${cmdGroup.toString(16).toUpperCase()}, CmdCode=0x${cmdCode.toString(16).toUpperCase()}, Len=${dataLen}, Payload="${text}"`
  };
}

function decode(buffer) {
  if (!buffer || buffer.length < 8) {
    return { valid: false, error: 'Packet too short' };
  }

  if (buffer[0] === 0xA5 && buffer[1] === 0xA5) {
    return {
      valid: true,
      protocol: 'ONBON_BX',
      isAck: buffer.includes(0x5A),
      message: 'Onbon BX Response received',
      rawHex: buffer.toString('hex').toUpperCase()
    };
  }

  return {
    valid: true,
    protocol: 'ONBON_RAW',
    rawHex: buffer.toString('hex').toUpperCase()
  };
}

module.exports = {
  encode,
  decode
};
