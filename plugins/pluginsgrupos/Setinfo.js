const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");
  const isFromMe = msg.key.fromMe;

  if (!chatId.endsWith("@g.us")) {
    await conn.sendMessage(chatId, {
      text: "❌ *Este comando solo se puede usar en grupos.*"
    }, { quoted: msg });
    return;
  }

  const metadata = await conn.groupMetadata(chatId);
  const participante = metadata.participants.find(p => p.id.includes(senderId));
  const isAdmin = participante?.admin === "admin" || participante?.admin === "superadmin";

  const ownerPath = path.resolve("owner.json");
  const owners = fs.existsSync(ownerPath) ? JSON.parse(fs.readFileSync(ownerPath)) : [];
  const isOwner = owners.some(([id]) => id === senderId);

  if (!isAdmin && !isOwner && !isFromMe) {
    await conn.sendMessage(chatId, {
      text: "⛔ *Solo administradores o owners pueden cambiar la descripción del grupo.*"
    }, { quoted: msg });
    return;
  }

  // Detectar si es respuesta a un mensaje
  const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                     msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

  if (!quotedText) {
    await conn.sendMessage(chatId, {
      text: "ℹ️ *Debes responder al mensaje que contiene la nueva descripción.*"
    }, { quoted: msg });
    return;
  }

  try {
    await conn.groupUpdateDescription(chatId, quotedText);
    await conn.sendMessage(chatId, {
      text: `✅ *La descripción del grupo fue actualizada exitosamente.*\n\n📄 *Nueva descripción:*`,
      quoted: msg
    });

    await conn.sendMessage(chatId, {
      text: quotedText
    });

    await conn.sendMessage(chatId, {
      react: { text: "✅", key: msg.key }
    });
  } catch (error) {
    console.error("❌ Error al cambiar la descripción:", error);
    await conn.sendMessage(chatId, {
      text: "❌ *Ocurrió un error al cambiar la descripción del grupo.*"
    }, { quoted: msg });
  }
};

handler.command = ["setinfo"];
module.exports = handler;
