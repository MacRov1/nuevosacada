import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import mqtt from 'mqtt';

// Configuración (local)
const SERIAL_PORT = 'COM2'; // Puerto virtual de SimulIDE o hardware real
const SERIAL_BAUDRATE = 9600; // Ajustar según tu Arduino
const MQTT_BROKER = 'mqtt://localhost'; // Broker local (Mosquitto)
const MQTT_TOPIC_IN = 'semaforo/control'; // Comandos al MCU
const MQTT_TOPIC_OUT = 'semaforo/estado'; // Estados del MCU
const MQTT_TOPIC_STATUS = 'bridge/status'; // Estado del bridge

const MQTT_TOPIC_LCD = 'semaforo1/lcd'; // Tópico para LCD
const MQTT_TOPIC_WS = 'semaforo1/ws';   // Nuevo tópico para LEDs WS2812

let lastMessageTime = null;
let isConnected = false;

// ---------------------------------------------------------------------------
// Conexión Serial
const port = new SerialPort({ path: SERIAL_PORT, baudRate: SERIAL_BAUDRATE });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

port.on('open', () => console.log('✅ Conectado al puerto serial'));
port.on('error', (err) => console.error('❌ Error serial:', err));

// ---------------------------------------------------------------------------
// Conexión MQTT
const client = mqtt.connect(MQTT_BROKER);

client.on('connect', () => {
  console.log('✅ Conectado a MQTT');
  isConnected = true;

  //Suscribirse a todos los tópicos necesarios
  client.subscribe([MQTT_TOPIC_IN, MQTT_TOPIC_LCD, MQTT_TOPIC_WS], (err) => {
    if (!err) {
      console.log(`Suscrito a: ${MQTT_TOPIC_IN}, ${MQTT_TOPIC_LCD} y ${MQTT_TOPIC_WS}`);
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

  lastMessageTime = new Date().toISOString();
  publishStatus();
});

// ---------------------------------------------------------------------------
// Serial → MQTT
parser.on('data', (data) => {
  const trimmed = data.trim();
  console.log(`Serial recibido: ${trimmed}`);
  client.publish(MQTT_TOPIC_OUT, trimmed);
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
