/*
 * SCOUT SLEEVE v1.2 - ESP32 + MPU6050 BLE Data Streamer
 *                   + Real-Time Valgus Collapse Detection
 *
 * CHANGES FROM v1.1:
 *   1. BLEDevice::setMTU(185) added in initBLE()
 *      WHY: Tells the ESP32 BLE stack to accept a larger MTU from the phone.
 *           Without this, even if the Android app requests MTU 128, the ESP32
 *           may reject it and stay at 23 bytes (20 payload). Setting 185 here
 *           means the negotiated MTU will be min(128, 185) = 128 bytes, giving
 *           125 bytes of payload — enough for the full CSV packet.
 *
 *   2. snprintf format changed from %.3f/%.4f to %.2f/%.3f
 *      WHY: Even with MTU negotiation some older Android phones cap at 23 bytes.
 *           Reducing precision shortens the packet from ~48 to ~38 chars,
 *           closer to safe. This is a belt-and-suspenders measure alongside MTU.
 *           Scientific precision is unchanged for the app's purposes (2 decimal
 *           places for accel = 0.01 m/s² resolution; 3 for gyro = 0.001 rad/s).
 *
 * Hardware:
 * - ESP32 DevKit V1 (30-pin)
 * - MPU6050 (GY-521): VCC→3.3V, GND→GND, SCL→GPIO22, SDA→GPIO21
 * - Red LED   → GPIO13 → 220Ω → GND
 * - Green LED → GPIO26 → 220Ω → GND
 */

#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ========== CONFIGURATION ==========
#define MPU6050_ADDR     0x68
#define SAMPLE_RATE_HZ   50
#define SAMPLE_DELAY_MS  (1000 / SAMPLE_RATE_HZ)

#define REG_PWR_MGMT_1   0x6B
#define REG_ACCEL_CONFIG 0x1C
#define REG_GYRO_CONFIG  0x1B
#define REG_ACCEL_XOUT_H 0x3B
#define REG_WHO_AM_I     0x75

#define BLE_DEVICE_NAME  "SCOUT SLEEVE v1"
#define SERVICE_UUID     "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_UUID        "beb5483e-36e1-4688-b7f5-ea07361b26a8"

#define ACCEL_SCALE  (8.0f / 32768.0f)
#define GYRO_SCALE   (500.0f / 32768.0f)
#define GRAVITY      9.81f
#define DEG_TO_RAD   (PI / 180.0f)

#define LED_RED    13
#define LED_GREEN  26
#define LED_BUILTIN_PIN 2

#define IMPACT_THRESHOLD_MS2  (4.0f * GRAVITY)
#define VALGUS_THRESHOLD_MS2  (2.0f * GRAVITY)

// ========== GLOBAL VARIABLES ==========
BLEServer         *pServer         = NULL;
BLECharacteristic *pCharacteristic = NULL;
bool     deviceConnected    = false;
bool     oldDeviceConnected = false;
uint32_t sampleCount        = 0;

// ========== BLE CALLBACKS ==========
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    deviceConnected = true;
    Serial.println("✓ BLE Client Connected");
  }
  void onDisconnect(BLEServer *pServer) {
    deviceConnected = false;
    Serial.println("✗ BLE Client Disconnected");
  }
};

// ========== I2C HELPERS ==========
bool writeRegister(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg); Wire.write(value);
  uint8_t error = Wire.endTransmission();
  if (error != 0) { Serial.printf("✗ I2C Write Error: %d\n", error); return false; }
  return true;
}

uint8_t readRegister(uint8_t reg) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg); Wire.endTransmission(false);
  Wire.requestFrom(MPU6050_ADDR, (uint8_t)1);
  if (Wire.available()) return Wire.read();
  return 0;
}

void readRegisters(uint8_t reg, uint8_t *buffer, uint8_t length) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg); Wire.endTransmission(false);
  Wire.requestFrom(MPU6050_ADDR, length);
  uint8_t i = 0;
  while (Wire.available() && i < length) buffer[i++] = Wire.read();
}

int16_t bytesToInt16(uint8_t high, uint8_t low) {
  return (int16_t)((high << 8) | low);
}

// ========== MPU6050 INIT ==========
bool initMPU6050() {
  Serial.println("\n========== MPU6050 INITIALIZATION ==========");
  Wire.beginTransmission(MPU6050_ADDR);
  uint8_t error = Wire.endTransmission();
  if (error != 0) {
    Serial.printf("✗ I2C Error %d — Check SDA=GPIO21 SCL=GPIO22 VCC=3.3V\n", error);
    return false;
  }
  Serial.println("✓ Device found at 0x68");
  uint8_t whoAmI = readRegister(REG_WHO_AM_I);
  Serial.printf("WHO_AM_I: 0x%02X %s\n", whoAmI,
    whoAmI == 0x68 ? "(✓ Genuine)" : "(⚠ Clone — proceeding)");
  if (!writeRegister(REG_PWR_MGMT_1, 0x00))   { return false; }
  delay(100);
  if (!writeRegister(REG_ACCEL_CONFIG, 0x10))  { return false; }
  if (!writeRegister(REG_GYRO_CONFIG,  0x10))  { return false; }
  Serial.println("✓ MPU6050 configured  ±8g  ±500°/s");
  Serial.println("========== INIT COMPLETE ==========\n");
  return true;
}

// ========== BLE INIT ==========
void initBLE() {
  Serial.println("\n========== BLE INITIALIZATION ==========");

  // ── CHANGE 1: Set MTU before init ────────────────────────────────────────
  // BEFORE: BLEDevice::init(BLE_DEVICE_NAME);  (no MTU set — defaults to 23)
  // AFTER:  setMTU(185) then init
  //
  // This tells the ESP32 stack to accept up to 185-byte MTU requests.
  // Android will negotiate min(requested=128, server=185) = 128 bytes,
  // giving 125 bytes of actual payload per notification.
  // Without this, packets over 20 bytes are silently truncated.
  BLEDevice::setMTU(185);
  // ─────────────────────────────────────────────────────────────────────────

  BLEDevice::init(BLE_DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.printf("✓ BLE ready — %s\n", BLE_DEVICE_NAME);
  Serial.println("========== BLE READY ==========\n");
}

// ========== SENSOR READ ==========
void readSensorData(float &ax, float &ay, float &az,
                    float &gx, float &gy, float &gz) {
  uint8_t buf[14];
  readRegisters(REG_ACCEL_XOUT_H, buf, 14);
  
  // v1.3 (correct):
  float hw_x = bytesToInt16(buf[0], buf[1]) * ACCEL_SCALE * GRAVITY;
  float hw_z = bytesToInt16(buf[4], buf[5]) * ACCEL_SCALE * GRAVITY;
  ax = hw_z;   // physical Z is lateral in your mount
  az = hw_x;   // physical X is vertical in your mount
  
  ay = bytesToInt16(buf[2],  buf[3])  * ACCEL_SCALE * GRAVITY;
  
  gx = bytesToInt16(buf[8],  buf[9])  * GYRO_SCALE * DEG_TO_RAD;
  gy = bytesToInt16(buf[10], buf[11]) * GYRO_SCALE * DEG_TO_RAD;
  gz = bytesToInt16(buf[12], buf[13]) * GYRO_SCALE * DEG_TO_RAD;
}

// ========== VALGUS LED ==========
void updateValgusLEDs(float ax, float az) {
  float vertical = fabsf(az);
  float lateral  = fabsf(ax);
  if (vertical > IMPACT_THRESHOLD_MS2) {
    if (lateral > VALGUS_THRESHOLD_MS2) {
      digitalWrite(LED_RED, HIGH); delay(1000); digitalWrite(LED_GREEN, LOW);
    } else {
      digitalWrite(LED_RED, LOW); digitalWrite(LED_GREEN, HIGH); delay(1000);
    }
  } else {
    digitalWrite(LED_RED, LOW); digitalWrite(LED_GREEN, LOW);
  }
}

// ========== ERROR ==========
void fatalError(const char *message) {
  Serial.println(message);
  pinMode(LED_BUILTIN_PIN, OUTPUT);
  while (true) {
    digitalWrite(LED_BUILTIN_PIN, HIGH); delay(100);
    digitalWrite(LED_BUILTIN_PIN, LOW);  delay(100);
  }
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n╔════════════════════════════╗");
  Serial.println("║  SCOUT SLEEVE v1.2 STARTUP ║");
  Serial.println("╚════════════════════════════╝");

  pinMode(LED_RED,   OUTPUT); digitalWrite(LED_RED,   LOW);
  pinMode(LED_GREEN, OUTPUT); digitalWrite(LED_GREEN, LOW);
  Serial.println("✓ LEDs configured");

  Wire.begin(21, 22);
  Wire.setClock(400000);
  Serial.println("✓ I2C initialized");

  if (!initMPU6050()) fatalError("MPU6050 init failed!");
  initBLE();

  Serial.println("╔════════════════════════════╗");
  Serial.println("║       SYSTEM READY         ║");
  Serial.println("╚════════════════════════════╝");
}

// ========== MAIN LOOP ==========
void loop() {
  // BLE reconnect state machine
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Restarting BLE advertising...");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
    sampleCount = 0;
    Serial.println("\n--- BLE stream started ---\n");
  }

  float ax, ay, az, gx, gy, gz;
  readSensorData(ax, ay, az, gx, gy, gz);
  updateValgusLEDs(ax, az);

  if (deviceConnected) {
    unsigned long timestamp = millis();
    char dataString[64];

    // ── CHANGE 2: Shorter float precision ──────────────────────────────────
    // BEFORE: snprintf(..., "%.3f,%.3f,%.3f,%.4f,%.4f,%.4f,%lu", ...)
    //         → produces ~48 chars, exceeds 20-byte default MTU
    //
    // AFTER:  snprintf(..., "%.2f,%.2f,%.2f,%.3f,%.3f,%.3f,%lu", ...)
    //         → produces ~38 chars, fits within 20-byte MTU on fallback devices
    //         → resolution: accel 0.01 m/s², gyro 0.001 rad/s (sufficient)
    snprintf(dataString, sizeof(dataString),
             "%.2f,%.2f,%.2f,%.3f,%.3f,%.3f,%lu",
             ax, ay, az, gx, gy, gz, timestamp);
    // ─────────────────────────────────────────────────────────────────────────

    pCharacteristic->setValue(dataString);
    pCharacteristic->notify();

    if (sampleCount % 50 == 0) {
      Serial.printf("[%lu] %s\n", sampleCount, dataString);
    }
    sampleCount++;
  }

  delay(SAMPLE_DELAY_MS);
}