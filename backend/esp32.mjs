// backend/esp32.mjs
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import fs from "fs";
import { agregarRedUnica } from "./wifi-counter.mjs"; // usamos tu contador existente

export let portESP = null;
const WIFI_FILE = "./data/wifi_networks.json";
let wifiNetworks = [];

// ==========================
// Cargar redes guardadas
// ==========================
function loadSavedNetworks() {
  try {
    if (fs.existsSync(WIFI_FILE)) {
      const data = fs.readFileSync(WIFI_FILE, "utf8");
      wifiNetworks = JSON.parse(data);
      console.log(`📡 Redes WiFi cargadas (${wifiNetworks.length})`);
    }
  } catch (err) {
    console.error("⚠️ Error cargando redes guardadas:", err.message);
  }
}

// ==========================
// Guardar redes
// ==========================
function saveNetworks() {
  try {
    fs.writeFileSync(WIFI_FILE, JSON.stringify(wifiNetworks, null, 2));
  } catch (err) {
    console.error("⚠️ Error guardando redes WiFi:", err.message);
  }
}

// ==========================
// Inicializar conexión ESP32
// ==========================
export function initESP32(io) {
  const ESP32_PORT = process.env.ESP32_PORT || "COM17";
  const ESP32_BAUDRATE = parseInt(process.env.ESP32_BAUDRATE || "115200", 10);

  loadSavedNetworks();

  try {
    portESP = new SerialPort({ path: ESP32_PORT, baudRate: ESP32_BAUDRATE });
    const parser = portESP.pipe(new ReadlineParser({ delimiter: "\n" }));

    portESP.on("open", () => console.log(`✅ ESP32 conectado en ${ESP32_PORT}`));
    portESP.on("error", (err) => console.error("❌ Error ESP32:", err.message));

    let current = {}; // guarda temporal de una red

    parser.on("data", (line) => {
      const msg = line.trim();
      console.log("📡 [ESP32]:", msg);

      io.emit("esp32-data", msg); // sigue enviando línea a front

      // Armar estructura de red
      if (msg.startsWith("Red #")) {
        current = {}; // reinicia bloque
      } else if (msg.startsWith("SSID:")) {
        current.ssid = msg.substring(5).trim();
      } else if (msg.startsWith("BSSID:")) {
        current.bssid = msg.substring(6).trim().toUpperCase();
      } else if (msg.startsWith("Canal:")) {
        current.canal = msg.substring(6).trim();
      } else if (msg.startsWith("RSSI:")) {
        current.rssi = msg.replace("RSSI:", "").replace("dBm", "").trim();
      } else if (msg.startsWith("Cifrado:")) {
        current.cifrado = msg.substring(8).trim();
      } else if (msg === "Fin del escaneo.") {
        // al final del escaneo, guardamos si hay red válida
        if (current.bssid) {
          const exists = wifiNetworks.some((n) => n.bssid === current.bssid);
          if (!exists) {
            agregarRedUnica(current.bssid); // mantiene contador
            current.timestamp = new Date().toISOString();
            wifiNetworks.push(current);
            saveNetworks();
            console.log(`💾 Nueva red guardada: ${current.ssid} (${current.bssid})`);
          }
        }
        current = {}; // reseteamos para el siguiente escaneo
      }
    });

    // ==========================
    // Comunicación con frontend
    // ==========================
    io.on("connection", (socket) => {
      console.log("Cliente conectado al módulo ESP32");

      // Enviar redes guardadas al conectarse
      socket.emit("wifi-networks", wifiNetworks);

      socket.on("esp32-command", (cmd) => {
        if (portESP && portESP.writable) {
          portESP.write(cmd + "\n", (err) => {
            if (err) console.error("❌ Error enviando al ESP32:", err.message);
            else console.log("➡️ Comando enviado al ESP32:", cmd);
          });
        } else {
          console.warn("⚠️ ESP32 no disponible para escribir.");
        }
      });
    });

  } catch (err) {
    console.error("⚠️ No se pudo abrir el puerto del ESP32:", err.message);
  }
}
