//--------------------------------------------------------------------
//Nuevo Semana 12
#include <DallasTemperature.h>
#include <OneWire.h>                   
//--------------------------------------------------------------------
#include <Adafruit_NeoPixel.h> //Nuevo para los leds
#include <LiquidCrystal_AIP31068_I2C.h>

const int ledVerde = 8;    // Pin para LED verde
const int ledAmarillo = 9; // Pin para LED amarillo
const int ledRojo = 12;    // Pin para LED rojo
const int pulsador = 2;    // Pin para el pulsador

//Pines para WS2812
const int WS_PIN =10;   //Pin de datos para WS2812
const int NUM_LEDS =2;

//-----------------------------------------------------------------------
//Nuevo Semana 12
#define ONE_WIRE_BUS 7
const int WS2_PIN =5;   //Pin de datos para WS2812 para representar lo de los sensores de temperatura
const int NUM2_LEDS =3; //Cantidad de led
//------------------------------------------------------------------------

int estadoAnteriorBoton = HIGH;
bool modoFuncionando = true;

unsigned long tiempoAnteriorSemaforo = 0;
unsigned long tiempoAnteriorMantenimiento = 0;
const unsigned long intervaloMantenimiento = 500;
const unsigned long intervaloE1 = 3000;
const unsigned long intervaloE2 = 1000;
const unsigned long intervaloE0 = 5000;
int estadoSemaforo = 0;

bool ledsEncendidos = false;

Adafruit_NeoPixel pixels(NUM_LEDS, WS_PIN, NEO_GRB + NEO_KHZ800); 
//---------------------------------------------------------------------
//Nuevo Semana 12
Adafruit_NeoPixel pixels2(NUM2_LEDS, WS2_PIN, NEO_GRB + NEO_KHZ800); 
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Umbrales generales
// Rango Verde
float minVerde = 20;
float maxVerde = 30;

// Rango Naranja (dos sub-rangos)
float minNaranja1 = 10, maxNaranja1 = 20;
float minNaranja2 = 30, maxNaranja2 = 40;

// Rango Rojo (dos sub-rangos)
float minRojo1 = -20, maxRojo1 = 10;
float minRojo2 = 40, maxRojo2 = 60;

// --- Direcciones ROM de cada sensor ---
DeviceAddress sensoresROM[3] = {
  {0x28, 0x5F, 0xA6, 0x51, 0xFC, 0x00, 0x00, 0xDA},
  {0x28, 0x51, 0xB4, 0x30, 0xFF, 0x00, 0x00, 0xCD},
  {0x28, 0x62, 0xA2, 0x19, 0xFC, 0x00, 0x00, 0x9E}
};

// --- Umbrales por sensor: [min, adv, riesgo] ---
float umbrales[NUM2_LEDS][3] = {
  {25.0, 35.0, 40.0}, // Sensor 1: Verde 25-35, Ámbar 35-40, Rojo >40 o <25
  {25.0, 35.0, 40.0}, // Sensor 2
  {25.0, 35.0, 40.0}  // Sensor 3
};

// Función que devuelve el color según temperatura y umbrales
uint32_t colorPorTemperatura(float temp) {
  if (temp >= minVerde && temp <= maxVerde) return pixels2.Color(0, 255, 0); // Verde
  else if ((temp >= minNaranja1 && temp <= maxNaranja1) || (temp >= minNaranja2 && temp <= maxNaranja2))
    return pixels2.Color(255, 165, 0); // Naranja
  else if ((temp >= minRojo1 && temp <= maxRojo1) || (temp >= minRojo2 && temp <= maxRojo2))
    return pixels2.Color(255, 0, 0); // Rojo
  else
    return pixels2.Color(0, 0, 255); // Azul si está fuera de todos los rangos
}
//---------------------------------------------------------------------
LiquidCrystal_AIP31068_I2C lcd2(0x3E, 16, 2);

// Función para setear color en los 2 LEDs WS2812
void setWSColor(uint32_t color) {
  for (int i = 0; i < NUM_LEDS; i++) {
    pixels.setPixelColor(i, color);
  }
  pixels.show();
}

void setup() {
  pinMode(ledVerde, OUTPUT);
  pinMode(ledAmarillo, OUTPUT);
  pinMode(ledRojo, OUTPUT);
  pinMode(pulsador, INPUT_PULLUP);
  Serial.begin(9600);
  Serial.println("Iniciando Semaforo...");

  lcd2.init();       // LCD I2C
  pixels.begin();
  pixels.show();
  pixels.setBrightness (120);
  pixels.show();
  //-------------------------------------------------------------------
  //Nuevo Semana 12
  pixels2.begin();
  pixels2.show();
  pixels2.setBrightness (120);
  pixels2.show();
  //-------------------------------------------------------------------
   
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
    }else if (command.startsWith("lcd:")) {
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
      if (color == "verde") rgbColor = pixels.Color(0, 255, 0);  // Verde 
      else if (color == "rojo") rgbColor = pixels.Color(255, 0, 0);  // Rojo 
      else if (color == "azul") rgbColor = pixels.Color(0, 0, 255);  // Azul 
      else if (color == "naranja") rgbColor = pixels.Color(255, 165, 0);   // Naranja
      else if (color == "amarillo") rgbColor = pixels.Color(255, 255, 0);  // Amarillo
      else if (color == "celeste") rgbColor = pixels.Color(0, 255, 255);   // Celeste
      else if (color == "violeta") rgbColor = pixels.Color(128, 0, 128);   // Violeta
      else if (color == "rosa") rgbColor = pixels.Color(255, 192, 203);    // Rosa
      else if (color == "blanco") rgbColor = pixels.Color(255, 255, 255);  // Blanco
      else if (color == "magenta") rgbColor = pixels.Color(255, 0, 255);   // Magenta
      else rgbColor = pixels.Color(0, 0, 0);  // Apagado por default
      setWSColor(rgbColor);  // Setear color en los 2 LEDs 
    }
    //--------------------------------------------------------------------------------------------------
    //Nuevo Semana 12
      // --- Ajuste de umbrales individuales ---
 // --- Comando de actualización de umbrales ---
  if (command.startsWith("umbral:")) {
    String datos = command.substring(7); // Quita "umbral:"
    // Separar cada rango por ";"
    int start = 0;
    int end = datos.indexOf(';');
    while (end != -1) {
      String rango = datos.substring(start, end);
      int pos1 = rango.indexOf(',');
      int pos2 = rango.lastIndexOf(',');
      if (pos1 != -1 && pos2 != -1) {
        String nombre = rango.substring(0, pos1);
        float minVal = rango.substring(pos1 + 1, pos2).toFloat();
        float maxVal = rango.substring(pos2 + 1).toFloat();

        if (nombre == "verde") { minVerde = minVal; maxVerde = maxVal; }
        else if (nombre == "naranja1") { minNaranja1 = minVal; maxNaranja1 = maxVal; }
        else if (nombre == "naranja2") { minNaranja2 = minVal; maxNaranja2 = maxVal; }
        else if (nombre == "rojo1") { minRojo1 = minVal; maxRojo1 = maxVal; }
        else if (nombre == "rojo2") { minRojo2 = minVal; maxRojo2 = maxVal; }
      }
      start = end + 1;
      end = datos.indexOf(';', start);
    }
    // Último rango (o si solo hay uno)
    String rango = datos.substring(start);
    int pos1 = rango.indexOf(',');
    int pos2 = rango.lastIndexOf(',');
    if (pos1 != -1 && pos2 != -1) {
      String nombre = rango.substring(0, pos1);
      float minVal = rango.substring(pos1 + 1, pos2).toFloat();
      float maxVal = rango.substring(pos2 + 1).toFloat();
      if (nombre == "verde") { minVerde = minVal; maxVerde = maxVal; }
      else if (nombre == "naranja1") { minNaranja1 = minVal; maxNaranja1 = maxVal; }
      else if (nombre == "naranja2") { minNaranja2 = minVal; maxNaranja2 = maxVal; }
      else if (nombre == "rojo1") { minRojo1 = minVal; maxRojo1 = maxVal; }
      else if (nombre == "rojo2") { minRojo2 = minVal; maxRojo2 = maxVal; }
    }

    Serial.println("Umbrales actualizados correctamente");
  }
    //---------------------------------------------------------------------------------------------------
    else {
      Serial.println("Comando desconocido: " + command);
    }
  }

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
    // --- Lectura de sensores con ROM ---
    sensors.requestTemperatures();
    float temps[NUM2_LEDS];
    for (int i = 0; i < NUM2_LEDS; i++) {
      temps[i] = sensors.getTempC(sensoresROM[i]);
      Serial.print("Temp Sensor "); Serial.print(i+1); Serial.print(": "); Serial.println(temps[i]);
      pixels2.setPixelColor(i, colorPorTemperatura(temps[i]));
    }
    pixels2.show();
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
      else {
        Serial.println("Estado Mantenimiento Off");
      }
    }
  }
} 
