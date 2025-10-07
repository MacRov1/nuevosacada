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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const app = express();

// Middleware: necesitamos recibir texto crudo (SDP)
app.use(express.text({ type: "*/*" }));

// Servir frontend estático
app.use(express.static("../frontend"));

// Servir archivo index.html manualmente
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

// Ruta para hacer de proxy entre el navegador y MediaMTX
app.post("/whep", async (req, res) => {
  try {
    const offerSDP = req.body;
    console.log("Offer SDP recibido del navegador:\n", offerSDP.slice(0, 200));

    const mediamtx = await fetch("http://127.0.0.1:8889/players/mystream/whep", {
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

// Configuración MQTT
const MQTT_BROKER = 'mqtt://localhost';
const MQTT_TOPIC_IN = 'semaforo/control';
const MQTT_TOPIC_OUT = 'semaforo/estado';
const MQTT_TOPIC_STATUS = 'bridge/status';
//const MQTT_TOPIC_LCD = 'semaforo1/lcd'; // NUEVO TÓPICO PARA EL LCD 

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

// Servidor HTTP unificado con Express
const server = createServer(app);

// Socket.IO server
const io = new Server(server, {
  cors: { origin: "*" }
});

registerSocketHandlers(io, mqttClient);

//------------------------------- NUEVO PARA LCD -------------------------------------------
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
//--------------------------------------------------------------------------------------------------

server.listen(PORT, () => {
  console.log(`Servidor unificado corriendo en http://localhost:${PORT}`);
});