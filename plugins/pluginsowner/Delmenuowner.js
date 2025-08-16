// plugins/delmenuowner.js
const fs = require("fs");
const path = require("path");

const DIGITS = (s = "") => String(s).replace(/\D/g, "");

function isOwnerByNumber(num) {
  if (typeof global.isOwner === "function") return global.isOwner(num);
  return Array.isArray(global.owner) && global.owner.some(([id]) => id === num);
}

const handler = async (msg, { conn }) => {
  const chatId    = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNum = DIGITS(senderJid);
  const fromMe    = !!msg.key.fromMe;

  // 🔐 Permisos
  const botNum = DIGITS(conn.user?.id || "");
  const owner  = isOwnerByNumber(senderNum);
  if (!owner && !fromMe && senderNum !== botNum) {
    try { await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }); } catch {}
    return conn.sendMessage(chatId, {
      text: "🚫 Este comando solo puede usarlo un *Owner* o el *bot*.",
    }, { quoted: msg });
  }

  const filePath = path.resolve("./setmenu.json");
  if (!fs.existsSync(filePath)) {
    try { await conn.sendMessage(chatId, { react: { text: "⚠️", key: msg.key } }); } catch {}
    return conn.sendMessage(chatId, { text: "⚠️ No hay ningún *C-Menu Owner* guardado." }, { quoted: msg });
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const hadAny = ("texto_owner" in data) || ("imagen_owner" in data);

  delete data.texto_owner;
  delete data.imagen_owner;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  try { await conn.sendMessage(chatId, { react: { text: "🗑️", key: msg.key } }); } catch {}
  return conn.sendMessage(
    chatId,
    { text: hadAny ? "✅ *C-Menu Owner* eliminado." : "⚠️ No había *C-Menu Owner* para eliminar." },
    { quoted: msg }
  );
};

handler.command = ["delmenuowner"];
handler.tags = ["menu"];
handler.help = ["delmenuowner"];

module.exports = handler;
