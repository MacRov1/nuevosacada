import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('../.env') });

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import mqtt from 'mqtt';

// Configuración desde variables de entorno
const SERIAL_PORT = process.env.SERIAL_PORT;
const SERIAL_BAUDRATE = parseInt(process.env.SERIAL_BAUDRATE, 10);
const MQTT_BROKER = process.env.MQTT_BROKER;
const MQTT_TOPIC_IN = process.env.MQTT_TOPIC_IN;
const MQTT_TOPIC_OUT = process.env.MQTT_TOPIC_OUT;
const MQTT_TOPIC_STATUS = process.env.MQTT_TOPIC_STATUS;
const MQTT_TOPIC_LCD = process.env.MQTT_TOPIC_LCD;
const MQTT_TOPIC_WS = process.env.MQTT_TOPIC_WS;
const MQTT_TOPIC_UMBRAL = process.env.MQTT_TOPIC_UMBRAL; // NUEVO SEMANA 12
const MQTT_TOPIC_UMBRAL_STATUS =  // NUEVO SEMANA 12
process.env.MQTT_TOPIC_UMBRAL_STATUS || `${MQTT_TOPIC_UMBRAL}/status`;  // NUEVO SEMANA 12

const MQTT_TOPIC_MOTOR = process.env.MQTT_TOPIC_MOTOR; //NUEVO SEMANA 14

let lastMessageTime = null;
let isConnected = false;

// ---------------------------------------------------------------------------
// Conexión Serial
const port = new SerialPort({ path: SERIAL_PORT, baudRate: SERIAL_BAUDRATE });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

port.on('open', () => console.log(`✅ Conectado al puerto serial ${SERIAL_PORT}`));
port.on('error', (err) => console.error('❌ Error serial:', err));

// ---------------------------------------------------------------------------
// Conexión MQTT
const client = mqtt.connect(MQTT_BROKER);

client.on('connect', () => {
  console.log(`✅ Conectado a MQTT (${MQTT_BROKER})`);
  isConnected = true;

  //Suscribirse a todos los tópicos necesarios 
   // NUEVO SEMANA 14 EL MQTT_TOPIC_MOTOR
  client.subscribe([MQTT_TOPIC_IN, MQTT_TOPIC_LCD, MQTT_TOPIC_WS, MQTT_TOPIC_UMBRAL, MQTT_TOPIC_MOTOR], (err) => {
  if (!err) {
    console.log(`Suscrito a: ${MQTT_TOPIC_IN}, ${MQTT_TOPIC_LCD}, ${MQTT_TOPIC_WS}, ${MQTT_TOPIC_UMBRAL}, ${MQTT_TOPIC_MOTOR}`);
  }
});
  publishStatus();
});

client.on('error', (err) => {
  console.error('❌ Error MQTT:', err);
  isConnected = false;
  publishStatus();
});

// ---------------------------------------------------------------------------
// MQTT → Serial
client.on('message', (topic, message) => {
  const msg = message.toString();

  if (topic === MQTT_TOPIC_IN) {
    console.log(`MQTT recibido (control): ${msg}`);
    port.write(msg + '\n');
  } 
  else if (topic === MQTT_TOPIC_LCD) {
    console.log(`MQTT recibido (LCD): ${msg}`);
    port.write('lcd:' + msg + '\n');
  } 
  else if (topic === MQTT_TOPIC_WS) { //Nuevo bloque WS2812
    console.log(`MQTT recibido (WS2812): ${msg}`);
    port.write('ws:' + msg + '\n'); // Prefijo para identificar en Arduino
  }

  //--------------------------------------------------------------------------------------
  else if (topic === MQTT_TOPIC_UMBRAL) {
  console.log(`MQTT recibido (Umbral): ${msg}`);
  port.write('umbral:' + msg + '\n'); // Prefijo para Arduino
  // --------------------------------------------------------------------------------
  }
 //******************************************************************************************* */
 //------------------------------------ NUEVO SEMANA 14 ----------------------------------------------
  else if (topic === MQTT_TOPIC_MOTOR) {
  console.log(`MQTT recibido (Motor): ${msg}`);
  port.write(msg + "\n");  // Se envía tal cual: motor:on, motor:off, motor:ho, motor:ah
  }
  //************************************************************************************************ */

  lastMessageTime = new Date().toISOString();
  publishStatus();
});


//----------------------------------------------------------------------------
//Nuevo bloque para detectar mensajes de umbrales de temperatura (Semana 12)
parser.on('data', (data) => {
  const trimmed = data.trim();
  console.log(`Serial recibido: ${trimmed}`);

  // Detectar si es mensaje de umbrales  // NUEVO SEMANA 12
   if (trimmed.startsWith("umbrales:")) {
    client.publish(MQTT_TOPIC_UMBRAL_STATUS, trimmed.substring(9), { retain: true });
  } else {
    client.publish(MQTT_TOPIC_OUT, trimmed);
  }

  lastMessageTime = new Date().toISOString();
  publishStatus();
});
// ---------------------------------------------------------------------------
// Publicar estado del bridge (cada 5 segundos)
function publishStatus() {
  const status = JSON.stringify({
    connected: isConnected,
    lastMessage: lastMessageTime || 'Ninguno',
  });
  client.publish(MQTT_TOPIC_STATUS, status);
  console.log('Estado publicado:', status);
}

setInterval(publishStatus, 5000); // Cada 5 segundos


