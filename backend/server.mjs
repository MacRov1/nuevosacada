import { createServer } from 'http';
import { Server } from 'socket.io';
import mqtt from 'mqtt';
import express from 'express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { Issuer, Strategy as OpenIDStrategy } from 'openid-client';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { ensureLoggedIn, ensureLoggedOut } from 'connect-ensure-login';
import sharedsession from 'express-socket.io-session';
import { arduino, processMessage } from './arduino.mjs';
import { registerSocketHandlers } from './socket.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configuración MQTT
const MQTT_BROKER = 'mqtt://localhost';
const MQTT_TOPIC_IN = 'semaforo/control';
const MQTT_TOPIC_OUT = 'semaforo/estado';
const MQTT_TOPIC_STATUS = 'bridge/status';

// Inicializar Express
const app = express();
app.use(express.text({ type: '*/*' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Configuración de sesión
const sessionSecret = 'secret'; // ⚠️ Cambiar por uno seguro en producción
const sessionMiddleware = session({
  saveUninitialized: false,
  resave: false,
  secret: sessionSecret,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24h
});
app.use(cookieParser());
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Servidor HTTP y Socket.IO
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.use(sharedsession(sessionMiddleware, { autoSave: true }));

// Conexión MQTT
const mqttClient = mqtt.connect(MQTT_BROKER);
mqttClient.on('connect', () => {
  console.log('Backend conectado a MQTT');
  mqttClient.subscribe([MQTT_TOPIC_OUT, MQTT_TOPIC_STATUS]);
  mqttClient.publish('semaforo/estado', 'Estado E0'); // Prueba inicial
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

// 🔐 Configuración OIDC
const KEYCLOAK_URL = process.env.OID_WELLKNOW;
const CLIENT_ID = process.env.OID_CLIENT_ID;
const CLIENT_SECRET = process.env.OID_CLIENT_SECRET;
const REDIRECT_URI = process.env.OID_REDIRECT_URIS;
const SCOPE = 'openid email'; // Alineado con el docente

// Validar variables de entorno
if (!KEYCLOAK_URL || !CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('Error: Faltan variables de entorno para Keycloak');
  console.error('Asegúrate de definir en .env:');
  console.error('- OID_WELLKNOW');
  console.error('- OID_CLIENT_ID');
  console.error('- OID_CLIENT_SECRET');
  console.error('- OID_REDIRECT_URIS');
  process.exit(1);
}

console.log('Usando Keycloak URL:', KEYCLOAK_URL);

let client;
try {
  const keycloakIssuer = await Issuer.discover(KEYCLOAK_URL);
  client = new keycloakIssuer.Client({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uris: [REDIRECT_URI],
    response_types: ['code'],
  });
} catch (error) {
  console.error('Error al configurar Keycloak:', error);
  process.exit(1);
}

const verify = (tokenSet, userInfo, done) => {
  console.log('🔑 Usuario autenticado:', userInfo);
  const user = { ...userInfo, id_token: tokenSet.id_token };
  done(null, user);
};

passport.use('openid', new OpenIDStrategy({ client, params: { scope: SCOPE } }, verify));
passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((user, cb) => cb(null, user));

// Registrar handlers de Socket.IO
registerSocketHandlers(io, mqttClient);

// Rutas frontend
app.get('/', ensureLoggedIn('/login'), async (req, res) => {
  console.log('Acceso a /, usuario:', req.user);
  const html = await readFile(path.join(__dirname, '../frontend/index.html'), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

app.get('*', ensureLoggedIn('/login'), async (req, res) => {
  console.log('Catch-all, usuario:', req.user);
  const html = await readFile(path.join(__dirname, '../frontend/index.html'), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

app.get('/assets/style.css', async (req, res) => {
  const css = await readFile(path.join(__dirname, '../frontend/assets/style.css'), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/css' });
  res.end(css);
});

// Proxy WebRTC
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

// Rutas de autenticación
app.get('/login', ensureLoggedOut('/logout'), (req, res, next) => {
  console.log('Acceso a /login, sesión:', req.session);
  passport.authenticate('openid', { session: true })(req, res, next);
});

app.get('/login/callback', (req, res, next) => {
  console.log('Query params en /login/callback:', req.query);
  passport.authenticate('openid', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureMessage: true
  }, (err, user, info) => {
    if (err || !user) {
      console.error('Error en /login/callback:', err, info);
      return res.status(400).send('Error en el callback de autenticación: ' + (info?.message || err?.message || 'Unknown error'));
    }
    req.logIn(user, { session: true }, (loginErr) => {
      if (loginErr) {
        console.error('Error en req.logIn:', loginErr);
        return res.status(500).send('Error al iniciar sesión');
      }
      console.log('Usuario logueado:', user);
      return res.redirect('/');
    });
  })(req, res, next);
});

app.get('/logout', (req, res, next) => {
  const postLogoutRedirect = `${req.protocol}://${req.get('host')}/login`;
  const id_token_hint = req.user?.id_token;
  console.log('Logout - id_token_hint:', id_token_hint);
  const endSessionUrl = client.endSessionUrl({
    post_logout_redirect_uri: postLogoutRedirect,
    id_token_hint,
  });

  req.logout((err) => {
    if (err) {
      console.error('Error en req.logout:', err);
      return next(err);
    }
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error al destruir sesión:', err);
          return next(err);
        }
        console.log('Redirigiendo a:', endSessionUrl);
        res.redirect(endSessionUrl);
      });
    } else {
      console.log('Redirigiendo a:', endSessionUrl);
      res.redirect(endSessionUrl);
    }
  });
});

// Iniciar servidor
server.listen(3001, () => {
  console.log('Servidor SCADA + WebRTC en http://localhost:3001');
});