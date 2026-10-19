# 🚦 Tecsidel Toll Plaza VMS & UFD Controller — Client Setup Guide

**Guide for Tecsidel Engineering Team & On-Site Plaza Operators**

---

## 📥 Step 1: Download Kaise Karein (Code Download)

Aap do tarike se download kar sakte hain:

### Option A: Direct ZIP Download (Easiest)
1. Browser me GitHub link kholein: 👉 **[https://github.com/vishu2005pandey-a11y/VMS](https://github.com/vishu2005pandey-a11y/VMS)**
2. Green color ke **`<> Code`** button par click karein.
3. **`Download ZIP`** par click karein.
4. Download hui ZIP file ko extract (unzip) kar lein.

### Option B: Git Clone (Terminal se)
```bash
git clone https://github.com/vishu2005pandey-a11y/VMS.git
cd VMS
```

---

## ⚡ Step 2: System Par Run Kaise Karein (1-Click Start)

### Requirement:
- System par **Node.js (LTS version)** hona chahiye. Agar nahi hai to [nodejs.org](https://nodejs.org/) se 2 minute me install ho jata hai.

### Run Karne Ka Tarika:

#### 🟢 Method 1: Windows Double-Click (Sabse Aasan)
Folder ke andar **`start_vms.bat`** file par double-click karein:
- Yeh apne aap dependencies install karega.
- Server start karega.
- Aur aapke browser me dashboard turant open kar dega!

#### 🟡 Method 2: Command Prompt / Terminal Se
```bash
cd VMS

# Dependencies install karein (Sirf pehli baar):
npm install

# Server start karein:
npm start
```
Browser me open karein:
👉 **`http://localhost:3000`**

---

## 🌐 Step 3: Toll Plaza VMS Hardware Se Connect Kaise Karein

1. Jis PC par yeh chal raha hai, use **Toll Plaza ke local network switch ya Wi-Fi** se connect karein.
2. Web Dashboard me **"📡 Hardware Fleet & IPs"** tab par jayein.
3. Waha kisi bhi display ke niche **"✏️ Edit"** ya upar **"➕ Add VMS Hardware"** par click karein:
   - **Display Name**: e.g. `Canopy North Gantry` ya `Lane 01 UFD`
   - **IP Address**: Jo IP aapke physical VMS board ko assign hai (e.g. `192.168.1.120`)
   - **TCP Port**: Default `5005` (ya card port `5000`, `8000`, `502`)
   - **Protocol**: `Tecsidel / NHAI Standard ASCII Protocol (STX-ETX)` ya `Onbon BX Series`
   - **Resolution**: `192x32`, `160x32`, `128x32`, ya `96x32`
4. **"Save & Synchronize"** par click karein.
5. **"⚡ Test Socket"** par click karein — live ping aate hi status **ONLINE (Green)** ho jayega!
6. Ab **Overview** tab me jakar message likhein aur **"🚀 Transmit to Hardware"** dabayein — physical VMS board par message live show ho jayega.

---

## ⚙️ Step 4: Plaza Server Par 24x7 Background Service Setup (Production)

Agar Toll Plaza ke Control Room Server par ise 24 ghante background me bina band hue chalana hai (PC restart hone par bhi auto-start ho):

```bash
# 1. PM2 process manager install karein:
npm install -g pm2

# 2. VMS controller ko background service me start karein:
pm2 start server.js --name "tecsidel-vms"

# 3. Auto-start on Windows reboot enable karein:
pm2 startup
pm2 save
```

Ab plaza server ke restart hone par bhi software apne aap background me start ho jayega.
Plaza ke kisi bhi computer se bas browser me type karein:
👉 `http://<SERVER-IP>:3000`

---

## 💻 Step 5: Tecsidel TLC (Toll Lane Computer) REST API Integration

Toll Lane Computer (TLC) software se FASTag transactions ko physical UFD display par push karne ke liye REST endpoint:

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/external/ufd-update`
- **Payload**:
```json
{
  "laneNumber": 1,
  "plateNumber": "HR 26 DQ 5541",
  "vehicleClass": "CAR",
  "tollFare": 85,
  "status": "VALID"
}
```
*(Status values: `"VALID"`, `"LOW_BAL"`, `"BLACKLIST"`)*
