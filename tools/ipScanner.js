const net = require('net');

/**
 * Scan a single IP & Port with strict timeout
 */
function probeSocket(ip, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isSettled = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, ip, () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve({ ip, port, open: true });
      }
    });

    socket.on('timeout', () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve({ ip, port, open: false, error: 'TIMEOUT' });
      }
    });

    socket.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve({ ip, port, open: false, error: err.code || err.message });
      }
    });
  });
}

/**
 * Scan a range of IPs concurrently with throttling
 */
async function scanSubnet(baseSubnet, startHost, endHost, port = 5005, concurrency = 15) {
  const targets = [];
  for (let h = startHost; h <= endHost; h++) {
    targets.push(`${baseSubnet}.${h}`);
  }

  const results = [];
  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency);
    const chunkPromises = chunk.map(ip => probeSocket(ip, port, 1200));
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results.filter(r => r.open);
}

module.exports = {
  probeSocket,
  scanSubnet
};
