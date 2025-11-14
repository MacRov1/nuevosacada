// server/wifi-counter.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const COUNTER_FILE = path.join(path.dirname(__filename), 'wifi-count.json');

const estado = {
  macs: new Set(),
  total: 0
};

// CARGAR AL INICIAR
if (fs.existsSync(COUNTER_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
    estado.total = data.total || 0;
    estado.macs = new Set(data.macs || []);
    console.log(`Contador cargado: ${estado.total} redes únicas`);
  } catch (err) {
    console.error("Error cargando wifi-count.json:", err.message);
  }
} else {
  console.log("wifi-count.json no existe → inicia en 0");
}

// GUARDAR
function guardar() {
  try {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({
      total: estado.total,
      macs: Array.from(estado.macs)
    }, null, 2));
  } catch (err) {
    console.error("Error guardando contador:", err.message);
  }
}

// FUNCIONES
export function agregarRedUnica(bssid) {
  bssid = bssid.trim().toUpperCase();
  if (!estado.macs.has(bssid)) {
    estado.macs.add(bssid);
    estado.total++;
    guardar();
    return true;
  }
  return false;
}

export function getEstado() {
  return estado;
}

export function resetContador() {
  estado.macs.clear();
  estado.total = 0;
  guardar();
  console.log("Contador reseteado a 0");
}