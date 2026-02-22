// ─────────────────────────────────────────────────────────────────────────────
// Scout Sleeve – BLE layer  (react-native-ble-manager ^11.6.3)
// ─────────────────────────────────────────────────────────────────────────────
import { PermissionsAndroid, Platform, NativeEventEmitter, NativeModules } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { BLE } from '../constants';

const BleManagerModule = NativeModules.BleManager;
const bleEmitter = new NativeEventEmitter(BleManagerModule);

let _deviceId           = null;
let _dataListener       = null;
let _disconnectListener = null;
let _scanListener       = null;
let _isInitialized      = false;

// ─────────────────────────────────────────────────────────────────────────────
// Initialize
// ─────────────────────────────────────────────────────────────────────────────
export async function initBle() {
  if (_isInitialized) { return; }
  await BleManager.start({ showAlert: false });
  _isInitialized = true;
  console.log('[BLE] BleManager started');
}

// ─────────────────────────────────────────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────────────────────────────────────────
export async function requestBlePermissions() {
  if (Platform.OS !== 'android') { return true; }
  const grants = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);
  const allOk = Object.values(grants).every(
    v => v === PermissionsAndroid.RESULTS.GRANTED,
  );
  if (!allOk) { console.warn('[BLE] Some permissions denied:', grants); }
  return allOk;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bluetooth state
// ─────────────────────────────────────────────────────────────────────────────
export function waitForBluetooth() {
  return new Promise((resolve, reject) => {
    const sub = bleEmitter.addListener('BleManagerDidUpdateState', ({ state }) => {
      if (state === 'on') { sub.remove(); resolve(); }
      else if (state === 'unsupported' || state === 'unauthorized') {
        sub.remove(); reject(new Error(`Bluetooth state: ${state}`));
      }
    });
    BleManager.checkState();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Scan
// ─────────────────────────────────────────────────────────────────────────────
export function startScan(onFound, onStop) {
  const seen = new Set();
  _scanListener = bleEmitter.addListener('BleManagerDiscoverPeripheral', (peripheral) => {
    const name = peripheral.name ?? peripheral.advertising?.localName ?? '';
    if (name === BLE.DEVICE_NAME && !seen.has(peripheral.id)) {
      seen.add(peripheral.id);
      console.log(`[BLE] Found: ${name} (${peripheral.id})`);
      onFound(peripheral);
    }
  });
  BleManager.scan([], BLE.SCAN_TIMEOUT_MS / 1000, false)
    .then(() => console.log('[BLE] Scan started'))
    .catch(err => { console.error('[BLE] Scan error:', err); onStop?.(); });
  const stopListener = bleEmitter.addListener('BleManagerStopScan', () => {
    stopListener.remove(); _scanListener?.remove(); _scanListener = null; onStop?.();
  });
  return () => {
    BleManager.stopScan(); _scanListener?.remove(); _scanListener = null;
    stopListener.remove(); onStop?.();
  };
}

export function stopScan() {
  BleManager.stopScan(); _scanListener?.remove(); _scanListener = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Connect
//
// FIX v1.3: MTU negotiation is now wrapped in its own isolated Promise with a
// 3-second timeout. If requestMTU throws OR hangs, we log a warning and
// continue — the connection itself is never aborted due to MTU failure.
//
// Also added: force-disconnect any stale connection before connecting, which
// fixes the "infinite connecting loop" caused by the ESP32 being in a
// half-connected state after a previous failed attempt.
// ─────────────────────────────────────────────────────────────────────────────
export async function connectDevice(peripheral) {
  const id = peripheral.id;
  console.log(`[BLE] Connecting to ${id}…`);

  // ── Force-clear any stale connection first ────────────────────────────────
  // Prevents infinite loop when ESP32 is in half-connected state
  try {
    await BleManager.disconnect(id);
    console.log('[BLE] Cleared stale connection');
    await new Promise(r => setTimeout(r, 500)); // brief pause for BLE stack
  } catch (_) {
    // Not connected — that's fine, ignore
  }
  // ─────────────────────────────────────────────────────────────────────────

  await BleManager.connect(id);
  console.log('[BLE] Connected');

  // ── MTU negotiation — fully isolated, never throws ───────────────────────
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[BLE] MTU negotiation timed out — continuing with default MTU');
      resolve();
    }, 3000);

    BleManager.requestMTU(id, 128)
      .then((mtu) => {
        clearTimeout(timeout);
        console.log(`[BLE] MTU negotiated: ${mtu} bytes`);
        resolve();
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.warn('[BLE] MTU negotiation failed (non-fatal):', err?.message ?? err);
        resolve(); // ← always resolve, never reject
      });
  });
  // ─────────────────────────────────────────────────────────────────────────

  const info = await BleManager.retrieveServices(id);
  console.log('[BLE] Services:', JSON.stringify(info?.services));
  _deviceId = id;
  console.log('[BLE] Ready');
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscribe to notifications
// ─────────────────────────────────────────────────────────────────────────────
export async function subscribeToData(onData, onDisconnect) {
  if (!_deviceId) { throw new Error('[BLE] Not connected'); }
  await new Promise(r => setTimeout(r, 500));

  const serviceUUID = BLE.SERVICE_UUID.toLowerCase();
  const charUUID    = BLE.CHAR_UUID.toLowerCase();
  console.log('[BLE] Starting notification on:', serviceUUID, charUUID);

  try {
    await BleManager.startNotification(_deviceId, serviceUUID, charUUID);
    console.log('[BLE] Notification started');
  } catch (err) {
    console.error('[BLE] startNotification failed:', err); throw err;
  }

  _dataListener = bleEmitter.addListener(
    'BleManagerDidUpdateValueForCharacteristic',
    ({ value, peripheral, characteristic }) => {
      if (peripheral !== _deviceId) { return; }
      const incomingChar = characteristic?.toLowerCase() ?? '';
      if (!incomingChar.includes(charUUID) && !charUUID.includes(incomingChar)) { return; }
      if (!value || value.length === 0) { return; }
      const raw = String.fromCharCode(...value);
      console.log('[BLE RAW]', raw);
      onData(raw.trim());
    },
  );

  _disconnectListener = bleEmitter.addListener(
    'BleManagerDisconnectPeripheral',
    ({ peripheral }) => {
      if (peripheral === _deviceId) {
        console.log('[BLE] Device disconnected'); onDisconnect?.();
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Disconnect
// ─────────────────────────────────────────────────────────────────────────────
export async function disconnectDevice() {
  _dataListener?.remove(); _dataListener = null;
  _disconnectListener?.remove(); _disconnectListener = null;
  if (_deviceId) {
    try { await BleManager.stopNotification(_deviceId, BLE.SERVICE_UUID, BLE.CHAR_UUID); } catch (_) {}
    try { await BleManager.disconnect(_deviceId); } catch (_) {}
    _deviceId = null;
  }
  console.log('[BLE] Disconnected');
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse CSV — "ax,ay,az,gx,gy,gz,timestamp" → object or null
// ─────────────────────────────────────────────────────────────────────────────
export function parseCsv(line) {
  const parts = line.split(',');
  if (parts.length !== 7) { return null; }
  const nums = parts.map(Number);
  if (nums.some(Number.isNaN)) { return null; }
  return { ax: nums[0], ay: nums[1], az: nums[2], gx: nums[3], gy: nums[4], gz: nums[5], ts: nums[6] };
}

export { bleEmitter };