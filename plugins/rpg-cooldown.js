const fs = require("fs");
const path = require("path");

const sukirpgPath = path.join(process.cwd(), "sukirpg.json");

let sukirpg = {};
if (fs.existsSync(sukirpgPath)) {
  sukirpg = JSON.parse(fs.readFileSync(sukirpgPath));
} else {
  fs.writeFileSync(sukirpgPath, JSON.stringify({}, null, 2));
}

const saveSukirpg = () => {
  fs.writeFileSync(sukirpgPath, JSON.stringify(sukirpg, null, 2));
};

const COOLDOWN = 15 * 60 * 1000; // 15 minutos

async function checkRpgGlobal(msg, plugin, conn) {
  const user = msg.key.participant || msg.key.remoteJid;
  const chatId = msg.key.remoteJid;
  const cmdName = plugin.command?.[0] || "desconocido"; // nombre del comando

  if (!plugin.rpg) return true;

  if (!sukirpg[user]) sukirpg[user] = {};
  if (!sukirpg[user][cmdName]) sukirpg[user][cmdName] = { lastUse: 0 };

  const now = Date.now();
  const last = sukirpg[user][cmdName].lastUse;

  if (now - last < COOLDOWN) {
    const remaining = COOLDOWN - (now - last);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    await conn.sendMessage(chatId, {
      text: `⏳ Debes esperar *${minutes}m ${seconds}s* antes de usar nuevamente el comando *${cmdName}*.`,
    });
    return false;
  }

  // ✅ Actualizar última vez de uso de este comando
  sukirpg[user][cmdName].lastUse = now;
  saveSukirpg();

  return true;
}

module.exports = { checkRpgGlobal };