/**
 * Unified Protocol Dispatcher
 */

const nhaiAscii = require('./nhaiAscii');
const onbonBx = require('./onbonBx');
const ntcip1203 = require('./ntcip1203');
const { modbusTcp, rawStream } = require('./modbusTcp');

const PROTOCOLS = {
  NHAI_ASCII: 'NHAI_ASCII',
  ONBON_BX: 'ONBON_BX',
  NTCIP_1203: 'NTCIP_1203',
  MODBUS_TCP: 'MODBUS_TCP',
  RAW_STREAM: 'RAW_STREAM'
};

function encodeMessage(protocol, options) {
  const proto = (protocol || 'NHAI_ASCII').toUpperCase();

  switch (proto) {
    case 'ONBON_BX':
    case 'ONBON':
    case 'BX':
      return { protocol: 'ONBON_BX', ...onbonBx.encode(options) };

    case 'NTCIP_1203':
    case 'NTCIP':
      return { protocol: 'NTCIP_1203', ...ntcip1203.encode(options) };

    case 'MODBUS_TCP':
    case 'MODBUS':
      return { protocol: 'MODBUS_TCP', ...modbusTcp.encode(options) };

    case 'RAW_STREAM':
    case 'RAW':
    case 'ASCII':
      return { protocol: 'RAW_STREAM', ...rawStream.encode(options) };

    case 'NHAI_ASCII':
    default:
      return { protocol: 'NHAI_ASCII', ...nhaiAscii.encode(options) };
  }
}

function decodeMessage(protocol, buffer) {
  const proto = (protocol || 'NHAI_ASCII').toUpperCase();

  switch (proto) {
    case 'ONBON_BX':
      return onbonBx.decode(buffer);
    case 'NTCIP_1203':
      return ntcip1203.decode(buffer);
    case 'MODBUS_TCP':
      return modbusTcp.decode(buffer);
    case 'RAW_STREAM':
      return rawStream.decode(buffer);
    case 'NHAI_ASCII':
    default:
      return nhaiAscii.decode(buffer);
  }
}

module.exports = {
  PROTOCOLS,
  encodeMessage,
  decodeMessage,
  nhaiAscii,
  onbonBx,
  ntcip1203,
  modbusTcp,
  rawStream
};
