const fs = require("fs");
const path = require("path");

const DIGITS = (s = "") => String(s).replace(/\D/g, "");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderNo = DIGITS(senderId);
  const fromMe = !!msg.key.fromMe;

  const isOwner = (typeof global.isOwner === "function")
    ? global.isOwner(senderId)
    : (Array.isArray(global.owner) && global.owner.some(([id]) => id === senderNo));

  const isGroup = chatId.endsWith("@g.us");
  if (!isGroup) {
    return conn.sendMessage(chatId, {
      text: "📛 *Este comando solo está disponible en grupos.*",
    }, { quoted: msg });
  }

  // === FUNCIONES AUXILIARES ===
  async function isAdminByNumber(number) {
    try {
      const meta = await conn.groupMetadata(chatId);
      const participants = meta.participants || [];
      return participants.some(p =>
        (p.admin === "admin" || p.admin === "superadmin") &&
        DIGITS(p.id) === number
      );
    } catch {
      return false;
    }
  }

  const isAdmin = await isAdminByNumber(senderNo);
  if (!isAdmin && !isOwner && !fromMe) {
    return conn.sendMessage(chatId, {
      text: "🚫 *Permiso denegado*\nSolo los *admins* o el *dueño del bot* pueden usar este comando.",
    }, { quoted: msg });
  }

  // === RUTA DE ARCHIVO ===
  const dbFolder = path.resolve("./database");
  const warnPath = path.join(dbFolder, "advertencias.json");

  if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });
  if (!fs.existsSync(warnPath)) fs.writeFileSync(warnPath, JSON.stringify({}, null, 2));

  const warnData = JSON.parse(fs.readFileSync(warnPath));

  // === VALIDAR EXISTENCIA DE DATOS ===
  if (!warnData[chatId] || Object.keys(warnData[chatId]).length === 0) {
    return conn.sendMessage(chatId, {
      text: "✅ *Ningún usuario tiene advertencias en este grupo.*",
    }, { quoted: msg });
  }

  // === CONSTRUIR LISTA ===
  let texto = `⚠️ *Advertencias del grupo*\n\n`;
  const groupWarns = warnData[chatId];
  let mentions = [];

  for (const [jid, warns] of Object.entries(groupWarns)) {
    const num = DIGITS(jid);
    texto += `👤 @${num}\n⚠️ Advertencias: ${warns}/3\n\n`;
    mentions.push(jid);
  }

  await conn.sendMessage(chatId, {
    text: texto.trim(),
    mentions
  }, { quoted: msg });
};

handler.command = ["advertenciasgrupo"];
handler.help = ["advertenciasgrupo"];
handler.tags = ["grupo", "moderación"];

module.exports = handler;