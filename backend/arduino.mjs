let currentState = 'E0'; // Estado inicial (rojo)
let messageCallback = null;
let isMaintenance = false;

// Mantener la lógica de comandos y estados para compatibilidad con MQTT
export const arduino = {
  turnOn: (publish) => {
    // Enviar a MQTT en lugar de serial
    publish('activar');
    console.log('Comando enviado a MQTT: activar');
  },
  turnOff: (publish) => {
    // Enviar a MQTT
    publish('apagar');
    console.log('Comando enviado a MQTT: apagar');
  },
  sendCommand: (publish, command) => {
    // Enviar cualquier comando a MQTT
    publish(command);
    console.log(`Comando enviado a MQTT: ${command}`);
  },
  getState: () => {
    return currentState;
  },
  updateState: (newState) => {
    currentState = newState;
  },
  onMessageCallback: (callback) => {
    messageCallback = callback;
  },
  isMaintenanceMode: () => {
    return isMaintenance;
  },
};

// Procesar mensajes recibidos (ahora desde MQTT, no serial)
export function processMessage(data, publishCallback) {
  data = data.trim();
  console.log('Datos recibidos:', data);

  if (messageCallback) {
    messageCallback(data);
  }

  let newState = null;
  if (data.startsWith('Estado ')) {
    newState = data.substring(7).trim(); // Extrae "E0", "E1", "E2"
  } else if (data.includes('Mantenimiento')) {
    newState = 'Mantenimiento';
    isMaintenance = true;
  } else if (data.includes('Semaforo Funcionando')) {
    newState = 'E0';
    isMaintenance = false;
  }

  if (newState && newState !== currentState) {
    currentState = newState;
    console.log('Estado actualizado:', currentState);
    if (messageCallback) {
      messageCallback(`Estado ${currentState}`);
    }
  }
}
