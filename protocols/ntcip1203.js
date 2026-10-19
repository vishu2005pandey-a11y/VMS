/**
 * NTCIP 1203 Dynamic Message Sign (DMS / VMS) Protocol Implementation
 * Industry ITS standard for roadside variable message signs using MULTI tags
 */

function encode(options) {
  const {
    command = 'D',
    text = '',
    lines = [],
    color = 'A',
    effect = 'S',
    brightness = 15,
    font = 1
  } = options;

  let rgbTag = '[cr255,165,0]'; // Amber default
  if (color === 'R') rgbTag = '[cr255,0,0]';
  else if (color === 'G') rgbTag = '[cr0,255,0]';
  else if (color === 'W') rgbTag = '[cr255,255,255]';

  let multiString = '';

  if (command === 'C') {
    multiString = '[np]'; // Clear / New empty page
  } else if (command === 'B') {
    multiString = `[br${brightness}]`;
  } else if (lines && lines.length > 0) {
    multiString = lines.map(line => `${rgbTag}[jl3]${line}`).join('[nl]');
  } else {
    // Single text string, split by newlines if any
    const splitLines = text.split('\n');
    multiString = splitLines.map(l => `${rgbTag}[jl3]${l}`).join('[nl]');
  }

  if (effect === 'F') {
    multiString = `[fl]${multiString}`;
  } else if (effect === 'L') {
    multiString = `[sc3]${multiString}`;
  }

  // SNMP / UDP payload simulation wrapper (Standard NTCIP dmsMessageMultiString)
  const prefix = 'NTCIP:1203:SET:dmsMessageMultiString=';
  const fullPayload = prefix + multiString;
  const packet = Buffer.from(fullPayload, 'utf-8');

  return {
    rawBuffer: packet,
    hexString: packet.toString('hex').toUpperCase(),
    asciiString: fullPayload,
    multiMarkup: multiString,
    description: `NTCIP 1203 MULTI Payload: "${multiString}"`
  };
}

function decode(buffer) {
  const str = buffer.toString('utf-8');
  return {
    valid: true,
    protocol: 'NTCIP_1203',
    text: str,
    rawHex: buffer.toString('hex').toUpperCase()
  };
}

module.exports = {
  encode,
  decode
};
