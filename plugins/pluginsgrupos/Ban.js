const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderNum = senderId.replace(/[^0-9]/g, "");
  const isGroup = chatId.endsWith("@g.us");
  const isOwner = global.isOwner(senderId);

  if (!isGroup) {
    return conn.sendMessage(chatId, {
      text: "❌ Este comando solo puede usarse en grupos."
    }, { quoted: msg });
  }

  const metadata = await conn.groupMetadata(chatId);
  const isAdmin = metadata.participants.find(p => p.id === senderId)?.admin;
  if (!isAdmin && !isOwner) {
    return conn.sendMessage(chatId, {
      text: "❌ Solo *admins* o *dueños* del bot pueden usar este comando."
    }, { quoted: msg });
  }

  let target = null;

  // Verificar si viene por respuesta
  const context = msg.message?.extendedTextMessage?.contextInfo;
  if (context?.participant) {
    target = context.participant;
  }

  // Si no hay respuesta, verificar si se usó una mención
  const mentions = context?.mentionedJid || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (!target && mentions?.length) {
    target = mentions[0];
  }

  if (!target) {
    return conn.sendMessage(chatId, {
      text: "⚠️ Responde a un mensaje o menciona al usuario que quieres banear."
    }, { quoted: msg });
  }

  const targetNum = target.replace(/[^0-9]/g, "");
  if (global.owner.some(([id]) => id === targetNum)) {
    return conn.sendMessage(chatId, {
      text: "❌ No puedes banear al *dueño del bot*."
    }, { quoted: msg });
  }

  const welcomePath = path.resolve("setwelcome.json");
  const welcomeData = fs.existsSync(welcomePath) ? JSON.parse(fs.readFileSync(welcomePath)) : {};
  welcomeData[chatId] = welcomeData[chatId] || {};
  welcomeData[chatId].banned = welcomeData[chatId].banned || [];

  if (!welcomeData[chatId].banned.includes(target)) {
    welcomeData[chatId].banned.push(target);
    fs.writeFileSync(welcomePath, JSON.stringify(welcomeData, null, 2));
    await conn.sendMessage(chatId, {
      text: `🚫 Usuario @${targetNum} ha sido *baneado*.`,
      mentions: [target]
    }, { quoted: msg });
  } else {
    await conn.sendMessage(chatId, {
      text: "⚠️ Este usuario ya está baneado.",
      mentions: [target]
    }, { quoted: msg });
  }
};

handler.command = ["ban"];
module.exports = handler;
