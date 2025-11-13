import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

export let portESP = null; // Exportamos el puerto para otros módulos

export function initESP32(io) {
  const ESP32_PORT = process.env.ESP32_PORT || "COM17";
  const ESP32_BAUDRATE = parseInt(process.env.ESP32_BAUDRATE || "115200", 10);

  try {
    portESP = new SerialPort({ path: ESP32_PORT, baudRate: ESP32_BAUDRATE });
    const parser = portESP.pipe(new ReadlineParser({ delimiter: "\n" }));

    portESP.on("open", () => console.log(`✅ ESP32 conectado en ${ESP32_PORT}`));
    portESP.on("error", (err) => console.error("❌ Error ESP32:", err.message));

    // Recibir datos del ESP32 y reenviar al frontend
    parser.on("data", (line) => {
      const msg = line.trim();
      console.log("📡 [ESP32]:", msg);
      io.emit("esp32-data", msg); // 🔥 Envía al frontend
    });

    // Escuchar comandos del frontend hacia el ESP32
    io.on("connection", (socket) => {
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
