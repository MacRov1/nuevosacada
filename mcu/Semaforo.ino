//--------------------------------------------------------------------
// Librerías y configuración
#include <DallasTemperature.h>
#include <OneWire.h>
#include <Adafruit_NeoPixel.h>
#include <LiquidCrystal_AIP31068_I2C.h>

//--------------------------------------------------------------------
// Pines y objetos globales
const int ledVerde = 8;
const int ledAmarillo = 9;
const int ledRojo = 12;
const int pulsador = 2;

#define ONE_WIRE_BUS 7
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

DeviceAddress sensor1 = {0x28, 0x5F, 0xA6, 0x51, 0xFC, 0x00, 0x00, 0xDA};
DeviceAddress sensor2 = {0x28, 0x51, 0xB4, 0x30, 0xFF, 0x00, 0x00, 0xCD};
DeviceAddress sensor3 = {0x28, 0x62, 0xA2, 0x19, 0xFC, 0x00, 0x00, 0x9E};

// Umbrales de temperatura
float UMBRAL_NORMAL = -10.0;
float UMBRAL_ADVERTENCIA = 20.0;
float UMBRAL_RIESGO = 35.0;

//----------------------------------------------------------------
// Configuración de los LEDs WS1812
const int WS_PIN = 10;
const int NUM_LEDS = 2;
Adafruit_NeoPixel pixels(NUM_LEDS, WS_PIN, NEO_GRB + NEO_KHZ800);

// WS2812 térmicos
const int WS_TEMP_PIN = 5;
const int NUM_LEDS_TEMP = 3;
Adafruit_NeoPixel pixelsTemp(NUM_LEDS_TEMP, WS_TEMP_PIN, NEO_GRB + NEO_KHZ800);

//----------------------------------------------------------------
// Variables de control
int estadoAnteriorBoton = HIGH;
bool modoFuncionando = true;
int estadoSemaforo = 0;
bool ledsEncendidos = false;

unsigned long tiempoAnteriorSemaforo = 0;
unsigned long tiempoAnteriorMantenimiento = 0;
unsigned long ultimoTiempoTemp = 0;

//Intervalos de tiempo
const unsigned long intervaloMantenimiento = 500;
const unsigned long intervaloE1 = 3000;
const unsigned long intervaloE2 = 1000;
const unsigned long intervaloE0 = 5000;
const unsigned long intervaloTemp = 1000;

LiquidCrystal_AIP31068_I2C lcd2(0x3E, 16, 2);

//----------------------------------------------------------------
// Funciones auxiliares
//----------------------------------------------------------------

void setWSColor(uint32_t color) {
  for (int i = 0; i < NUM_LEDS; i++) pixels.setPixelColor(i, color);
  pixels.show();
  Serial.print("WS2812 color: "); Serial.println(color, HEX);
}

void setTempColor(uint32_t color) {
  for (int i = 0; i < NUM_LEDS_TEMP; i++) pixelsTemp.setPixelColor(i, color);
  pixelsTemp.show();
  Serial.print("LED Térmico color: "); Serial.println(color, HEX);
}

void actualizarLEDTemp(float t1, float t2, float t3) {
  float temps[3] = {t1, t2, t3};
  for (int i = 0; i < 3; i++) {
    uint32_t colorTemp;
    if (temps[i] < UMBRAL_NORMAL || temps[i] > UMBRAL_RIESGO)
      colorTemp = pixelsTemp.Color(255, 0, 0);
    else if (temps[i] <= UMBRAL_ADVERTENCIA)
      colorTemp = pixelsTemp.Color(0, 255, 0);
    else
      colorTemp = pixelsTemp.Color(255, 165, 0);
    pixelsTemp.setPixelColor(i, colorTemp);
  }
  pixelsTemp.show();
}

void leerTemperaturas() {
  sensors.requestTemperatures();
  float t1 = sensors.getTempC(sensor1);
  float t2 = sensors.getTempC(sensor2);
  float t3 = sensors.getTempC(sensor3);
  Serial.println("------ Lectura de Temperaturas ------");
  Serial.print("Temp Cocina: "); Serial.print(t1); Serial.println(" C");
  Serial.print("Temp Habitación: "); Serial.print(t2); Serial.println(" C");
  Serial.print("Temp Dormitorio: "); Serial.print(t3); Serial.println(" C");
  actualizarLEDTemp(t1, t2, t3);
}

void setUmbrales(float normal, float advertencia, float riesgo) {
  UMBRAL_NORMAL = normal;
  UMBRAL_ADVERTENCIA = advertencia;
  UMBRAL_RIESGO = riesgo;

  Serial.print("Umbrales actualizados -> Normal: "); Serial.print(UMBRAL_NORMAL);
  Serial.print(" | Advertencia: "); Serial.print(UMBRAL_ADVERTENCIA);
  Serial.print(" | Riesgo: "); Serial.println(UMBRAL_RIESGO);
  Serial.print("umbrales:");
  Serial.print(UMBRAL_NORMAL); Serial.print(",");
  Serial.print(UMBRAL_ADVERTENCIA); Serial.print(",");
  Serial.println(UMBRAL_RIESGO);

  leerTemperaturas();
}

//----------------------------------------------------------------
// Bloques pincipales del loop
//----------------------------------------------------------------

// Detecta pulsador y cambia modo
void manejarBoton() {
  int estadoActual = digitalRead(pulsador);
  if (estadoActual == LOW && estadoAnteriorBoton == HIGH) {
    delay(50);
    modoFuncionando = !modoFuncionando;
    digitalWrite(ledVerde, LOW);
    digitalWrite(ledAmarillo, LOW);
    digitalWrite(ledRojo, LOW);
    if (modoFuncionando) {
      Serial.println("Cambiado a modo FUNCIONANDO");
      estadoSemaforo = 0;
      digitalWrite(ledRojo, HIGH);
      Serial.println("Estado E0");
    } else {
      Serial.println("Cambiado a modo MANTENIMIENTO");
    }
  }
  estadoAnteriorBoton = estadoActual;
}

// Procesa comandos recibidos por Serial
void manejarComandosSerial() {
  if (Serial.available() <= 0) return;

  String command = Serial.readStringUntil('\n');
  command.trim();
  Serial.println("Comando recibido: '" + command + "'");

  if (command == "activar") {
    modoFuncionando = true;
    estadoSemaforo = 0;
    digitalWrite(ledVerde, LOW);
    digitalWrite(ledAmarillo, LOW);
    digitalWrite(ledRojo, HIGH);
    Serial.println("Semaforo activado -> Estado E0");
  }
  else if (command == "apagar") {
    modoFuncionando = false;
    digitalWrite(ledVerde, LOW);
    digitalWrite(ledAmarillo, LOW);
    digitalWrite(ledRojo, LOW);
    Serial.println("Semaforo apagado -> Mantenimiento Off");
  }
  else if (command.startsWith("lcd:")) {
    String msg = command.substring(4);
    lcd2.clear();
    lcd2.setCursor(0, 0);
    lcd2.print(msg.substring(0, 16));
    if (msg.length() > 16) {
      lcd2.setCursor(0, 1);
      lcd2.print(msg.substring(16, 32));
    }
  }
  else if (command.startsWith("ws:")) {
    String color = command.substring(3);
    uint32_t rgbColor;
    if (color == "verde") rgbColor = pixels.Color(0, 255, 0);
    else if (color == "rojo") rgbColor = pixels.Color(255, 0, 0);
    else if (color == "azul") rgbColor = pixels.Color(0, 0, 255);
    else if (color == "naranja") rgbColor = pixels.Color(255, 165, 0);
    else if (color == "amarillo") rgbColor = pixels.Color(255, 255, 0);
    else if (color == "celeste") rgbColor = pixels.Color(0, 255, 255);
    else if (color == "violeta") rgbColor = pixels.Color(128, 0, 128);
    else if (color == "rosa") rgbColor = pixels.Color(255, 192, 203);
    else if (color == "blanco") rgbColor = pixels.Color(255, 255, 255);
    else if (color == "magenta") rgbColor = pixels.Color(255, 0, 255);
    else rgbColor = pixels.Color(0, 0, 0);
    setWSColor(rgbColor);
  }
  else if (command.startsWith("umbral:")) {
    String valores = command.substring(7);
    int index1 = valores.indexOf(',');
    int index2 = valores.lastIndexOf(',');
    if (index1 > 0 && index2 > index1) {
      float n = valores.substring(0, index1).toFloat();
      float a = valores.substring(index1 + 1, index2).toFloat();
      float r = valores.substring(index2 + 1).toFloat();
      setUmbrales(n, a, r);
    }
  }
  else {
    Serial.println("Comando desconocido: " + command);
  }
}

// Controla los estados del semáforo
void manejarSemaforo() {
  unsigned long tiempoActual = millis();
  switch (estadoSemaforo) {
    case 0:
      if (tiempoActual - tiempoAnteriorSemaforo >= intervaloE0) {
        digitalWrite(ledRojo, LOW);
        digitalWrite(ledVerde, HIGH);
        Serial.println("Estado E1");
        estadoSemaforo = 1;
        tiempoAnteriorSemaforo = tiempoActual;
      }
      break;
    case 1:
      if (tiempoActual - tiempoAnteriorSemaforo >= intervaloE1) {
        digitalWrite(ledVerde, LOW);
        digitalWrite(ledAmarillo, HIGH);
        Serial.println("Estado E2");
        estadoSemaforo = 2;
        tiempoAnteriorSemaforo = tiempoActual;
      }
      break;
    case 2:
      if (tiempoActual - tiempoAnteriorSemaforo >= intervaloE2) {
        digitalWrite(ledAmarillo, LOW);
        digitalWrite(ledRojo, HIGH);
        Serial.println("Estado E0");
        estadoSemaforo = 0;
        tiempoAnteriorSemaforo = tiempoActual;
      }
      break;
  }
}

// Parpadeo de mantenimiento
void manejarMantenimiento() {
  unsigned long tiempoActual = millis();
  if (tiempoActual - tiempoAnteriorMantenimiento >= intervaloMantenimiento) {
    tiempoAnteriorMantenimiento = tiempoActual;
    ledsEncendidos = !ledsEncendidos;
    digitalWrite(ledVerde, ledsEncendidos);
    digitalWrite(ledAmarillo, ledsEncendidos);
    digitalWrite(ledRojo, ledsEncendidos);
    Serial.println(ledsEncendidos ? "Estado Mantenimiento On" : "Estado Mantenimiento Off");
  }
}

//----------------------------------------------------------------
// Setup y loop limpio
//----------------------------------------------------------------
void setup() {
  pinMode(ledVerde, OUTPUT);
  pinMode(ledAmarillo, OUTPUT);
  pinMode(ledRojo, OUTPUT);
  pinMode(pulsador, INPUT_PULLUP);
  Serial.begin(9600);
  lcd2.init();

  pixels.begin(); pixels.show(); pixels.setBrightness(120);
  pixelsTemp.begin(); pixelsTemp.show(); pixelsTemp.setBrightness(120);
  sensors.begin();
  sensors.setResolution(sensor1, 12);
  sensors.setResolution(sensor2, 12);
  sensors.setResolution(sensor3, 12);

  Serial.print("umbrales:");
  Serial.print(UMBRAL_NORMAL); Serial.print(",");
  Serial.print(UMBRAL_ADVERTENCIA); Serial.print(",");
  Serial.println(UMBRAL_RIESGO);

  digitalWrite(ledRojo, HIGH);
  Serial.println("Estado E0");
}

void loop() {
  manejarBoton();
  manejarComandosSerial();

  if (modoFuncionando) {
    if (millis() - ultimoTiempoTemp >= intervaloTemp) {
      leerTemperaturas();
      ultimoTiempoTemp = millis();
    }
    manejarSemaforo();
  } else {
    manejarMantenimiento();
  }
}
