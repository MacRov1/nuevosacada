import { arduino } from "./arduino.mjs";
import { portESP } from "./esp32.mjs"; //Nuevo Semana 14
import { agregarRedUnica, getEstado } from "./wifi-counter.mjs"; //Nuevo Semana 14

export function registerSocketHandlers(io, mqttClient) {
  // ==============================================================
  // Reenviar mensajes desde Arduino al frontend
  // ==============================================================
  arduino.onMessageCallback((msg) => {
    io.emit("led-status", arduino.getState());
    io.emit("arduino-message", msg);

    let newState = null;

    // Detecta el estado actual del semáforo
    if (msg.startsWith("Estado ")) {
      newState = msg.substring(7).trim();
    } else if (msg.includes("E0")) {
      newState = "E0";
    } else if (msg.includes("E1")) {
      newState = "E1";
    } else if (msg.includes("E2")) {
      newState = "E2";
    } else if (msg.includes("Mantenimiento")) {
      newState = "Mantenimiento";
    }

    // ==============================================================
    // Motor DC
    // ==============================================================
    if (msg.startsWith("motor-status:")) {
      const payload = msg.substring(13).trim();
      io.emit("motor-status", payload);
    }

    // ==============================================================
    // Cambio de estado del semáforo
    // ==============================================================
    if (newState && newState !== arduino.getState()) {
      arduino.updateState(newState);
      io.emit("semaforo-status", newState);
    }
  });

  // ==============================================================
  // Manejo de eventos del frontend (Socket.IO)
  // ==============================================================
  io.on("connection", (socket) => {
    console.log("🔌 Cliente conectado");

    // Estado inicial
    socket.emit("led-status", arduino.getState());
    socket.emit("semaforo-status", arduino.getState());

    // ==============================================================
    // LED
    // ==============================================================
    socket.on("led-on", () =>
      arduino.turnOn((cmd) => mqttClient.publish(process.env.MQTT_TOPIC_IN, cmd))
    );

    socket.on("led-off", () =>
      arduino.turnOff((cmd) => mqttClient.publish(process.env.MQTT_TOPIC_IN, cmd))
    );

    // ==============================================================
    // Semáforo
    // ==============================================================
    socket.on("activar", () =>
      arduino.sendCommand(
        (cmd) => mqttClient.publish(process.env.MQTT_TOPIC_IN, cmd),
        "activar"
      )
    );

    socket.on("apagar", () =>
      arduino.sendCommand(
        (cmd) => mqttClient.publish(process.env.MQTT_TOPIC_IN, cmd),
        "apagar"
      )
    );

    // ==============================================================
    //LCD
    // ==============================================================
    socket.on("lcd-message", (data) => {
      const { topic, payload } = data;
      mqttClient.publish(topic, payload, (err) => {
        socket.emit("lcd-response", err ? "Error al enviar mensaje" : "Mensaje enviado correctamente");
      });
    });

    // ==============================================================
    // WS2812
    // ==============================================================
    socket.on("ws-message", (data) => {
      const { topic, payload } = data;
      mqttClient.publish(topic, payload, (err) => {
        socket.emit("ws-response", err ? "Error al enviar mensaje" : "Mensaje enviado correctamente");
      });
    });

    // ==============================================================
    // Motor DC
    // ==============================================================
    socket.on("motor-command", (payload) => {
      const cmd = typeof payload === "string" ? payload : String(payload || "");
      if (!cmd.startsWith("motor:")) return;
      mqttClient.publish(process.env.MQTT_TOPIC_MOTOR, cmd);
    });
    // ==============================================================
    // Umbrales
    // ==============================================================
    socket.on("umbral-message", (data) => {
      const { topic, payload } = data;
      mqttClient.publish(topic, payload, { qos: 0, retain: false }, (err) => {
        socket.emit("umbral-response", err ? "Error al enviar umbral" : "Umbral enviado correctamente");
      });
    });

    // *************************************************************************************************************
    //NUEVO SEMANA 14
    // ESP32 — recepción de comandos desde el frontend
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
    // Redes WiFi — guardado persistente
    socket.on("wifi-new", (net) => {
      if (!net || !net.bssid) return;

      const added = agregarRedUnica(net.bssid);
      if (added) {
        console.log(`🆕 Nueva red guardada: ${net.ssid || "(sin SSID)"} (${net.bssid})`);
      }

      // Enviar al frontend la lista actualizada
      const estado = getEstado();
      socket.emit("wifi-networks", Array.from(estado.macs).map(mac => ({ bssid: mac })));
    });

      // Enviar las redes guardadas al conectarse
      const estado = getEstado();
      const redesGuardadas = Array.from(estado.macs).map(mac => ({ bssid: mac }));
      socket.emit("wifi-networks", redesGuardadas);
    //****************************************************************************************** */
    // ==============================================================
    // 🔌 Desconexión
    // ==============================================================
    socket.on("disconnect", () => console.log("❌ Cliente desconectado"));
  });
}
