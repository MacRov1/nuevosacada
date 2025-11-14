#include <WiFi.h> //Permite usar funciones de la red.
#include "BluetoothSerial.h" //Activa el Bluetooth

BluetoothSerial BT; //BT es el objeto que maneja la comunicacion Bluethooth
unsigned long ultimoScan = 0;  // para controlar el intervalo del escaneo
const unsigned long intervaloScan = 40000; // cada 40 segundos 

// ---------------------------------------------------------------------------
// FUNCION: escanearWiFi()
// Realiza un escaneo de redes Wi-Fi y muestra los resultados por Serial y Bluetooth
// ---------------------------------------------------------------------------
void escanearWiFi() {
  Serial.println("\nIniciando escaneo...");
  BT.println("\nIniciando escaneo...");

  int n = WiFi.scanNetworks(); //Devuelve cuantas encontró (n)
  Serial.println("-------------------------------------------");
  BT.println("-------------------------------------------");

  //Si no hay redes, muestra un comentario, si hay, muestra cuantas y recorre todas con un for
  if (n == 0) {
    Serial.println("No se encontraron redes.");
    BT.println("No se encontraron redes.");
  } else {
    Serial.printf("Se encontraron %d redes:\n\n", n);
    BT.printf("Se encontraron %d redes:\n\n", n);

    for (int i = 0; i < n; ++i) {
      String ssid = WiFi.SSID(i); //Nombre de la red
      int32_t rssi = WiFi.RSSI(i); //Potencia de señal (en dBm)
      int32_t channel = WiFi.channel(i); //Canal WiFi
      String bssid = WiFi.BSSIDstr(i); //Direccion MAC del router
      wifi_auth_mode_t authmode = WiFi.encryptionType(i); //Tipo de seguridad

      //Luego imprime todo eso tanto por Serial como por Bluetooth, linea por linea
      Serial.printf("Red #%d\n", i + 1);
      BT.printf("Red #%d\n", i + 1);

      Serial.printf("SSID: %s\n", ssid.c_str());
      BT.printf("SSID: %s\n", ssid.c_str());

      Serial.printf("BSSID: %s\n", bssid.c_str());
      BT.printf("BSSID: %s\n", bssid.c_str());

      Serial.printf("Canal: %d\n", channel);
      BT.printf("Canal: %d\n", channel);

      Serial.printf("RSSI: %d\n", rssi);
      BT.printf("RSSI: %d\n", rssi);

      Serial.print("Cifrado: ");
      BT.print("Cifrado: ");
      switch (authmode) {
        case WIFI_AUTH_OPEN: Serial.println("Abierta"); BT.println("Abierta"); break;
        case WIFI_AUTH_WEP: Serial.println("WEP"); BT.println("WEP"); break;
        case WIFI_AUTH_WPA_PSK: Serial.println("WPA"); BT.println("WPA"); break;
        case WIFI_AUTH_WPA2_PSK: Serial.println("WPA2"); BT.println("WPA2"); break;
        case WIFI_AUTH_WPA_WPA2_PSK: Serial.println("WPA+WPA2"); BT.println("WPA+WPA2"); break;
        case WIFI_AUTH_WPA2_ENTERPRISE: Serial.println("WPA2-Enterprise"); BT.println("WPA2-Enterprise"); break;
        default: Serial.println("Desconocido"); BT.println("Desconocido");
      }
      Serial.println();
      BT.println();
    }
  }

  Serial.println("-------------------------------------------");
  BT.println("-------------------------------------------");
  Serial.println("Fin del escaneo.\n");
  BT.println("Fin del escaneo.\n");
}

// ---------------------------------------------------------------------------
// SETUP: Se ejecuta una vez al iniciar el ESP32
// ---------------------------------------------------------------------------
void setup() {
  //Inicializa el puerto serial por USB para ver los mensajes en el monitor serie
  Serial.begin(115200);
  delay(1000);
  Serial.println("----- Escaneo de redes WiFI -----");

  if (!BT.begin("ESP32_BT_LOG")) { //Inicia el Bluetooth con ese nombre visible.
    Serial.println("Error iniciando Bluetooth SPP"); //Si falla muestra error
  } else {
    //Sino falla, muestra estos mensajes y en el celu muestra "ESP32_BT_LOG" en la lista de Bluethooth
    Serial.println("Bluetooth iniciado correctamente"); 
    Serial.println("Nombre del dispositivo: ESP32_BT_LOG");
    Serial.println("Podés conectar con 'Serial Bluetooth Terminal'");
  }

  WiFi.mode(WIFI_STA); //El ESP32 actua como cliente
  WiFi.disconnect(); //asegura que no este conectado a ninguna red antes de escanear
  delay(100);
}

// ---------------------------------------------------------------------------
// LOOP: Se ejecuta en bucle mientras el ESP32 está encendido
// ---------------------------------------------------------------------------
void loop() {
  // Leer comandos por Bluetooth 
  if (BT.available()) {
    String comando = BT.readStringUntil('\n'); //Lee hasta que encunetra un salto de linea, lo que envia la app cuando se aprieta enter
    comando.trim(); //Quita espacios o saltos

    Serial.print("Comando recibido: ");
    Serial.println(comando);

    if (comando.equalsIgnoreCase("hola")) { //Si el mensaje es "hola" (sin importar minusculas o mayusculas)
      BT.println("¡Hola desde el ESP32!"); //Muestra por consola ¡Hola desde el ESP32!
      Serial.println("Respondí al comando 'hola'.");
    } 
    else if (comando.equalsIgnoreCase("scan")) { //Nuevo comando para escaneo manual
      BT.println("Ejecutando escaneo manual...");
      Serial.println("Comando 'scan' recibido. Ejecutando escaneo manual...");
      escanearWiFi(); //Llama a la función que realiza el escaneo
    } 
    else {
      BT.println("Comando no reconocido. (Usa: hola o scan)"); //Si se envia otra cosa que no sea hola o scan
    }
  }

  //Escanear WiFi cada cierto tiempo
  if (millis() - ultimoScan >= intervaloScan) { //Comprueba si ya pasaron 20 segundos desde el ultimo escaneo
    ultimoScan = millis(); //Si es si, actualiza ultimoScan con el tiempo actual
    escanearWiFi(); //Llama a la función para hacer el escaneo automático
  }

  delay(10);  //Evita que el micro use el 100% de CPU si no tiene nada que hacer
}
