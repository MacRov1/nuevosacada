import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mqtt from "mqtt";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import fetch from "node-fetch";
import { arduino, processMessage } from "./arduino.mjs";
import { registerSocketHandlers } from "./socket.mjs";
import dotenv from 'dotenv';

// ------------------- Configuración -------------------

// Para usar __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga variables de entorno desde la carpeta raíz
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('✅ Variables de entorno cargadas');
console.log('MQTT_BROKER:', process.env.MQTT_BROKER);
console.log('SERIAL_PORT:', process.env.SERIAL_PORT);
console.log('PORT:', process.env.PORT);

// ------------------- Variables -------------------
const PORT = process.env.PORT || 3000;

const MQTT_BROKER = process.env.MQTT_BROKER;
const MQTT_TOPIC_IN = process.env.MQTT_TOPIC_IN;
const MQTT_TOPIC_OUT = process.env.MQTT_TOPIC_OUT;
const MQTT_TOPIC_STATUS = process.env.MQTT_TOPIC_STATUS;
const MQTT_TOPIC_UMBRAL = process.env.MQTT_TOPIC_UMBRAL;
const MQTT_TOPIC_UMBRAL_STATUS = process.env.MQTT_TOPIC_UMBRAL_STATUS || `${MQTT_TOPIC_UMBRAL}/status`;

const MEDIAMTX_URL = process.env.MEDIAMTX_URL;

// ------------------- Express -------------------
const app = express();
app.use(express.text({ type: "*/*" }));
app.use(express.static("../frontend"));

app.get("/", async (req, res) => {
  try {
    const html = await readFile(path.join(__dirname, '../frontend/index.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error("Error al leer index.html:", err);
    res.status(500).send("Error al cargar la página");
  }
});

// ------------------- Proxy WebRTC MediaMTX -------------------
app.post("/whep", async (req, res) => {
  try {
    const offerSDP = req.body;
    console.log("Offer SDP recibido del navegador:\n", offerSDP.slice(0, 200));

    const mediamtx = await fetch(`${MEDIAMTX_URL}/players/mystream/whep`, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: offerSDP,
    });

    const answerSDP = await mediamtx.text();
    console.log("Answer SDP recibido de MediaMTX:\n", answerSDP.slice(0, 200));

    res.set("Content-Type", "application/sdp");
    res.send(answerSDP);
  } catch (err) {
    console.error("Error en /whep:", err);
    res.status(500).send("Error al comunicar con MediaMTX");
  }
});

// ------------------- Conexión MQTT -------------------
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('Backend conectado a MQTT');

  mqttClient.subscribe([MQTT_TOPIC_OUT, MQTT_TOPIC_STATUS, MQTT_TOPIC_UMBRAL_STATUS], (err) => {
    if (err) console.error('Error suscribiéndose a topics:', err);
  });
});

// ------------------- Servidor HTTP + Socket.IO -------------------
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Registro del socket
registerSocketHandlers(io, mqttClient);

// ------------------- Manejo de mensajes MQTT -------------------
mqttClient.on('message', (topic, message) => {
  const msg = message.toString();
  console.log(`MQTT recibido en ${topic}: ${msg}`);

  switch (topic) {
    case MQTT_TOPIC_OUT:
      processMessage(msg, (cmd) => mqttClient.publish(MQTT_TOPIC_IN, cmd));
      break;

    case MQTT_TOPIC_STATUS:
      io.emit('bridge-status', msg);
      break;

    case MQTT_TOPIC_UMBRAL_STATUS:
      io.emit('umbrales-update', msg);
      break;

    default:
      console.log('Topic desconocido:', topic);
  }
});

// ------------------- Inicia servidor -------------------
server.listen(PORT, () => {
  console.log(`Servidor unificado corriendo en http://localhost:${PORT}`);
});
