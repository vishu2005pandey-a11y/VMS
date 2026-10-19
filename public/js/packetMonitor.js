/**
 * Real-Time Packet Inspector & Protocol Analyzer
 * Captures TX and RX frames, decodes hex bytes, and displays Wireshark-like stream.
 */

class PacketMonitor {
  constructor(containerElement) {
    this.container = containerElement;
    this.packets = [];
    this.maxPackets = 150;
    this.filterDirection = 'ALL';
    this.selectedPacket = null;
  }

  addPacket(packet) {
    this.packets.unshift(packet);
    if (this.packets.length > this.maxPackets) {
      this.packets.pop();
    }
    this.render();
  }

  clear() {
    this.packets = [];
    this.render();
  }

  setFilter(direction) {
    this.filterDirection = direction;
    this.render();
  }

  formatHexWithSpaces(hexStr) {
    if (!hexStr) return '';
    return hexStr.match(/.{1,2}/g)?.join(' ') || hexStr;
  }

  render() {
    if (!this.container) return;

    const filtered = this.packets.filter(p => {
      if (this.filterDirection === 'ALL') return true;
      return p.direction === this.filterDirection;
    });

    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
          <div style="font-size: 1.5rem; margin-bottom: 8px;">📡</div>
          <div>No network packets captured yet. Send a message or run a diagnostic test to inspect live frames.</div>
        </div>
      `;
      return;
    }

    const html = filtered.map((p, idx) => {
      const timeStr = new Date(p.timestamp).toLocaleTimeString();
      const dirClass = p.direction.toLowerCase();
      const badgeClass = dirClass === 'tx' ? 'tx' : (dirClass === 'rx' ? 'rx' : 'err');
      const formattedHex = this.formatHexWithSpaces(p.hexData);

      return `
        <div class="packet-row ${dirClass}" data-idx="${idx}">
          <div style="color: var(--text-muted); font-size: 0.72rem;">${timeStr}</div>
          <div><span class="badge-dir ${badgeClass}">${p.direction}</span></div>
          <div style="color: var(--accent-cyan); font-weight: 600;">${p.protocol || 'RAW'}</div>
          <div style="color: var(--text-secondary);">${p.deviceId || 'ALL'}</div>
          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <span class="packet-hex">${formattedHex}</span>
            <span style="color: var(--text-primary); margin-left: 8px;">${p.notes || ''}</span>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = html;
  }

  exportLogs() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.packets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vms_packet_log_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

window.PacketMonitor = PacketMonitor;
