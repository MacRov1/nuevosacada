//--------------------------------------------------------------------
// Librerías y configuración
#include <DallasTemperature.h>
#include <OneWire.h>
#include <Adafruit_NeoPixel.h>
#include <LiquidCrystal_AIP31068_I2C.h>

//************** PUENTE H CON EN SIMULIDE ********************
// Solo 4 cables
#define PNP_IZQ  11   // PNP High-side izquierdo (PWM)
#define NPN_IZQ  3    // NPN Low-side izquierdo (PWM)
#define PNP_DER  9    // PNP High-side derecho (PWM)
#define NPN_DER  6    // NPN Low-side derecho (PWM)

int motorVelocidad = 0;      // 0-255
bool motorSentidoCW = true;  // true = horario
bool motorEncendido = false;

//--------------------------------------------------------------------
// Pines y objetos globales
const int ledVerde = 8;
const int ledAmarillo = 4;
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
// Configuración de los LEDs WS2812
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

// Intervalos de tiempo
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

//*************************************************************************************
//NUEVO SEMANA 14
// *********** MOTOR DC CON PUENTE H BJT (PNP + NPN)***********************************
void aplicarMotor() {
  Serial.print("DEBUG aplicarMotor -> encendido: ");
  Serial.print(motorEncendido ? "1" : "0");
  Serial.print(" | sentido: ");
  Serial.print(motorSentidoCW ? "ho" : "ah");
  Serial.print(" | velocidad: ");
  Serial.println(motorVelocidad);

  // Primero, motor apagado o velocidad 0
  if (!motorEncendido || motorVelocidad <= 0) {
    // Apagado total (modo seguro)
    analogWrite(PNP_IZQ, 0);   // PNP OFF
    analogWrite(NPN_IZQ, 0);   // NPN OFF
    analogWrite(PNP_DER, 0);   // PNP OFF
    analogWrite(NPN_DER, 0);   // NPN OFF
    Serial.println("motor-status:off,0");
    return;
  }

  // Pequeña pausa de seguridad entre sentidos
  static bool ultimoSentidoCW = true;
  if (ultimoSentidoCW != motorSentidoCW) {
    analogWrite(PNP_IZQ, 0);
    analogWrite(PNP_DER, 0);
    analogWrite(NPN_IZQ, 0);
    analogWrite(NPN_DER, 0);
    delay(100);
    ultimoSentidoCW = motorSentidoCW;
  }

  int pwm = constrain(motorVelocidad, 0, 255);

  if (motorSentidoCW) {
    // Sentido horario (corriente: izquierda -> derecha)
    analogWrite(PNP_IZQ, pwm);        // PNP izquierdo ON
    analogWrite(NPN_IZQ, 0);          // NPN izquierdo OFF
    analogWrite(PNP_DER, 0);          // PNP derecho OFF
    analogWrite(NPN_DER, pwm);        // NPN derecho ON
  } else {
    // Sentido antihorario (corriente: derecha -> izquierda)
    analogWrite(PNP_DER, pwm);        // PNP derecho ON
    analogWrite(NPN_DER, 0);          // NPN derecho OFF
    analogWrite(PNP_IZQ, 0);          // PNP izquierdo OFF
    analogWrite(NPN_IZQ, pwm);        // NPN izquierdo ON
  }

  Serial.print("motor-status:on,");
  Serial.print(motorSentidoCW ? "ho" : "ah");
  Serial.print(",");
  Serial.println(pwm);
}
//---------------------------------------------------------------------------------------
//****************************************************************************************

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
// Bloques principales del loop
//----------------------------------------------------------------
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

// Procesa comandos recibidos por Serial (MQTT → Arduino)
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
   //**********************************************************************************************
  //NUEVO SEMANA 14
  // --------------- CONTROL DEL MOTOR CON PUENTE H -----------------------
  else if (command.startsWith("motor:")) {
    String rest = command.substring(6);
    rest.trim();
    rest.toLowerCase();

    Serial.print("motor-cmd recibido: ");
    Serial.println(rest);

    if (rest == "on") {
      motorEncendido = true;
      aplicarMotor();
    }
    else if (rest == "off") {
      motorEncendido = false;
      aplicarMotor();
    }
    else if (rest == "ho") {
      motorSentidoCW = true;
      Serial.println("motor: sentido -> Horario (interno actualizado)");
      if (motorEncendido) aplicarMotor();
      else Serial.println("motor: cambiado sentido, pero motor está OFF");
    }
    else if (rest == "ah") {
      motorSentidoCW = false;
      Serial.println("motor: sentido -> Antihorario (interno actualizado)");
      if (motorEncendido) aplicarMotor();
      else Serial.println("motor: cambiado sentido, pero motor está OFF");
    }
    else if (rest.startsWith("speed:")) {
      int nuevaVel = rest.substring(6).toInt();
      motorVelocidad = constrain(nuevaVel, 0, 255);
      Serial.print("motor: velocidad seteada a ");
      Serial.println(motorVelocidad);
      if (motorEncendido) {
        aplicarMotor();
      } else {
        Serial.println("motor: velocidad actualizada pero motor OFF");
      }
    }
    else if (rest.startsWith("set:")) {
      // motor:set:on,cw,200
      String data = rest.substring(4);
      int p1 = data.indexOf(',');
      int p2 = data.lastIndexOf(',');
      if (p1 > 0 && p2 > p1) {
        String onoff = data.substring(0, p1);
        String dir = data.substring(p1+1, p2);
        int vel = data.substring(p2+1).toInt();
        motorEncendido = (onoff == "on");
        motorSentidoCW = (dir == "cw");
        motorVelocidad = constrain(vel, 0, 255);
        Serial.print("motor:set -> ");
        Serial.print(onoff); Serial.print(", ");
        Serial.print(dir); Serial.print(", ");
        Serial.println(motorVelocidad);
        aplicarMotor();
      }
    }
  //**********************************************************************************************
    else {
      Serial.println("motor-cmd-desconocido:" + rest);
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

  //************************************************************
  // ====== PUENTE H PINS ======
  pinMode(PNP_IZQ, OUTPUT);
  pinMode(NPN_IZQ, OUTPUT);
  pinMode(PNP_DER, OUTPUT);
  pinMode(NPN_DER, OUTPUT);

  // Inicialmente motor apagado
  aplicarMotor();
  //************************************************************

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

  // Motor apagado al inicio
  aplicarMotor();
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
