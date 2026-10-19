/**
 * NHAI / IHMCL Standard Toll Plaza VMS & UFD ASCII Protocol
 * Standard framing used across Indian Toll Plazas for Overhead VMS and User Fare Displays
 * 
 * Frame Format:
 * [SOH (0x01)] [STX (0x02)] [ADDR: 2 bytes] [CMD: 1 byte] [LINE: 1 byte] [COLOR: 1 byte] 
 * [EFFECT: 1 byte] [SPEED: 2 bytes] [PAYLOAD...] [ETX (0x03)] [BCC: 2 hex bytes]
 */

const SOH = 0x01;
const STX = 0x02;
const ETX = 0x03;
const ACK = 0x06;
const NAK = 0x15;

function calculateBCC(buffer) {
  let xor = 0;
  for (let i = 0; i < buffer.length; i++) {
    xor ^= buffer[i];
  }
  return xor.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Encode a message payload into NHAI ASCII Packet Buffer
 */
function encode(options) {
  const {
    address = '01',
    command = 'D',     // 'D'=Display, 'C'=Clear, 'B'=Brightness, 'S'=Status Query, 'L'=Lane Control
    line = '1',        // '1', '2', '3', 'A'=All
    color = 'A',       // 'A'=Amber, 'R'=Red, 'G'=Green, 'W'=White
    effect = 'S',      // 'S'=Static, 'L'=Scroll Left, 'F'=Flash, 'U'=Scroll Up
    speed = '05',      // 01 to 99
    text = '',
    brightness = 15,   // 0 to 15
    laneSignal = 'G'   // 'G'=Arrow Green, 'R'=Cross Red, 'A'=Amber, 'C'=Close
  } = options;

  let payload = '';

  if (command === 'D') {
    payload = text;
  } else if (command === 'B') {
    payload = String(brightness).padStart(2, '0');
  } else if (command === 'L') {
    payload = laneSignal;
  } else if (command === 'C') {
    payload = 'CLR';
  } else if (command === 'S') {
    payload = 'STATUS?';
  }

  const addrStr = String(address).padStart(2, '0');
  const speedStr = String(speed).padStart(2, '0');
  const header = `${addrStr}${command}${line}${color}${effect}${speedStr}`;
  const rawBody = header + payload;
  const bodyBuf = Buffer.from(rawBody, 'utf-8');

  // BCC covers body buffer
  const bccStr = calculateBCC(bodyBuf);

  // Assemble full frame: SOH + STX + Body + ETX + BCC
  const packet = Buffer.concat([
    Buffer.from([SOH, STX]),
    bodyBuf,
    Buffer.from([ETX]),
    Buffer.from(bccStr, 'ascii')
  ]);

  return {
    rawBuffer: packet,
    hexString: packet.toString('hex').toUpperCase(),
    asciiString: packet.toString('latin1').replace(/[\x00-\x1F\x7F]/g, char => `[${char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}]`),
    description: `NHAI VMS Packet: Cmd=${command}, Addr=${addrStr}, Line=${line}, Color=${color}, Text="${text}"`
  };
}

/**
 * Parse an incoming packet buffer from VMS
 */
function decode(buffer) {
  if (!buffer || buffer.length < 5) {
    return { valid: false, error: 'Packet too short' };
  }

  // Check for ACK/NAK single byte response
  if (buffer.length === 1) {
    if (buffer[0] === ACK) return { valid: true, type: 'ACK', message: 'VMS Acknowledged Command' };
    if (buffer[0] === NAK) return { valid: true, type: 'NAK', message: 'VMS Negative Acknowledged (Error)' };
  }

  // Find SOH and STX
  const sohIdx = buffer.indexOf(SOH);
  const stxIdx = buffer.indexOf(STX);
  const etxIdx = buffer.indexOf(ETX);

  if (sohIdx !== -1 && stxIdx === sohIdx + 1 && etxIdx > stxIdx) {
    const bodyBuf = buffer.slice(stxIdx + 1, etxIdx);
    const bccInPacket = buffer.slice(etxIdx + 1, etxIdx + 3).toString('ascii');
    const computedBcc = calculateBCC(bodyBuf);
    const bccValid = bccInPacket.toUpperCase() === computedBcc.toUpperCase();

    const bodyStr = bodyBuf.toString('utf-8');
    const address = bodyStr.substring(0, 2);
    const command = bodyStr.substring(2, 3);

    return {
      valid: true,
      protocol: 'NHAI_ASCII',
      address,
      command,
      bccValid,
      body: bodyStr.substring(3),
      rawHex: buffer.toString('hex').toUpperCase()
    };
  }

  return {
    valid: true,
    protocol: 'RAW_RESPONSE',
    text: buffer.toString('utf-8'),
    rawHex: buffer.toString('hex').toUpperCase()
  };
}

module.exports = {
  encode,
  decode,
  SOH,
  STX,
  ETX,
  ACK,
  NAK
};
