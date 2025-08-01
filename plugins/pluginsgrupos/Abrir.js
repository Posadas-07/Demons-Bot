const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderClean = senderId.replace(/[^0-9]/g, "");
  const isGroup = chatId.endsWith("@g.us");

  if (!isGroup) return await conn.sendMessage(chatId, { text: "❌ Este comando solo puede usarse en grupos." }, { quoted: msg });

  const metadata = await conn.groupMetadata(chatId);
  const participante = metadata.participants.find(p => p.id === senderId);
  const isAdmin = participante?.admin === "admin" || participante?.admin === "superadmin";
  const isOwner = global.owner.some(([id]) => id === senderClean);
  const isFromMe = msg.key.fromMe;

  if (!isAdmin && !isOwner && !isFromMe) {
    return await conn.sendMessage(chatId, {
      text: "🚫 Solo administradores u owners pueden usar este comando."
    }, { quoted: msg });
  }

  if (!args[0]) {
    return await conn.sendMessage(chatId, {
      text: "⚙️ Usa: *abrir 10s*, *abrir 10m* o *abrir 1h* para programar la apertura automática."
    }, { quoted: msg });
  }

  const match = args[0].match(/^(\d+)([smh])$/i);
  if (!match) {
    return await conn.sendMessage(chatId, {
      text: "❌ Formato incorrecto. Usa: *abrir 10s*, *abrir 10m* o *abrir 1h*."
    }, { quoted: msg });
  }

  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let milliseconds = unit === "s" ? amount * 1000 : unit === "m" ? amount * 60 * 1000 : unit === "h" ? amount * 3600 * 1000 : 0;

  if (milliseconds <= 0) return;

  const filePath = path.resolve("setwelcome.json");
  const data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : {};
  if (!data[chatId]) data[chatId] = {};

  data[chatId].abrir = Date.now() + milliseconds;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  await conn.sendMessage(chatId, {
    text: `⏳ Grupo programado para abrirse automáticamente en *${amount}${unit}*.`
  }, { quoted: msg });
};

handler.command = ["abrir"];
module.exports = handler;
