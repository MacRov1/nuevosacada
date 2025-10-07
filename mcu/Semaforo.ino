#include <Adafruit_NeoPixel.h> //Nuevo para los leds
#include <LiquidCrystal_AIP31068_I2C.h>

const int ledVerde = 8;    // Pin para LED verde
const int ledAmarillo = 9; // Pin para LED amarillo
const int ledRojo = 12;    // Pin para LED rojo
const int pulsador = 2;    // Pin para el pulsador

//Pines para WS2812
const int WS_PIN =10;   //Pin de datos para WS2812
const int NUM_LEDS =2;    

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
  //pixels.setPixelColor (0, pixels.Color(0, 0, 255));
  //pixels.Color(0, 0, 255);
  pixels.show();
  
  
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
    } else {
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
