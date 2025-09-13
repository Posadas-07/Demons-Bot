const fs = require("fs");
const path = require("path");

const sukirpgPath = path.join(process.cwd(), "sukirpg.json");

// 📂 Cargar o crear archivo
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
  const chatId = msg.key.remoteJid;
  const user = msg.key.participant || msg.key.remoteJid;

  if (!sukirpg[user]) {
    // ✅ primera vez que usa un comando RPG
    sukirpg[user] = { lastUse: Date.now(), usedOnce: true };
    saveSukirpg();
    return true; // lo deja usar
  }

  const now = Date.now();
  const last = sukirpg[user].lastUse || 0;
  const usedOnce = sukirpg[user].usedOnce || false;

  if (usedOnce && (now - last < COOLDOWN)) {
    const falta = Math.ceil((COOLDOWN - (now - last)) / 1000);
    await conn.sendMessage(chatId, {
      text: `⏳ Debes esperar *${falta} segundos* antes de usar otro comando RPG.`,
    });
    return false; // bloquea
  }

  // ✅ actualizar última vez
  sukirpg[user].lastUse = now;
  sukirpg[user].usedOnce = true;
  saveSukirpg();

  return true;
}

module.exports = { checkRpgGlobal };