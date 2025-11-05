import { arduino } from "./arduino.mjs";

export function registerSocketHandlers(io, mqttClient) {
  // Reenviar mensajes de Arduino (ahora de MQTT) a todos los clientes
  arduino.onMessageCallback((msg) => {
    io.emit("led-status", arduino.getState()); // Mantenido para compatibilidad con LED
    io.emit("arduino-message", msg); // Mostrar mensaje textual en el log

    let newState = null;
    if (msg.startsWith("Estado ")) {
      newState = msg.substring(7).trim(); // Extrae "E0", "E1", "E2", "Mantenimiento"
    } else if (msg.includes("E0")) {
      newState = "E0";
    } else if (msg.includes("E1")) {
      newState = "E1";
    } else if (msg.includes("E2")) {
      newState = "E2";
    } else if (msg.includes("Mantenimiento")) {
      newState = "Mantenimiento";
    }
    //**********************************************************************************************
    //ULTIMA ACTIVIDAD MOTOR DC
    // Motor DC: si llega un estado, reenviarlo a los clientes
    if (msg.startsWith("motor-status:")) {
      // Formato: motor-status:on,cw,128
      const payload = msg.substring(13).trim();
      io.emit("motor-status", payload);
    }
    //**********************************************************************************************

    if (newState && newState !== arduino.getState()) {
      arduino.updateState(newState);
      io.emit("semaforo-status", newState); // Emitir estado del semáforo
    }
  });

  io.on("connection", (socket) => {
    console.log("🔌 Cliente conectado");

    socket.emit("led-status", arduino.getState());
    socket.emit("semaforo-status", arduino.getState());

    // LED (compatibilidad)
    socket.on("led-on", () =>
      arduino.turnOn((cmd) => mqttClient.publish(process.env.MQTT_TOPIC_IN, cmd))
    );
    socket.on("led-off", () =>
      arduino.turnOff((cmd) => mqttClient.publish(process.env.MQTT_TOPIC_IN, cmd))
    );

    // Semáforo
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

    // LCD
    socket.on("lcd-message", (data) => {
      const { topic, payload } = data;
      mqttClient.publish(topic, payload, (err) => {
        if (err) {
          socket.emit("lcd-response", "Error al enviar mensaje");
        } else {
          socket.emit("lcd-response", "Mensaje enviado correctamente");
        }
      });
    });

    // WS2812
    socket.on("ws-message", (data) => {
      const { topic, payload } = data;
      mqttClient.publish(topic, payload, (err) => {
        if (err) {
          socket.emit("ws-response", "Error al enviar mensaje");
        } else {
          socket.emit("ws-response", "Mensaje enviado correctamente");
        }
      });
    });

    //**********************************************************************************************
    //ULTIMA ACTIVIDAD MOTOR DC
    // Motor DC
    // Publica comandos hacia el MCU mediante el tópico de control general
    // Espera payloads como: "motor:on", "motor:off", "motor:dir:cw", "motor:speed:120", "motor:set:on,cw,180"
    socket.on("motor-command", (payload) => {
      const cmd = typeof payload === 'string' ? payload : String(payload || '');
      if (!cmd.startsWith('motor:')) return;
      mqttClient.publish(process.env.MQTT_TOPIC_IN, cmd);
    });
    //******************************************************************************
    
    //******************************************************************************
    // NUEVO SEMANA 12 */
    // Umbrales
    socket.on("umbral-message", (data) => {
      const { topic, payload } = data;

      mqttClient.publish(topic, payload, { qos: 0, retain: false }, (err) => {
        if (err) socket.emit("umbral-response", "Error al enviar umbral");
        else socket.emit("umbral-response", "Umbral enviado correctamente");
      });
    });
    //****************************************************************************************** */

    socket.on("disconnect", () => console.log("❌ Cliente desconectado"));
  });
}