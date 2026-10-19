# 🚦 Toll Plaza Variable Message Sign (VMS) & UFD Operations Center
### NHAI / IHMCL Highway ATMS Central Signage & Hardware Controller

---

## 📌 1. GitHub par kya mila? (GitHub Research Summary)

GitHub par humne Toll Plaza VMS aur LED display hardware ke related repos search kiye:
1. **NTCIP 1203 Protocols**: Repositories jaise `mnit-rtmc/ntcip` aur `ite-org/NTCIP-1203` me NTCIP roadside standards aur MULTI markup language ke parsers hain, par koi ready-made web UI nahi hai.
2. **Onbon BX (BX-5/BX-6) SDK**: `onbonlab/bx.dual.doc` aur C++/Java socket examples hain jo controller card ke TCP packets ke bare me batate hain.
3. **Huidu / Listen Vision**: Inke proprietary Windows DLLs ya reverse-engineered firmware hain.
4. **Toll Plaza Ready UI**: Commercial toll plaza companies (jaise TollPlus, Kent, Tecsidel) apna software open-source nahi karti hain.

👉 **Isliye humne aapke liye ek complete, modern, production-ready Full-Stack Toll Plaza VMS Web Operations Center aur Hardware Bridge banaya hai**, jo aapke toll plaza par already lage hue VMS boards se direct connect ho jata hai!

---

## ⚡ 2. Quick Start (Kaise Run Karein)

```bash
# Terminal me project folder me jayein:
cd C:\Users\krish\Desktop\VMS

# Server start karein:
npm start
# ya
node server.js
```

Browser me open karein:
👉 **`http://localhost:3000`**

---

## 🌐 3. Installed VMS Hardware Se Connect Kaise Karein (IP Assigned)

Aapne bataya ki **"VMS already lag chuke hain aur unko IP assign ho chuki hai"**. 
Unse connect karna bilkul aasan hai:

### Step 1: VMS Display Select ya Add karein
1. Web UI me **"📡 Hardware Fleet & IPs"** tab par click karein.
2. Waha pe **"➕ Add VMS Hardware"** button par click karein.
3. Enter karein:
   - **Display Name**: e.g., `Canopy North Gantry VMS` ya `Lane 01 UFD`
   - **IP Address**: Jo IP aapke VMS ko assign ki gayi hai (e.g. `192.168.1.105`)
   - **TCP Port**: Default `5005` (ya vendor port jaise `5000`, `8000`, ya `502`)
   - **Protocol**: 
     - **NHAI_ASCII** (Standard Indian Toll Plaza format)
     - **ONBON_BX** (Agar Onbon BX-5/BX-6 card laga hai)
     - **NTCIP_1203** (Highway ITS format)
     - **RAW_STREAM** (Agar USR-TCP232 / Moxa serial-to-ethernet converter laga hai)
   - **Resolution**: `192x32`, `160x32`, `128x32`, ya `96x32`
4. **"Save & Connect"** par click karein!

### Step 2: Ping / Connection Test Karein
- Har VMS card ke niche **"⚡ Ping Test"** button hai.
- Ispe click karte hi system aapke VMS IP par live socket packet bhejkar test karega aur round-trip latency (ms) dikhayega.

### Step 3: Message Send Karein
1. Top bar me apna VMS display select karein.
2. Line 1 (English) aur Line 2 (Hindi) me message likhein.
3. Color choose karein (**Amber, Green, Red, White**).
4. Effect choose karein (**Static, Left Scroll, Flash Alert**).
5. **"🚀 Transmit to Hardware"** button dabayein!
6. Message turant physical VMS par push ho jayega aur **Packet Inspector** tab me live HEX bytes aur ACK show ho jayega.

---

## 🎯 4. Key Features

- **🚦 Live Highway Gantry Simulator**: High-fidelity LED dot matrix canvas renderer jo real physical outdoor LEDs ki tarah glow karta hai.
- **🌐 Direct TCP/IP Socket Engine**: Node.js raw socket driver jo continuous IP:Port network communication handle karta hai.
- **🔌 Web Serial API (RS485 Support)**: Agar kabhi laptop se direct USB-to-RS485 converter lagakar testing karni ho, to bina kisi driver ke Chrome/Edge me 1-click me connect hota hai.
- **🛣️ Complete Lane Control (LCS & UFD)**:
  - Lane 1 se 8 tak Green Arrow (↓) aur Red Cross (✕) status toggle.
  - User Fare Display (UFD) par FASTag deduction (`₹85 Valid`), Low Balance warning, aur Blacklisted tag simulation.
- **🇮🇳 Bilingual Hindi & English Support**: Devanagari text formatting with quick one-click chips (`कृपया लेन न बदलें`, `फास्टैग अनिवार्य`, `धुंध - धीरे चलें`, etc.).
- **🚨 1-Click SOS / Emergency Broadcast**: Highway accident, dense fog, ya incoming ambulance ke liye 1-click me saare boards par emergency alert bhejna.
- **🔍 Live Wireshark-Style Packet Inspector**: TX aur RX ke raw HEX bytes, ASCII string, timestamp, aur CRC/BCC checksum validation.
- **💻 Built-in Virtual VMS Hardware Simulator**:
  - Agar abhi plaza network par nahi hain aur test karna chahte hain, to server automatically port `5005` par Virtual VMS run karta hai jo real hardware ki tarah respond karta hai!

---

## 📁 File Structure

```
VMS/
├── server.js              # Express, WebSockets, TCP Client Sockets & Virtual VMS Server
├── package.json           # Scripts and dependencies (express, ws)
├── protocols/             # Hardware Protocol Encoders & Decoders
│   ├── index.js           # Unified Protocol Dispatcher
│   ├── nhaiAscii.js       # NHAI / IHMCL Toll Plaza Standard STX-ETX Protocol
│   ├── onbonBx.js         # Onbon BX-5/BX-6 series binary frame protocol
│   ├── ntcip1203.js       # NTCIP 1203 MULTI tag protocol
│   └── modbusTcp.js       # Modbus TCP & Raw Stream protocols
├── public/                # Highway Operations Control Center UI
│   ├── index.html         # Main dashboard HTML
│   ├── css/
│   │   ├── style.css      # Dark glassmorphic highway ATMS theme
│   │   └── led-matrix.css # Realistic LED dot matrix glow styling
│   └── js/
│       ├── app.js         # Main orchestrator & WebSocket client
│       ├── ledCanvas.js   # 60FPS Photorealistic LED diode canvas engine
│       ├── deviceManager.js # Fleet manager & Lane controller
│       ├── packetMonitor.js # Real-time Hex Packet Inspector
│       └── presets.js     # Standard NHAI presets & Hindi quick phrases
└── README.md
```
