// ─────────────────────────────────────────────────────────────────────────────
// Scout Sleeve – Central Constants
// Compatible: RN 0.84 / React 19 / Firebase v23 modular API
// ─────────────────────────────────────────────────────────────────────────────

// ── BLE ──────────────────────────────────────────────────────────────────────
export const BLE = {
  DEVICE_NAME:        'SCOUT SLEEVE v1',
  SERVICE_UUID:       '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  CHAR_UUID:          'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  SCAN_TIMEOUT_MS:    10_000,
  SAMPLE_HZ:          50,
  SAMPLE_MS:          20,   // 1000 / 50
};

// ── Impact-detection thresholds ───────────────────────────────────────────────
export const THR = {
  IMPACT_START_G:      4.0,   // g – vertical accel to start window
  IMPACT_END_G:        2.0,   // g – vertical accel to close window
  IMPACT_CONFIRM:      2,     // consecutive samples above start
  IMPACT_RELEASE:      3,     // consecutive samples below end
  CUTTING_ROT_RAD:     3.0,   // rad/s – peak rotation → cutting
  LANDING_DUR_S:       0.15,  // s – vertical duration → landing
  HIGH_RISK_LAT_G:     2.0,   // g – lateral → high valgus risk
  BUFFER_SAMPLES:      200,
  PRE_SAMPLES:         10,
  POST_SAMPLES:        20,
  NOISE_WINDOW:        3,     // moving-average kernel size
};

// ── Firebase Firestore collection names ──────────────────────────────────────
export const FS = {
  ATHLETES:  'athletes',
  JUMP_LOGS: 'jumpLogs',
};

// ── Movement / risk enums ─────────────────────────────────────────────────────
export const MOV = {
  CUTTING: 'CUTTING',
  LANDING: 'LANDING',
  UNKNOWN: 'UNKNOWN',
};

export const RISK = {
  HIGH: 'HIGH',
  LOW:  'LOW',
  IDLE: 'IDLE',
};

// ── Athlete profile (hardcoded for demo) ─────────────────────────────────────
export const ATHLETE = {
  name:     'Demo Athlete',
  age:      21,
  position: 'Midfielder',
  club:     'Hackathon Team',
  country:  'India',
};

// ── Coaching tips ─────────────────────────────────────────────────────────────
export const TIPS = {
  CUTTING: {
    HIGH: 'Cutting: knee caved inward. Keep knee aligned over your toes.',
    LOW:  'Good cut! Nice knee alignment. Stay low through the turn.',
  },
  LANDING: {
    HIGH: "Landing: knees collapsed. Land softer – sit into a chair.",
    LOW:  'Great soft landing! Work on symmetrical foot plant.',
  },
  UNKNOWN: {
    HIGH: 'Movement detected – high stress. Focus on control.',
    LOW:  'Movement detected. Good control maintained.',
  },
};

// ── Design tokens ─────────────────────────────────────────────────────────────
export const C = {
  // Backgrounds
  bgPrimary:  '#0B0B0F',
  bgCard:     '#111116',
  bgElevated: '#15151C',

  // Text
  textPrimary:   '#F5F5F7',
  textSecondary: '#CFCFD4',
  textMuted:     '#8A8A96',

  // Brand orange
  accent:      '#FF6A00',
  accentDeep:  '#FF3C00',
  accentLight: '#FF9A3C',
  accentGlow:  'rgba(255,106,0,0.35)',

  // Status
  green:  '#00C853',
  red:    '#FF2D2D',
  blue:   '#2F80ED',
  yellow: '#FFB300',

  // Borders
  borderSubtle: 'rgba(255,255,255,0.05)',
  borderMed:    'rgba(255,255,255,0.10)',
};

export const SP = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const RADIUS = {
  sm: 12, md: 16, lg: 20, xl: 24, pill: 999,
};

export const FONT = {
  xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, hero: 36, giant: 52,
  regular: '400', medium: '500', semibold: '600',
};

// Risk → colour map (used by gauge & list items)
export const RISK_COLOR = {
  HIGH: '#FF2D2D',
  LOW:  '#00C853',
  IDLE: '#2F80ED',
};
