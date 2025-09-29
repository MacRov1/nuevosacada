/*import { arduino } from "./arduino.mjs"; // Este es el módulo que se encarga de la comunicación con el arduino (ahora vía MQTT).


export function registerSocketHandlers(io, mqttClient) {
  // Reenviar mensajes de Arduino (ahora de MQTT) a todos los clientes
  arduino.onMessageCallback((msg) => {
    io.emit("led-status", arduino.getState()); // Mantenido para compatibilidad con LED
    io.emit("arduino-message", msg); // Mostrar mensaje textual en el log

   
    let newState = null;
    if (msg.startsWith('Estado ')) {
      newState = msg.substring(7).trim(); // Extrae "E0", "E1", "E2", "Mantenimiento"
    } else if (msg.includes('E0')) {
      newState = 'E0';
    } else if (msg.includes('E1')) {
      newState = 'E1';
    } else if (msg.includes('E2')) {
      newState = 'E2';
    } else if (msg.includes('Mantenimiento')) {
      newState = 'Mantenimiento';
    }

    if (newState && newState !== arduino.getState()) {
      arduino.updateState(newState);
      io.emit('semaforo-status', newState); // Emitir estado del semáforo
    }
  });

 
  io.on("connection", (socket) => {
    console.log("🔌 Cliente conectado");

   
    socket.emit("led-status", arduino.getState());
    socket.emit("semaforo-status", arduino.getState());

    // Manejar comandos del LED (mantenido por compatibilidad)
    socket.on("led-on", () => arduino.turnOn((cmd) => mqttClient.publish('semaforo/control', cmd)));
    socket.on("led-off", () => arduino.turnOff((cmd) => mqttClient.publish('semaforo/control', cmd)));

    // Manejar comandos del semáforo
    socket.on("activar", () => arduino.sendCommand((cmd) => mqttClient.publish('semaforo/control', cmd), "activar"));
    socket.on("apagar", () => arduino.sendCommand((cmd) => mqttClient.publish('semaforo/control', cmd), "apagar"));

    socket.on("disconnect", () => console.log("❌ Cliente desconectado"));
  });
}
*/


import { arduino } from "./arduino.mjs"; // Este es el módulo que se encarga de la comunicación con el arduino (ahora vía MQTT).

/* Esta es la función principal que maneja todas las interacciones con los clientes conectados a través de WebSockets.
Recibe como parámetros el objeto "io" (instancia de Socket.IO) y mqttClient (para publicar comandos a MQTT).
*/
export function registerSocketHandlers(io, mqttClient) {
  // Reenviar mensajes de Arduino (ahora de MQTT) a todos los clientes
  arduino.onMessageCallback((msg) => {
    io.emit("led-status", arduino.getState()); // Mantenido para compatibilidad con LED
    io.emit("arduino-message", msg); // Mostrar mensaje textual en el log

    /* El msg recibido se analiza para determinar el estado del semáforo (por ejemplo, E0, E1, E2, Mantenimiento).
    Si el estado del semáforo ha cambiado, se actualiza en el módulo arduino (mediante arduino.updateState(newState))
    Luego, se emite el nuevo estado a todos los clientes con el evento semaforo-status, lo que permite que el frontend actualice el estado visualmente en tiempo real.
    */
    let newState = null;
    if (msg.startsWith('Estado ')) {
      newState = msg.substring(7).trim(); // Extrae "E0", "E1", "E2", "Mantenimiento"
    } else if (msg.includes('E0')) {
      newState = 'E0';
    } else if (msg.includes('E1')) {
      newState = 'E1';
    } else if (msg.includes('E2')) {
      newState = 'E2';
    } else if (msg.includes('Mantenimiento')) {
      newState = 'Mantenimiento';
    }

    if (newState && newState !== arduino.getState()) {
      arduino.updateState(newState);
      io.emit('semaforo-status', newState); // Emitir estado del semáforo
    }
  });

  /* io.on("connection") se ejecuta cada vez que un cliente se conecta al servidor mediante WebSocket, esta función es ejecutada.
  socket es el objeto que representa la conexión individual del cliente. Se puede usar para enviar y recibir mensajes solo entre ese cliente y servidor.
  */
  io.on("connection", (socket) => {
    console.log("🔌 Cliente conectado");

    // Nueva parte: Verificar y enviar información del usuario
    const user = socket.handshake.session?.passport?.user;
    if (user) {
      console.log("Datos del Usuario:", user);
      socket.emit("user-info", {
        name: user.name || user.email || user.sub,
        email: user.email,
        sub: user.sub,
      });
    } else {
      console.log("Usuario no logueado");
      socket.emit("user-info", null);
    }

    socket.emit("led-status", arduino.getState());
    socket.emit("semaforo-status", arduino.getState());

    // Manejar comandos del LED (mantenido por compatibilidad)
    socket.on("led-on", () => arduino.turnOn((cmd) => mqttClient.publish('semaforo/control', cmd)));
    socket.on("led-off", () => arduino.turnOff((cmd) => mqttClient.publish('semaforo/control', cmd)));

    // Manejar comandos del semáforo
    socket.on("activar", () => arduino.sendCommand((cmd) => mqttClient.publish('semaforo/control', cmd), "activar"));
    socket.on("apagar", () => arduino.sendCommand((cmd) => mqttClient.publish('semaforo/control', cmd), "apagar"));

    socket.on("disconnect", () => console.log("❌ Cliente desconectado"));
  });
}