/**
 * Toll Plaza VMS Highway Operations & FASTag Presets
 */

const VMS_PRESETS = [
  {
    id: 'preset-fastag-norm',
    title: 'FASTag Standard Approach',
    desc: 'Normal highway advisory for incoming FASTag vehicles',
    icon: '💳',
    category: 'TOLL',
    color: 'A',
    effect: 'S',
    speed: 5,
    line1: 'FASTag LANE ONLY',
    line2: 'कृपया लेन न बदलें'
  },
  {
    id: 'preset-keep-balance',
    title: 'Low Balance Warning',
    desc: 'Advisory to ensure FASTag minimum recharge before plaza',
    icon: '⚠️',
    category: 'TOLL',
    color: 'A',
    effect: 'S',
    speed: 5,
    line1: 'KEEP FASTag MIN BAL ₹150',
    line2: 'अपर्याप्त बैलेंस पर 2X टोल'
  },
  {
    id: 'preset-speed-limit',
    title: 'Speed Limit 30 KM/H',
    desc: 'Plaza approach speed restriction zone',
    icon: '🛑',
    category: 'SAFETY',
    color: 'A',
    effect: 'S',
    speed: 5,
    line1: 'TOLL PLAZA 500M AHEAD',
    line2: 'SPEED LIMIT 30 KM/H'
  },
  {
    id: 'preset-accident',
    title: 'EMERGENCY: Accident Ahead',
    desc: 'High priority red flashing hazard warning',
    icon: '💥',
    category: 'EMERGENCY',
    color: 'R',
    effect: 'F',
    speed: 8,
    line1: 'ACCIDENT AHEAD 2 KM',
    line2: 'DRIVE SLOW - CAUTION'
  },
  {
    id: 'preset-fog',
    title: 'Dense Fog & Low Visibility',
    desc: 'Winter weather scrolling safety warning',
    icon: '🌫️',
    category: 'WEATHER',
    color: 'A',
    effect: 'L',
    speed: 6,
    line1: 'DENSE FOG - LOW VISIBILITY - KEEP DISTANCE',
    line2: 'धुंध अधिक है - फॉग लाइट जलाएं और धीरे चलें'
  },
  {
    id: 'preset-ambulance',
    title: 'Emergency Vehicle Approaching',
    desc: 'Clear Lane 1 for Ambulance / Fire brigade',
    icon: '🚑',
    category: 'EMERGENCY',
    color: 'R',
    effect: 'F',
    speed: 10,
    line1: 'EMERGENCY VEHICLE INCOMING',
    line2: 'CLEAR LANE 01 IMMEDIATELY'
  },
  {
    id: 'preset-lane-closed',
    title: 'Lanes Maintenance / Diversion',
    desc: 'Directs traffic away from closed lanes',
    icon: '🚧',
    category: 'TRAFFIC',
    color: 'A',
    effect: 'S',
    speed: 5,
    line1: 'LANES 3 & 4 CLOSED',
    line2: 'USE LANES 1, 2, 5 & 6'
  },
  {
    id: 'preset-cash-only',
    title: 'Cash / FASTag Hybrid Lane',
    desc: 'Displayed on manual mixed toll lanes',
    icon: '💵',
    category: 'TOLL',
    color: 'G',
    effect: 'S',
    speed: 5,
    line1: 'CASH & FASTAG LANE',
    line2: 'नकद एवं फास्टैग लेन'
  }
];

// Quick Hindi phrases for quick insertion into editor
const HINDI_QUICK_PHRASES = [
  'कृपया लेन न बदलें',
  'फास्टैग अनिवार्य है',
  'गति सीमा 30 किमी/घंटा',
  'धुंध - धीरे चलें',
  'लेन बंद है',
  'आगे दुर्घटना - सावधानी रखें',
  'एम्बुलेंस आ रही है - रास्ता दें',
  'टोल प्लाजा 500 मीटर आगे'
];

window.VMS_PRESETS = VMS_PRESETS;
window.HINDI_QUICK_PHRASES = HINDI_QUICK_PHRASES;
