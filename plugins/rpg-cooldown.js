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

  if (!plugin.rpg) return true;

  if (!sukirpg[user]) {
    sukirpg[user] = { lastUse: Date.now(), usedOnce: true };
    saveSukirpg();
    return true;
  }

  const now = Date.now();
  const last = sukirpg[user].lastUse || 0;
  const usedOnce = sukirpg[user].usedOnce || false;

  if (usedOnce && now - last < COOLDOWN) {
    const remaining = COOLDOWN - (now - last);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    await conn.sendMessage(chatId, {
      text: `⏳ Debes esperar *${minutes}m ${seconds}s* antes de usar otro comando RPG.`,
    });
    return false;
  }

  sukirpg[user].lastUse = now;
  sukirpg[user].usedOnce = true;
  saveSukirpg();

  return true;
}

module.exports = { checkRpgGlobal };