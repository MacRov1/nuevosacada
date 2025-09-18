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

    /* Al conectarse, el servidor envía al cliente el estado actual del LED y el semáforo.
     socket.emit(..) se usa para enviar datos a un cliente específico */
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











//---------------------------------------------------------------------------------------------------------------------------
/*---------------------------------------------- ANTES SIN MQTT --------------------------------------------------------------
import { arduino } from "./arduino.mjs"; //Este es el modulo que se encarga de la comunicacion con el arduino.

/*Esta es la funcion principal que se maneja todas las interacciones con los clientes conectados a traves de WebSockets.
Recibe como parametros el obketo "io" (instancia de Socket.IO) que nos permite enviar y recibir mensajes entre el servidor y el frontend.

export function registerSocketHandlers(io) {
  // Reenviar mensajes de Arduino a todos los clientes
  arduino.onMessageCallback((msg) => {
    io.emit("led-status", arduino.getState()); // Mantenido para compatibilidad con LED
    io.emit("arduino-message", msg); // Mostrar mensaje textual en el log

    /* El msg recibido se analiza para determinar el estado del semaforo (por ejemplo, E0, E1, E2, Mantenimiento).
    Si el estado del semaforo ha cambiado, se actualiza en el módulo arduino (mediante arduino.updateState(newState))
    Luego, se emite el nuevo estado a todos los clientes con el evento semaforo-status, lo que permite queel frontend actualice el estado visualmente en tiempo real.
     
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
  */
  /*io.on("connection") se ejecuta cada vez que un cliente se conecta al servidor mediante WebSocket, esta funcion es ejecutada.
  socket es el objeto que representa la conexion individual del cliente. Se puede usar para enviar y recibir mensajes solo entre ese cliente y servidor.
  
  io.on("connection", (socket) => {
    console.log("🔌 Cliente conectado");

    Al conectarse, el servidor envia al cliente el estado actual del LED y el semáforo.
     socket.emit(..) se usa para enviar datos a un cliente especifico*/
  /*  socket.emit("led-status", arduino.getState());
    socket.emit("semaforo-status", arduino.getState());

    // Manejar comandos del LED (mantenido por compatibilidad)
    socket.on("led-on", () => arduino.turnOn());
    socket.on("led-off", () => arduino.turnOff());

    // Manejar comandos del semáforo
    socket.on("activar", () => arduino.sendCommand("activar"));
    socket.on("apagar", () => arduino.sendCommand("apagar"));

    socket.on("disconnect", () => console.log("❌ Cliente desconectado"));
  });
}
*/