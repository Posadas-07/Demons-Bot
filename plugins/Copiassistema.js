// plugins/backupjson_watcher.js
// Siempre activo: cada 5 min envía TODOS los .json de la RAÍZ al propio bot.

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const INTERVALO_MS = 2 * 60 * 60 * 1000; // 2 horas// 5 min
const PAUSA_ENTRE_ARCHIVOS_MS = 3000;  // 3s
const MAX_REINTENTOS = 3;
const MAX_JSON_BYTES = 25 * 1024 * 1024;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function jsonsEnRaiz() {
  const root = process.cwd();
  const items = fs.readdirSync(root, { withFileTypes: true });
  return items
    .filter(d => d.isFile() && path.extname(d.name).toLowerCase() === ".json")
    .map(d => path.join(root, d.name));
}

async function enviarJsonConRetry(conn, jid, filePath) {
  const fileName = path.basename(filePath);
  if (path.extname(fileName).toLowerCase() !== ".json") return;

  const stat = fs.statSync(filePath);
  if (stat.size > MAX_JSON_BYTES) {
    console.warn(`[backupjson_watcher] Saltado (muy grande): ${fileName} (${stat.size} bytes)`);
    return;
  }

  const buffer = await fsp.readFile(filePath);
  const caption =
`🗄️ Copia de seguridad automática (.json)
📄 Archivo: ${fileName}
🕒 Fecha: ${new Date().toLocaleString()}`;

  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      if (intento > 1 && typeof conn.refreshMediaConn === "function") {
        await conn.refreshMediaConn(true).catch(() => {});
      }
      await conn.sendMessage(jid, {
        document: buffer,
        mimetype: "application/json",
        fileName,
        caption
      });
      console.log(`[backupjson_watcher] Enviado a ${jid}: ${fileName}`);
      return;
    } catch (e) {
      const msg = String(e?.message || e);
      const code = e?.output?.statusCode || e?.status;
      console.warn(`[backupjson_watcher] Falló envío ${fileName} -> ${jid} (intento ${intento}/${MAX_REINTENTOS}) code=${code} msg=${msg}`);
      if (intento >= MAX_REINTENTOS) throw e;
      await sleep(1000 * intento + 1000);
    }
  }
}

const handler = async (conn) => {
  const botJid = ((conn.user?.id || "").replace(/[^0-9]/g, "")) + "@s.whatsapp.net";
  if (!botJid || botJid.length < 15) {
    console.error("[backupjson_watcher] No se pudo obtener el JID del bot.");
    return;
  }

  const doBackup = async () => {
    try {
      const archivos = jsonsEnRaiz();
      if (!archivos.length) {
        console.log("[backupjson_watcher] No hay .json en la raíz.");
        return;
      }
      console.log(`[backupjson_watcher] Enviando ${archivos.length} JSON(s) al bot (${botJid}).`);

      for (const filePath of archivos) {
        try { await enviarJsonConRetry(conn, botJid, filePath); }
        catch (e) { console.error("[backupjson_watcher] Error enviando", path.basename(filePath), e); }
        await sleep(PAUSA_ENTRE_ARCHIVOS_MS);
      }
    } catch (err) {
      console.error("[backupjson_watcher] Error general:", err);
    }
  };

  setTimeout(doBackup, 20000); // primera vez a los 20s
  setInterval(doBackup, INTERVALO_MS);

  console.log("[backupjson_watcher] Iniciado. Enviará .json de la raíz al bot cada 2 horas.");
};

handler.run = handler;
module.exports = handler;
