import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import mqtt from 'mqtt';

// Configuración (local)
const SERIAL_PORT = 'COM2'; // Cambia a tu puerto virtual de SimulIDE 
const SERIAL_BAUDRATE = 9600; // Ajusta si tu Arduino usa otro
const MQTT_BROKER = 'mqtt://localhost'; // Broker local (Mosquitto)
const MQTT_TOPIC_IN = 'semaforo/control'; // Comandos al MCU
const MQTT_TOPIC_OUT = 'semaforo/estado'; // Estados del MCU
const MQTT_TOPIC_STATUS = 'bridge/status'; // Estado del bridge

let lastMessageTime = null;
let isConnected = false;

// Conexión serial
const port = new SerialPort({ path: SERIAL_PORT, baudRate: SERIAL_BAUDRATE });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

port.on('open', () => console.log('Conectado a serial'));
port.on('error', (err) => console.error('Error serial:', err));

// Conexión MQTT
const client = mqtt.connect(MQTT_BROKER);

client.on('connect', () => {
  console.log('Conectado a MQTT');
  isConnected = true;
  client.subscribe(MQTT_TOPIC_IN, (err) => {
    if (!err) console.log(`Suscrito a ${MQTT_TOPIC_IN}`);
  });
  publishStatus();
});

client.on('error', (err) => {
  console.error('Error MQTT:', err);
  isConnected = false;
  publishStatus();
});

// MQTT → Serial
client.on('message', (topic, message) => {
  if (topic === MQTT_TOPIC_IN) {
    const msg = message.toString();
    console.log(`MQTT recibido: ${msg}`);
    port.write(msg + '\n');
    lastMessageTime = new Date().toISOString();
    publishStatus();
  }
});

// Serial → MQTT
parser.on('data', (data) => {
  const trimmed = data.trim();
  console.log(`Serial recibido: ${trimmed}`);
  client.publish(MQTT_TOPIC_OUT, trimmed);
  lastMessageTime = new Date().toISOString();
  publishStatus();
});

// Publicar estado del bridge
function publishStatus() {
  const status = JSON.stringify({
    connected: isConnected,
    lastMessage: lastMessageTime || 'Ninguno',
  });
  client.publish(MQTT_TOPIC_STATUS, status);
  console.log('Estado publicado:', status);
}

setInterval(publishStatus, 5000); // Cada 5 segundos