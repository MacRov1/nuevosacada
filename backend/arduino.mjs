/*import { SerialPort } from 'serialport'; //Clase principal para abrir y manejar el puerto serial (En este caso el COM2)
import { ReadlineParser } from '@serialport/parser-readline'; //Permite leer los datos linea por linea

const serialPort = new SerialPort({
  path: 'COM2', // COM2 es el puerto COM asignado al SimulIDE 
  baudRate: 9600, // Velocidad de trasmisión de datos (En baudios), debe ser igual que en el scketch de Arduino
});

const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' })); //Crea un parser que divide el flujo de datos del puerto serial en lineas completas.

let currentState = 'E0'; // Estado inicial asumiendo E0 (rojo)
let messageCallback = null; // Función que se ejecuta cuando llega el mensaje
let isMaintenance = false; // Bandera para modo mantenimiento

export const arduino = {
  turnOn: () => { //Envía "activar\n" al Arduino (enciende el semaforo)
    serialPort.write('activar\n'); // Cambiado a "activar" para alinear con tu Arduino
    console.log('Comando enviado: activar');
  },
  turnOff: () => { //Envía "apagar\n" al Arduino (entra en mantenimiento)
    serialPort.write('apagar\n'); // Cambiado a "apagar" para alinear con tu Arduino
    console.log('Comando enviado: apagar');
  },
  sendCommand: (command) => { //Envia cualquier texto como comando
    serialPort.write(`${command}\n`);
    console.log(`Comando enviado: ${command}`);
  },
  getState: () => { //Devuelve el estado actual guardado (por ejemplo "E0", "E1", "E2" o "Mantenimiento")
    return currentState;
  },
  updateState: (newState) => { //Cambia manualmente el estado guardado
    currentState = newState;
  },
  onMessageCallback: (callback) => { //Registra una función que se ejecuta cuando llega un nuevo mensaje del Arduino
    messageCallback = callback;
  },
  isMaintenanceMode: () => { //Devuelve si está en modo mantemimiento o no
    return isMaintenance;
  },
};

// Cada vez que el Arduino envía un mensaje (con Serial.println()), esta funcion se ejecuta
parser.on('data', (data) => {
  data = data.trim();
  console.log('Datos recibidos de SimulIDE/Arduino:', data);

  // Si alguien registró una funcion de escucha (onMessageCallback), se ejecuta con el mensaje.
  if (messageCallback) {
    messageCallback(data);
  }
//--------------------------------------------------------------------------------------------------------------
  /*En este bloque, si el mensaje comienza con "Estado ", extra el estado (E0, E1, E2). 
    Si contiene "Mantemimiento", cambia al estado "Mantemimineto" y activa la bandera.
    Si contiene "Semaforo Funcionando", vuelve a estado "E0" y desactiva manteminiento
  */
  /*let newState = null;
  if (data.startsWith('Estado ')) {
    newState = data.substring(7).trim(); // Extrae "E0", "E1", "E2"
  } else if (data.includes('Mantenimiento')) {
    newState = 'Mantenimiento';
    isMaintenance = true; // Activar modo mantenimiento
  } else if (data.includes('Semaforo Funcionando')) {
    newState = 'E0'; // Reinicia en E0 al activar
    isMaintenance = false; // Desactivar modo mantenimiento
  }
//----------------------------------------------------------------------------------------------------------------
  //Si el nuevo estado es diferente al anterior, lo guarda y notifica nuevamente al callback.
if (newState && newState !== currentState) {
    currentState = newState;
    console.log('Estado actualizado:', currentState);
    if (messageCallback) {
      messageCallback(`Estado ${currentState}`); // Enviar estado formateado
    }
  }
});
//-----------------------------------------------------------------------------------------------------------------
// Confirma que la conexion serial fue exitosa
serialPort.on('open', () => {
  console.log(`Puerto serial ${serialPort.path} abierto correctamente`);
});
//--------------------------------------------------------------------------------------------------------------------
// Muestra errores si no se puede abrir el puerto o hay fallos de comunicacion
serialPort.on('error', (err) => {
  console.error('Error en el puerto serial:', err.message);
});
*/
//--------------------------------------------------------------------------------------------------------------------------------------



//---------------------------------------------------- NUEVO --------------------------------------------------------
// import { SerialPort } from 'serialport';
// import { ReadlineParser } from '@serialport/parser-readline';

// // Serial deshabilitado; ahora manejado por mqtt-bridge
// const serialPort = new SerialPort({
//   path: 'COM2',
//   baudRate: 9600,
// });
// const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

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

/* Código serial original (deshabilitado)
// parser.on('data', (data) => {
//   data = data.trim();
//   console.log('Datos recibidos de SimulIDE/Arduino:', data);

//   if (messageCallback) {
//     messageCallback(data);
//   }

//   let newState = null;
//   if (data.startsWith('Estado ')) {
//     newState = data.substring(7).trim();
//   } else if (data.includes('Mantenimiento')) {
//     newState = 'Mantenimiento';
//     isMaintenance = true;
//   } else if (data.includes('Semaforo Funcionando')) {
//     newState = 'E0';
//     isMaintenance = false;
//   }

//   if (newState && newState !== currentState) {
//     currentState = newState;
//     console.log('Estado actualizado:', currentState);
//     if (messageCallback) {
//       messageCallback(`Estado ${currentState}`);
//     }
//   }
// });

// serialPort.on('open', () => {
//   console.log(`Puerto serial ${serialPort.path} abierto correctamente`);
// });

// serialPort.on('error', (err) => {
//   console.error('Error en el puerto serial:', err.message);
// });
*/