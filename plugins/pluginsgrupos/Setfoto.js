const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");
  const isFromMe = msg.key.fromMe;
  const isGroup = chatId.endsWith("@g.us");

  if (!isGroup) {
    await conn.sendMessage(chatId, {
      text: "❌ *Este comando solo se puede usar en grupos.*"
    }, { quoted: msg });
    return;
  }

  const metadata = await conn.groupMetadata(chatId);
  const participant = metadata.participants.find(p => p.id === msg.key.participant || p.id === senderId);
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";

  // Verificar si es owner (desde owner.json)
  const ownerPath = path.resolve("owner.json");
  const owners = fs.existsSync(ownerPath) ? JSON.parse(fs.readFileSync(ownerPath)) : [];
  const isOwner = owners.some(([id]) => id === senderId);

  if (!isAdmin && !isOwner && !isFromMe) {
    await conn.sendMessage(chatId, {
      text: "🚫 *Solo administradores o el Owner pueden cambiar la foto del grupo.*"
    }, { quoted: msg });
    return;
  }

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted || !quoted.imageMessage) {
    await conn.sendMessage(chatId, {
      text: "⚠️ *Debes responder a una imagen para cambiar la foto del grupo.*"
    }, { quoted: msg });
    return;
  }

  try {
    const stream = await downloadContentFromMessage(quoted.imageMessage, "image");
    let buffer = Buffer.from([]);

    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    await conn.updateProfilePicture(chatId, buffer);

    await conn.sendMessage(chatId, {
      text: "✅ *La foto del grupo ha sido actualizada con éxito.*"
    }, { quoted: msg });
  } catch (err) {
    console.error("❌ Error al cambiar la foto del grupo:", err);
    await conn.sendMessage(chatId, {
      text: "❌ *Error al actualizar la foto del grupo.*"
    }, { quoted: msg });
  }
};

handler.command = ["setfoto"];
module.exports = handler;
