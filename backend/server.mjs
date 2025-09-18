import { createServer } from 'http';
import { Server } from 'socket.io';
import mqtt from 'mqtt';
import express from 'express';
import fetch from 'node-fetch';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

// Asumo que estos módulos existen en tu proyecto
import { arduino, processMessage } from './arduino.mjs';
import { registerSocketHandlers } from './socket.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuración MQTT
const MQTT_BROKER = 'mqtt://localhost';
const MQTT_TOPIC_IN = 'semaforo/control';
const MQTT_TOPIC_OUT = 'semaforo/estado';
const MQTT_TOPIC_STATUS = 'bridge/status';

// Inicializar Express
const app = express();
app.use(express.text({ type: '*/*' })); // Para recibir SDP
app.use(express.static(path.join(__dirname, '../frontend'))); // Servir archivos estáticos

// Servidor HTTP
const server = createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: { origin: '*' }
});

// Conexión MQTT
const mqttClient = mqtt.connect(MQTT_BROKER);
mqttClient.on('connect', () => {
  console.log('Backend conectado a MQTT');
  mqttClient.subscribe([MQTT_TOPIC_OUT, MQTT_TOPIC_STATUS]);
});

mqttClient.on('message', (topic, message) => {
  const msg = message.toString();
  console.log(`MQTT recibido en ${topic}: ${msg}`);
  if (topic === MQTT_TOPIC_OUT) {
    processMessage(msg, (cmd) => mqttClient.publish(MQTT_TOPIC_IN, cmd));
  } else if (topic === MQTT_TOPIC_STATUS) {
    io.emit('bridge-status', msg);
  }
});

// Registrar handlers de Socket.IO
registerSocketHandlers(io, mqttClient);

// Ruta para servir index.html
app.get('/', async (req, res) => {
  const html = await readFile(path.join(__dirname, '../frontend/index.html'), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

// Ruta para servir style.css
app.get('/assets/style.css', async (req, res) => {
  const css = await readFile(path.join(__dirname, '../frontend/assets/style.css'), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/css' });
  res.end(css);
});
//-----------------------------------------------------------------------------------------------
// Ruta para proxy WebRTC (WHEP), ACA ESTÁ LO NUEVO
app.post('/whep', async (req, res) => {
  try {
    const offerSDP = req.body;
    console.log('Offer SDP recibido del navegador:\n', offerSDP.slice(0, 200));

    const mediamtx = await fetch('http://127.0.0.1:8889/players/mystream/whep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: offerSDP,
    });

    const answerSDP = await mediamtx.text();
    console.log('Answer SDP recibido de MediaMTX:\n', answerSDP.slice(0, 200));

    res.set('Content-Type', 'application/sdp');
    res.send(answerSDP);
  } catch (err) {
    console.error('Error en /whep:', err);
    res.status(500).send('Error al comunicar con MediaMTX');
  }
});
//-----------------------------------------------------------------------------------------------

// Iniciar servidor
server.listen(3000, () => {
  console.log('Servidor SCADA + WebRTC en http://localhost:3000');
});
