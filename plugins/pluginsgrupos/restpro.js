const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");

  if (!chatId.endsWith("@g.us")) {
    return conn.sendMessage(chatId, {
      text: "❌ *Este comando solo se puede usar en grupos.*"
    }, { quoted: msg });
  }

  // Verificar si es admin
  const metadata = await conn.groupMetadata(chatId);
  const senderData = metadata.participants.find(p => p.id.includes(senderId));
  const isAdmin = senderData?.admin === "admin" || senderData?.admin === "superadmin";

  if (!isAdmin) {
    return conn.sendMessage(chatId, {
      text: "⛔ *Solo administradores pueden usar este comando.*"
    }, { quoted: msg });
  }

  // Obtener ID del objetivo
  let targetId = null;

  // Si responde a un mensaje
  if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
    targetId = msg.message.extendedTextMessage.contextInfo.participant;
  }

  // Si hay menciones
  if (!targetId && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
    targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
  }

  if (!targetId) {
    return conn.sendMessage(chatId, {
      text: "⚠️ *Debes mencionar o responder al usuario que deseas restaurar de la lista negra.*"
    }, { quoted: msg });
  }

  const targetNum = targetId.replace(/[^0-9]/g, "");
  const filePath = path.resolve("setwelcome.json");
  const data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};

  data[chatId] = data[chatId] || {};
  data[chatId].blacklistAdmins = data[chatId].blacklistAdmins || {};

  if (data[chatId].blacklistAdmins[targetId]) {
    delete data[chatId].blacklistAdmins[targetId];
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return conn.sendMessage(chatId, {
      text: `✅ *El usuario @${targetNum} ha sido restaurado y puede volver a ser admin.*`,
      mentions: [targetId]
    }, { quoted: msg });
  } else {
    return conn.sendMessage(chatId, {
      text: `ℹ️ *El usuario @${targetNum} no está en la lista negra.*`,
      mentions: [targetId]
    }, { quoted: msg });
  }
};

handler.command = ["restpro"];
handler.help = ["restpro"];
handler.tags = ["grupo"];

module.exports = handler;
