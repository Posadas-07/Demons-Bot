// plugins/delmenu.js
const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const numero = sender.replace(/\D/g, "");
  const fromMe = !!msg.key.fromMe;
  const botID = (conn.user?.id || "").replace(/\D/g, "");

  // 🧹 Reacción inicial
  try { await conn.sendMessage(chatId, { react: { text: "🧹", key: msg.key } }); } catch {}

  // 🔐 Permiso: solo owners o el bot
  const isOwner = (typeof global.isOwner === "function")
    ? global.isOwner(numero)
    : (Array.isArray(global.owner) && global.owner.some(([id]) => id === numero));

  if (!isOwner && !fromMe && numero !== botID) {
    try { await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }); } catch {}
    return conn.sendMessage(chatId, {
      text: "🚫 Solo los *owners* o el *bot* pueden usar este comando."
    }, { quoted: msg });
  }

  const filePath = path.resolve("./setmenu.json");

  if (!fs.existsSync(filePath)) {
    try { await conn.sendMessage(chatId, { react: { text: "ℹ️", key: msg.key } }); } catch {}
    return conn.sendMessage(chatId, { text: "ℹ️ No hay *menú personalizado* guardado." }, { quoted: msg });
  }

  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    // Si está corrupto, eliminar archivo
    try { fs.unlinkSync(filePath); } catch {}
    try { await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }); } catch {}
    return conn.sendMessage(chatId, { text: "✅ Menú personalizado eliminado." }, { quoted: msg });
  }

  let changed = false;
  if (typeof data === "object" && data) {
    if ("texto" in data) { delete data.texto; changed = true; }
    if ("imagen" in data) { delete data.imagen; changed = true; }
  }

  if (!changed) {
    // No había claves de menú personalizadas
    if (!data || Object.keys(data).length === 0) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    try { await conn.sendMessage(chatId, { react: { text: "ℹ️", key: msg.key } }); } catch {}
    return conn.sendMessage(chatId, { text: "ℹ️ No había *menú personalizado* que borrar." }, { quoted: msg });
  }

  // Si quedó vacío, borrar archivo; si no, guardar cambios
  if (Object.keys(data).length === 0) {
    try { fs.unlinkSync(filePath); } catch {}
  } else {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  try { await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }); } catch {}
  return conn.sendMessage(chatId, { text: "✅ *Menú personalizado eliminado* correctamente." }, { quoted: msg });
};

handler.command = ["delmenu"];
handler.help = ["delmenu"];
handler.tags = ["menu"];

module.exports = handler;
