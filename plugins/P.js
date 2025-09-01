// plugins/p.js
// Comando: .p
// Muestra capacidad y uso del servidor (RAM, CPU, Disco, uptime).
// Reacciona al usar el comando y responde citando el mensaje original.
// Nota: el bot está alojado en "Sky Ultra Plus" (informativo).

const os = require("os");
const { exec } = require("child_process");

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(2)} GB`;
}
function pct(used, total) {
  if (!total) return "—";
  return `${((used / total) * 100).toFixed(1)}%`;
}
function num(n) {
  return Number(n || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

// Aproximación de % CPU usando muestreo corto
function sampleCpuPercent(ms = 400) {
  return new Promise((resolve) => {
    const snap = () => os.cpus().map(c => c.times);
    const a = snap();
    setTimeout(() => {
      const b = snap();
      let idle = 0, total = 0;
      for (let i = 0; i < a.length; i++) {
        const at = a[i], bt = b[i];
        const idleDelta = bt.idle - at.idle;
        const totalDelta = (bt.user - at.user) + (bt.nice - at.nice) + (bt.sys - at.sys) + (bt.irq - at.irq) + idleDelta;
        idle += idleDelta;
        total += totalDelta;
      }
      const usage = total > 0 ? (1 - idle / total) * 100 : 0;
      resolve(Math.max(0, Math.min(100, usage)));
    }, ms);
  });
}

// Info de disco del punto de montaje raíz usando `df` (Linux/Unix)
function getDiskInfo() {
  return new Promise((resolve) => {
    // -P para formato POSIX estable
    exec("df -kP /", (err, stdout) => {
      if (err || !stdout) {
        // Fallback: sin disco
        return resolve(null);
      }
      const lines = stdout.trim().split("\n");
      if (lines.length < 2) return resolve(null);
      const parts = lines[1].split(/\s+/); // Filesystem 1024-blocks Used Available Capacity Mounted
      // En algunos sistemas la columna 5 es '%'
      const totalKB = parseInt(parts[1], 10);
      const usedKB  = parseInt(parts[2], 10);
      const availKB = parseInt(parts[3], 10);
      const usedPct = parts[4] || "";
      resolve({
        total: totalKB * 1024,
        used: usedKB * 1024,
        avail: availKB * 1024,
        usedPct: usedPct.includes("%") ? usedPct : null
      });
    });
  });
}

module.exports = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  // Reacción inicial
  await conn.sendMessage(chatId, { react: { text: "🛰️", key: msg.key } });

  // RAM
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;

  // CPU (modelo y núcleos)
  const cpus = os.cpus() || [];
  const cpuModel = cpus[0]?.model || "Desconocido";
  const cpuCores = cpus.length;

  // Carga promedio (1, 5, 15 min)
  const [l1, l5, l15] = os.loadavg();

  // % CPU (muestreo corto)
  const cpuPercent = await sampleCpuPercent(400);

  // Disco
  const disk = await getDiskInfo();

  // Uptime
  const upSec = os.uptime();
  const d = Math.floor(upSec / 86400);
  const h = Math.floor((upSec % 86400) / 3600);
  const m = Math.floor((upSec % 3600) / 60);
  const s = Math.floor(upSec % 60);
  const uptimeStr = `${d}d ${h}h ${m}m ${s}s`;

  // Host
  const host = os.hostname();
  const platform = `${os.platform()} ${os.release()}`;
  const nodev = process.version;

  // Armado de texto
  let texto =
`🖥️ *Estado del Servidor* (Sky Ultra Plus)
🏷️ Host: *${host}*
🧩 SO: *${platform}*
🟢 Uptime: *${uptimeStr}*
────────────────
🧠 *RAM*
• Total: ${formatBytes(totalMem)}
• Usada: ${formatBytes(usedMem)}  (${pct(usedMem, totalMem)})
• Libre: ${formatBytes(freeMem)}
────────────────
⚙️ *CPU*
• Modelo: ${cpuModel}
• Núcleos: ${cpuCores}
• Carga (1/5/15m): ${num(l1)} / ${num(l5)} / ${num(l15)}
• Uso aprox.: ${num(cpuPercent)}%
────────────────
💾 *Disco (/)*`;

  if (disk) {
    const t = disk.total, u = disk.used, a = disk.avail;
    const p = disk.usedPct || pct(u, t);
    texto += `\n• Capacidad: ${formatBytes(t)}\n• Usado: ${formatBytes(u)}  (${p})\n• Libre: ${formatBytes(a)}`;
  } else {
    texto += `\n• No disponible (sin 'df')`;
  }

  texto += `\n────────────────
🔧 Node.js: ${nodev}`;

  // Enviar citando SIEMPRE el mensaje original
  await conn.sendMessage(chatId, { text: texto, quoted: msg });

  // Reacción final
  await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
};

module.exports.command = ["p"];
