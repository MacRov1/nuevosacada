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
dotenv.config({ path: path.resolve('../.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// MQTT Topics
const MQTT_BROKER = process.env.MQTT_BROKER;
const MQTT_TOPIC_IN = process.env.MQTT_TOPIC_IN;
const MQTT_TOPIC_OUT = process.env.MQTT_TOPIC_OUT;
const MQTT_TOPIC_STATUS = process.env.MQTT_TOPIC_STATUS;
const MQTT_TOPIC_UMBRAL = process.env.MQTT_TOPIC_UMBRAL; // Nuevo Semana 12

const MEDIAMTX_URL = process.env.MEDIAMTX_URL;

// ------------------- Express -------------------
const app = express();

// Middleware para recibir texto crudo (SDP)
app.use(express.text({ type: "*/*" }));

// Servir frontend estático
app.use(express.static("../frontend"));

// Servir index.html manualmente
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

  // Nos suscribimos a todos los topics necesarios
  mqttClient.subscribe([MQTT_TOPIC_OUT, MQTT_TOPIC_STATUS, MQTT_TOPIC_UMBRAL], (err) => {
    if (err) console.error('Error suscribiéndose a topics:', err);
  });
});

// ------------------- Servidor HTTP + Socket.IO -------------------
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ------------------- Registro de handlers Socket.IO -------------------
registerSocketHandlers(io, mqttClient);

// ------------------- Conexión Socket.IO -------------------
io.on('connection', (socket) => {
  console.log('Usuario conectado via Socket.IO');

  // ---------------- LCD ----------------
  socket.on('lcd-message', (data) => {
    console.log('Mensaje LCD recibido:', data);
    const { topic, payload } = data;
    mqttClient.publish(topic, payload, (err) => {
      if (err) {
        socket.emit('lcd-response', 'Error al enviar mensaje');
      } else {
        socket.emit('lcd-response', 'Mensaje enviado correctamente');
      }
    });
  });

  // ---------------- WS2812 ----------------
  socket.on('ws-message', (data) => {
    console.log('Mensaje WS2812 recibido:', data);
    const { topic, payload } = data;
    mqttClient.publish(topic, payload, (err) => {
      if (err) {
        socket.emit('ws-response', 'Error al enviar mensaje');
      } else {
        socket.emit('ws-response', 'Mensaje enviado correctamente');
      }
    });
  });
});

// ------------------- Manejo de mensajes MQTT -------------------
mqttClient.on('message', (topic, message) => {
  const msg = message.toString();
  console.log(`MQTT recibido en ${topic}: ${msg}`);

  switch(topic) {
    case MQTT_TOPIC_OUT:
      // Procesa mensajes de estado del semáforo
      processMessage(msg, (cmd) => mqttClient.publish(MQTT_TOPIC_IN, cmd));
      break;

    case MQTT_TOPIC_STATUS:
      // Reenvía status del bridge al front
      io.emit('bridge-status', msg);
      break;

    case MQTT_TOPIC_UMBRAL:
      // Reenvía actualización de umbrales al front
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
