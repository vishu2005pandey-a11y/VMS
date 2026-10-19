/**
 * Modbus TCP & Raw Stream Encoders
 */

// Modbus TCP Protocol Encoder
const modbusTcp = {
  encode: (options) => {
    const {
      unitId = 1,
      command = 'D',
      text = '',
      laneSignal = 'G'
    } = options;

    const transactionId = Math.floor(Math.random() * 65535);
    const protocolId = 0x0000;

    let pdu;
    if (command === 'L') {
      // Lane control via holding coil / register
      // Value: Green Arrow=1, Red Cross=2, Amber=3, Off=0
      let val = 1;
      if (laneSignal === 'R') val = 2;
      else if (laneSignal === 'A') val = 3;
      else if (laneSignal === 'C') val = 0;

      // Function Code 06: Write Single Register
      pdu = Buffer.from([0x06, 0x00, 0x01, (val >> 8) & 0xFF, val & 0xFF]);
    } else {
      // Function Code 16 (0x10): Write Multiple Holding Registers (Text bytes)
      const textBuf = Buffer.from(text.padEnd(20, ' ').substring(0, 40), 'ascii');
      const regCount = Math.ceil(textBuf.length / 2);
      const byteCount = regCount * 2;
      const padded = Buffer.alloc(byteCount, 0x20);
      textBuf.copy(padded);

      const pduHeader = Buffer.from([
        0x10,             // Function Code 16
        0x00, 0x64,       // Start Address 100
        (regCount >> 8) & 0xFF, regCount & 0xFF,
        byteCount
      ]);
      pdu = Buffer.concat([pduHeader, padded]);
    }

    const length = 1 + pdu.length; // UnitId (1 byte) + PDU
    const mbapHeader = Buffer.from([
      (transactionId >> 8) & 0xFF, transactionId & 0xFF,
      (protocolId >> 8) & 0xFF, protocolId & 0xFF,
      (length >> 8) & 0xFF, length & 0xFF,
      unitId
    ]);

    const packet = Buffer.concat([mbapHeader, pdu]);
    return {
      rawBuffer: packet,
      hexString: packet.toString('hex').toUpperCase(),
      asciiString: `[ModbusTCP TxID=${transactionId} Unit=${unitId} PDU=${pdu.toString('hex').toUpperCase()}]`,
      description: `Modbus TCP: TransID=${transactionId}, Function=${pdu[0]}, DataLen=${pdu.length}`
    };
  },

  decode: (buffer) => {
    return {
      valid: true,
      protocol: 'MODBUS_TCP',
      rawHex: buffer.toString('hex').toUpperCase(),
      message: 'Modbus TCP Response'
    };
  }
};

// Raw Text / CR-LF Stream Protocol Encoder (Most simple & robust for generic Serial-to-Ethernet boxes)
const rawStream = {
  encode: (options) => {
    const {
      text = '',
      color = 'A',
      laneSignal = 'G',
      command = 'D',
      lineEnding = '\r\n'
    } = options;

    let payload = '';
    if (command === 'L') {
      payload = `LANE_STATUS=${laneSignal === 'G' ? 'OPEN' : 'CLOSED'}`;
    } else if (command === 'C') {
      payload = 'CLEAR';
    } else {
      payload = text;
    }

    const fullStr = payload + lineEnding;
    const packet = Buffer.from(fullStr, 'utf-8');

    return {
      rawBuffer: packet,
      hexString: packet.toString('hex').toUpperCase(),
      asciiString: fullStr.replace(/\r/g, '\\r').replace(/\n/g, '\\n'),
      description: `Raw Stream: "${payload}"`
    };
  },

  decode: (buffer) => {
    return {
      valid: true,
      protocol: 'RAW_STREAM',
      text: buffer.toString('utf-8'),
      rawHex: buffer.toString('hex').toUpperCase()
    };
  }
};

module.exports = {
  modbusTcp,
  rawStream
};
