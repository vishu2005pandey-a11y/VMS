/**
 * NHAI Policy Circular No. 4.35/2025 - Official Road Safety Creatives
 * National Highways Authority of India (Ministry of Road Transport & Highways)
 * 9 Standard Themes for Toll Plazas & Highway Fascia VMS
 */

const VMS_PRESETS = [
  {
    id: 'nhai-theme-02-drink-drive',
    title: 'NHAI Theme 2: Don\'t Drink & Drive',
    desc: 'शराब पी कर गाड़ी ना चलाएं, ये जानलेवा हो सकता है',
    icon: '🚫',
    category: 'NHAI_2025',
    color: 'R',
    effect: 'S',
    speed: 5,
    line1: "Don't Drink and Drive",
    line2: 'शराब पी कर गाड़ी ना चलाएं',
    line3: 'आपकी यात्रा मंगलमय हो...'
  },
  {
    id: 'nhai-theme-01-speed-limit',
    title: 'NHAI Theme 1: Drive in Speed Limit',
    desc: 'निर्धारित गति सीमा में वाहन चलाएं, अपनी यात्रा को सुरक्षित बनाएं',
    icon: '⚡',
    category: 'NHAI_2025',
    color: 'A',
    effect: 'S',
    speed: 5,
    line1: 'Drive in the Speed Limit',
    line2: 'निर्धारित गति सीमा में वाहन चलाएं',
    line3: 'अपनी यात्रा को सुरक्षित बनाएं'
  },
  {
    id: 'nhai-theme-03-lane-driving',
    title: 'NHAI Theme 3: Lane Driving',
    desc: 'लेन में वाहन चलाएं, अपनी यात्रा को सुरक्षित बनाएं',
    icon: '🛣️',
    category: 'NHAI_2025',
    color: 'A',
    effect: 'S',
    speed: 5,
    line1: 'Drive in Your Lane',
    line2: 'लेन में वाहन चलाएं',
    line3: 'अपनी यात्रा को सुरक्षित बनाएं'
  },
  {
    id: 'nhai-theme-05-helpline-1033',
    title: 'NHAI Theme 5: 1033 Helpline',
    desc: 'राष्ट्रीय राजमार्गों पर आपातकाल सहायता के लिए कॉल करें 1033',
    icon: '📞',
    category: 'NHAI_2025',
    color: 'R',
    effect: 'S',
    speed: 5,
    line1: 'National Highway Helpline 1033',
    line2: 'आपातकाल सहायता के लिए कॉल करें 1033',
    line3: '24x7 NHAI Emergency Helpline'
  },
  {
    id: 'nhai-theme-06-seatbelt',
    title: 'NHAI Theme 6: Wear Seatbelt',
    desc: 'सीटबेल्ट लगाएं, अपनी यात्रा को सुरक्षित बनाएं',
    icon: '🛡️',
    category: 'NHAI_2025',
    color: 'G',
    effect: 'S',
    speed: 5,
    line1: 'Wear Seatbelt While Driving',
    line2: 'सीटबेल्ट लगाएं, सुरक्षित रहें',
    line3: 'अपनी यात्रा को सुरक्षित बनाएं'
  },
  {
    id: 'nhai-theme-09-wrong-direction',
    title: 'NHAI Theme 9: Wrong Direction Driving',
    desc: 'ग़लत दिशा में वाहन ना चलाएं, अपनी यात्रा को सुरक्षित बनाएं',
    icon: '⛔',
    category: 'NHAI_2025',
    color: 'R',
    effect: 'F',
    speed: 6,
    line1: "Don't Drive in Wrong Direction",
    line2: 'ग़लत दिशा में वाहन ना चलाएं',
    line3: 'DANGER - TURN BACK'
  },
  {
    id: 'nhai-theme-04-rajmarg-info',
    title: 'NHAI Theme 4: Rajmarg Yatra App (Info)',
    desc: 'हाईवे संबंधित जानकारी, शिकायत एवं सुझाव के लिए',
    icon: '📱',
    category: 'NHAI_2025',
    color: 'A',
    effect: 'S',
    speed: 5,
    line1: 'Rajmarg Yatra Mobile App',
    line2: 'हाईवे जानकारी, शिकायत व सुझाव हेतु',
    line3: 'आज ही डाउनलोड करें'
  },
  {
    id: 'nhai-theme-07-rajmarg-toll',
    title: 'NHAI Theme 7: Rajmarg Yatra (Toll Plaza)',
    desc: 'टोल प्लाजा संबंधित जानकारी एवं शिकायतों के लिए',
    icon: '💳',
    category: 'NHAI_2025',
    color: 'G',
    effect: 'S',
    speed: 5,
    line1: 'Toll Plaza Information & Help',
    line2: 'टोल प्लाजा जानकारी व शिकायत हेतु',
    line3: 'राजमार्ग यात्रा ऐप डाउनलोड करें'
  },
  {
    id: 'nhai-theme-08-rajmarg-amenities',
    title: 'NHAI Theme 8: Food, Fuel & Hospital',
    desc: 'रेस्टोरेन्ट, पेट्रोल पंप और अस्पताल की जानकारी के लिए',
    icon: '🏥',
    category: 'NHAI_2025',
    color: 'A',
    effect: 'S',
    speed: 5,
    line1: 'Fuel, Food & Hospital Info',
    line2: 'रेस्टोरेंट, पेट्रोल पंप व अस्पताल',
    line3: 'राजमार्ग यात्रा ऐप डाउनलोड करें'
  },
  {
    id: 'nhai-toll-fastag-valid',
    title: 'Toll Fastag: Valid Fastag OK',
    desc: 'FASTag OK - Toll ₹85 Deducted',
    icon: '✅',
    category: 'TOLL',
    color: 'G',
    effect: 'S',
    speed: 5,
    line1: 'FASTag VALID - ₹85',
    line2: 'कृपया आगे बढ़ें (PROCEED)',
    line3: 'आपकी यात्रा मंगलमय हो...'
  }
];

// Quick Hindi phrases from NHAI 2025 Circular
const HINDI_QUICK_PHRASES = [
  'शराब पी कर गाड़ी ना चलाएं',
  'निर्धारित गति सीमा में वाहन चलाएं',
  'लेन में वाहन चलाएं',
  'सीटबेल्ट लगाएं सुरक्षित रहें',
  'आपातकाल सहायता कॉल 1033',
  'ग़लत दिशा में वाहन ना चलाएं',
  'राजमार्ग यात्रा ऐप डाउनलोड करें',
  'आपकी यात्रा मंगलमय हो...',
  'फास्टैग लेन - कृपया आगे बढ़ें'
];

window.VMS_PRESETS = VMS_PRESETS;
window.HINDI_QUICK_PHRASES = HINDI_QUICK_PHRASES;
