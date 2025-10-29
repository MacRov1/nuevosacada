//--------------------------------------------------------------------
//Nuevo Semana 12
#include <DallasTemperature.h>
#include <OneWire.h>
//--------------------------------------------------------------------
#include <Adafruit_NeoPixel.h> //Nuevo para los leds
#include <LiquidCrystal_AIP31068_I2C.h>
const int ledVerde = 8; // Pin para LED verde
const int ledAmarillo = 9; // Pin para LED amarillo
const int ledRojo = 12; // Pin para LED rojo
const int pulsador = 2; // Pin para el pulsador
//-----------------------------------------------------------------
//Nuevo Semana 12
#define ONE_WIRE_BUS 7 // Pin donde están conectados los DS18B20
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
// Direcciones ROM de los sensores DS18B20
DeviceAddress sensor1 = {0x28, 0x5F, 0xA6, 0x51, 0xFC, 0x00, 0x00, 0xDA};
DeviceAddress sensor2 = {0x28, 0x51, 0xB4, 0x30, 0xFF, 0x00, 0x00, 0xCD};
DeviceAddress sensor3 = {0x28, 0x62, 0xA2, 0x19, 0xFC, 0x00, 0x00, 0x9E};
// Umbrales de temperatura
float UMBRAL_NORMAL = -10.0; // límite inferior
float UMBRAL_ADVERTENCIA = 20.0; // fin de zona normal
float UMBRAL_RIESGO = 35.0; // fin de zona advertencia
//----------------------------------------------------------------
//Pines para WS2812
const int WS_PIN = 10; //Pin de datos para WS2812
const int NUM_LEDS = 2;
Adafruit_NeoPixel pixels(NUM_LEDS, WS_PIN, NEO_GRB + NEO_KHZ800);
// --------------------------------------------------------------------
// NUEVO: LEDs térmicos WS2812 (3 LEDs en pin 5)
const int WS_TEMP_PIN = 5; // Pin de datos para los LEDs térmicos
const int NUM_LEDS_TEMP = 3; // Un LED por sensor
Adafruit_NeoPixel pixelsTemp(NUM_LEDS_TEMP, WS_TEMP_PIN, NEO_GRB + NEO_KHZ800);
// --------------------------------------------------------------------
int estadoAnteriorBoton = HIGH;
bool modoFuncionando = true;
unsigned long tiempoAnteriorSemaforo = 0;
unsigned long tiempoAnteriorMantenimiento = 0;
unsigned long ultimoTiempoTemp = 0; // Nuevo: para temporizador de temperatura
const unsigned long intervaloMantenimiento = 500;
const unsigned long intervaloE1 = 3000;
const unsigned long intervaloE2 = 1000;
const unsigned long intervaloE0 = 5000;
const unsigned long intervaloTemp = 1000; // Nuevo: 1 segundo para lecturas de temperatura
int estadoSemaforo = 0;
bool ledsEncendidos = false;
LiquidCrystal_AIP31068_I2C lcd2(0x3E, 16, 2);
// Función para setear color en los 2 LEDs WS2812
void setWSColor(uint32_t color) {
  for (int i = 0; i < NUM_LEDS; i++) {
    pixels.setPixelColor(i, color);
  }
  pixels.show();
  // Solo para depuración en SimulIDE
  Serial.print("WS2812 color: ");
  Serial.println(color, HEX);
}
//-----------------------------------------------------------------
//Nuevo Semana 12
void setTempColor(uint32_t color) {
  for (int i = 0; i < NUM_LEDS_TEMP; i++) {
    pixelsTemp.setPixelColor(i, color);
  }
  pixelsTemp.show();
  // Depuración en Serial
  Serial.print("LED Térmico color: ");
  Serial.println(color, HEX);
}
//Nuevo Semana 12: Sensores DS18B20
void actualizarLEDTemp(float t1, float t2, float t3) {
  float temps[3] = {t1, t2, t3};
  for (int i = 0; i < 3; i++) {
    uint32_t colorTemp;
    if (temps[i] < UMBRAL_NORMAL || temps[i] > UMBRAL_RIESGO) {
      colorTemp = pixelsTemp.Color(255, 0, 0); // Rojo (Riesgo: muy frío o muy caliente)
    } else if (temps[i] <= UMBRAL_ADVERTENCIA) {
      colorTemp = pixelsTemp.Color(0, 255, 0); // Verde (Normal)
    } else {
      colorTemp = pixelsTemp.Color(255, 165, 0); // Ámbar (Advertencia)
    }
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
  Serial.print("Sensor 1: "); Serial.print(t1); Serial.println(" C");
  Serial.print("Sensor 2: "); Serial.print(t2); Serial.println(" C");
  Serial.print("Sensor 3: "); Serial.print(t3); Serial.println(" C");
  Serial.println("------------------------------------");
  actualizarLEDTemp(t1, t2, t3);
}
//Nueva funcion para ver si anda lo de conetar con el front
void setUmbrales(float normal, float advertencia, float riesgo) {
  UMBRAL_NORMAL = normal;
  UMBRAL_ADVERTENCIA = advertencia;
  UMBRAL_RIESGO = riesgo;

  Serial.print("Umbrales actualizados -> Normal: "); Serial.print(UMBRAL_NORMAL);
  Serial.print(" | Advertencia: "); Serial.print(UMBRAL_ADVERTENCIA);
  Serial.print(" | Riesgo: "); Serial.println(UMBRAL_RIESGO);

  // Enviar de vuelta al frontend
  Serial.print("umbrales:");
  Serial.print(UMBRAL_NORMAL); Serial.print(",");
  Serial.print(UMBRAL_ADVERTENCIA); Serial.print(",");
  Serial.println(UMBRAL_RIESGO);

  // Fuerza actualización de LEDs inmediatamente
  leerTemperaturas();

  Serial.println("Estado: Umbrales actualizados");
}

//----------------------------------------------------------------
void setup() {
  pinMode(ledVerde, OUTPUT);
  pinMode(ledAmarillo, OUTPUT);
  pinMode(ledRojo, OUTPUT);
  pinMode(pulsador, INPUT_PULLUP);
  Serial.begin(9600);
  Serial.println("Iniciando Semaforo...");
  lcd2.init(); // LCD I2C
  pixels.begin();
  pixels.show();
  pixels.setBrightness(120);
  //pixels.setPixelColor(0, pixels.Color(0, 0, 255));
  //pixels.Color(0, 0, 255);
  pixels.show(); //CREO QUE ESTO SE SACA

  //-----------------------------------------------------------------------
  //Nuevo Semana 12: Inicializar los LEDs térmicos
  pixelsTemp.begin();
  pixelsTemp.show();
  pixelsTemp.setBrightness(120);

  //---- Nuevo Semana 12: Inicializar sensores DS18B20 ----
  sensors.begin();
  sensors.setResolution(sensor1, 12);
  sensors.setResolution(sensor2, 12);
  sensors.setResolution(sensor3, 12);
  //------------------------------------------------------------------------

  // Enviar umbrales iniciales al frontend
  Serial.print("umbrales:");
  Serial.print(UMBRAL_NORMAL); Serial.print(",");
  Serial.print(UMBRAL_ADVERTENCIA); Serial.print(",");
  Serial.println(UMBRAL_RIESGO);

  digitalWrite(ledRojo, HIGH); // Estado inicial E0
  Serial.println("Estado E0");
}
void loop() {
  int estadoActualBoton = digitalRead(pulsador);
  if (estadoActualBoton == LOW && estadoAnteriorBoton == HIGH) {
    delay(50); // Debounce
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
  estadoAnteriorBoton = estadoActualBoton;
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    Serial.println("Comando recibido: '" + command + "'");
    if (command == "activar") {
      modoFuncionando = true;
      Serial.println("Semaforo activado");
      estadoSemaforo = 0;
      digitalWrite(ledVerde, LOW);
      digitalWrite(ledAmarillo, LOW);
      digitalWrite(ledRojo, HIGH);
      Serial.println("Estado E0");
    } else if (command == "apagar") {
      modoFuncionando = false;
      Serial.println("Semaforo apagado");
      digitalWrite(ledVerde, LOW);
      digitalWrite(ledAmarillo, LOW);
      digitalWrite(ledRojo, LOW);
      Serial.println("Estado Mantenimiento Off");
    } else if (command.startsWith("lcd:")) {
      String msg = command.substring(4);
      Serial.println("Mostrando en LCD: '" + msg + "'");
      // LCD I2C
      lcd2.clear();
      lcd2.setCursor(0, 0);
      lcd2.print(msg.substring(0, 16));
      if (msg.length() > 16) {
        lcd2.setCursor(0, 1);
        lcd2.print(msg.substring(16, 32));
      }
    } else if (command.startsWith("ws:")) {
      String color = command.substring(3);
      Serial.println("Cambiando LEDs WS2812 a: " + color);
      uint32_t rgbColor;
      if (color == "verde") rgbColor = pixels.Color(0, 255, 0); // Verde
      else if (color == "rojo") rgbColor = pixels.Color(255, 0, 0); // Rojo
      else if (color == "azul") rgbColor = pixels.Color(0, 0, 255); // Azul
      else if (color == "naranja") rgbColor = pixels.Color(255, 165, 0); // Naranja
      else if (color == "amarillo") rgbColor = pixels.Color(255, 255, 0); // Amarillo
      else if (color == "celeste") rgbColor = pixels.Color(0, 255, 255); // Celeste
      else if (color == "violeta") rgbColor = pixels.Color(128, 0, 128); // Violeta
      else if (color == "rosa") rgbColor = pixels.Color(255, 192, 203); // Rosa
      else if (color == "blanco") rgbColor = pixels.Color(255, 255, 255); // Blanco
      else if (color == "magenta") rgbColor = pixels.Color(255, 0, 255); // Magenta
      else rgbColor = pixels.Color(0, 0, 0); // Apagado por default
      setWSColor(rgbColor); // Setear color en los 2 LEDs
    } else if (command.startsWith("umbral:")) {
      // Formato esperado: umbral:20,35,50
      String valores = command.substring(7);
      int index1 = valores.indexOf(',');
      int index2 = valores.lastIndexOf(',');
      if (index1 > 0 && index2 > index1) {
        float n = valores.substring(0, index1).toFloat();
        float a = valores.substring(index1 + 1, index2).toFloat();
        float r = valores.substring(index2 + 1).toFloat();
        setUmbrales(n, a, r);
        Serial.println("Estado: Umbrales actualizados");
      }
    } else {
      Serial.println("Comando desconocido: " + command);
    }
  }
  //--------------------------------------------------------------------
  //---- Nuevo Semana 12: Lectura continua de temperatura ----
  if (modoFuncionando && millis() - ultimoTiempoTemp >= intervaloTemp) {
    leerTemperaturas();
    ultimoTiempoTemp = millis();
  }
  //----------------------------------------------------------
  if (modoFuncionando) {
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
  } else {
    unsigned long tiempoActual = millis();
    if (tiempoActual - tiempoAnteriorMantenimiento >= intervaloMantenimiento) {
      tiempoAnteriorMantenimiento = tiempoActual;
      ledsEncendidos = !ledsEncendidos;
      digitalWrite(ledVerde, ledsEncendidos);
      digitalWrite(ledAmarillo, ledsEncendidos);
      digitalWrite(ledRojo, ledsEncendidos);
      if (ledsEncendidos)
        Serial.println("Estado Mantenimiento On");
      else
        Serial.println("Estado Mantenimiento Off");
    }
  }
}
