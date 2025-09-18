int ledPin = 13; // LED integrado

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();

    if (input == "ON") {
      digitalWrite(ledPin, HIGH);
      Serial.println("LED ENCENDIDO");
    }

    if (input == "OFF") {
      digitalWrite(ledPin, LOW);
      Serial.println("LED APAGADO");
    }
  }
}
