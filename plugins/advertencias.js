const fs = require("fs");
const path = require("path");

async function advertenciasGrupoHandler(msg, { conn }) {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderNo = String(senderId).replace(/\D/g, "");
  const fromMe = !!msg.key.fromMe;

  const isOwner = (typeof global.isOwner === "function") ? global.isOwner(senderId) : 
                 (Array.isArray(global.owner) && global.owner.some(([id]) => id === senderNo));

  const isGroup = chatId.endsWith("@g.us");
  if (!isGroup) {
    return conn.sendMessage(chatId, {
      text: "📛 *Este comando solo está disponible en grupos.*",
    }, { quoted: msg });
  }

  const isAdmin = await isAdminByNumber(conn, chatId, senderNo);
  if (!isAdmin && !isOwner && !fromMe) {
    return conn.sendMessage(chatId, {
      text: "🚫 *Permiso denegado*\nSolo los *admins* o el *dueño del bot* pueden usar este comando.",
    }, { quoted: msg });
  }

  // === ASEGURAR QUE EL ARCHIVO EXISTE ===
  const dbFolder = path.resolve("./database");
  const warnPath = path.join(dbFolder, "advertencias.json");

  if (!fs.existsSync(warnPath)) {
    return conn.sendMessage(chatId, {
      text: "⚠️ *No hay advertencias registradas en este grupo.*",
    }, { quoted: msg });
  }

  const warnData = JSON.parse(fs.readFileSync(warnPath));
  if (!warnData[chatId] || Object.keys(warnData[chatId]).length === 0) {
    return conn.sendMessage(chatId, {
      text: "⚠️ *No hay advertencias registradas en este grupo.*",
    }, { quoted: msg });
  }

  // === GENERAR LISTA DE ADVERTENCIAS ===
  const warnings = Object.entries(warnData[chatId])
    .filter(([user, warns]) => warns > 0)
    .map(([user, warns]) => `👤 *Usuario:* @${String(user).replace(/\D/g, "")}\n⚠️ *Advertencias:* ${warns}/3`)
    .join("\n\n");

  if (!warnings) {
    return conn.sendMessage(chatId, {
      text: "⚠️ *No hay advertencias registradas en este grupo.*",
    }, { quoted: msg });
  }

  await conn.sendMessage(chatId, {
    text: `📋 *Advertencias del grupo:*\n\n${warnings}`,
    mentions: Object.keys(warnData[chatId]),
  }, { quoted: msg });
}

advertenciasGrupoHandler.command = ["advertenciasgrupo"];
module.exports = advertenciasGrupoHandler;