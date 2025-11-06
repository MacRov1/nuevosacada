#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== ESCANEO DE REDES WI-FI ===");

  // Configurar ESP32 en modo estación
  WiFi.mode(WIFI_STA); //Par que se comporte como si fuer aun cliente (como un celular o notebook)
  WiFi.disconnect(); // asegurarse de no estar conectado
  delay(100);
}

void loop() {
  Serial.println("\nIniciando escaneo...");
  int n = WiFi.scanNetworks(); //Busca todas las redes disponibles y devuelve cuantas encontró (n)
  Serial.println("-------------------------------------------");

  if (n == 0) {
    Serial.println("No se encontraron redes."); //Si no encontro, lo informa
  } else {
    Serial.printf("Se encontraron %d redes:\n\n", n); //Si encontró, devuelve cuantas
    for (int i = 0; i < n; ++i) {
      String ssid = WiFi.SSID(i); //Nombre (SSID)
      int32_t rssi = WiFi.RSSI(i); //Intensidad de la señal en dBm (valor negativo, mas cerca de 0 = merjo señaol)
      int32_t channel = WiFi.channel(i); //Canal que usa el AP
      String bssid = WiFi.BSSIDstr(i); //Direccion MAC del router (BSSID)
      wifi_auth_mode_t authmode = WiFi.encryptionType(i); //Tipo de cifrado/autenticacion

      // Muestra de forma legible la informacion de cada red encontrada
      Serial.printf("Red #%d\n", i + 1);
      Serial.printf("  SSID: %s\n", ssid.c_str());
      Serial.printf("  BSSID (MAC): %s\n", bssid.c_str());
      Serial.printf("  RSSI: %d dBm\n", rssi);
      Serial.printf("  Canal: %d\n", channel);

      // Traduce el tipo de cifrada (que viene como un número) a una palabra legible.
      String encType;
      switch (authmode) {
        case WIFI_AUTH_OPEN: encType = "Abierta"; break;
        case WIFI_AUTH_WEP: encType = "WEP"; break;
        case WIFI_AUTH_WPA_PSK: encType = "WPA"; break;
        case WIFI_AUTH_WPA2_PSK: encType = "WPA2"; break;
        case WIFI_AUTH_WPA_WPA2_PSK: encType = "WPA+WPA2"; break;
        case WIFI_AUTH_WPA2_ENTERPRISE: encType = "WPA2-Enterprise"; break;
        default: encType = "Desconocido"; break;
      }
      //Impre el tipo de cifrada y un salto de linea antees de pasar a la siguiente red
      Serial.printf("  Cifrado: %s\n", encType.c_str());
      Serial.println();
    }
  }

  Serial.println("-------------------------------------------");
  Serial.println("Fin del escaneo.\n");

  delay(10000); // escanear cada 10 segundos
}
