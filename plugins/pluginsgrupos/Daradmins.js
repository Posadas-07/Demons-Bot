const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");
  const isGroup = chatId.endsWith("@g.us");

  if (!isGroup) {
    await conn.sendMessage(chatId, {
      text: "❌ *Este comando solo puede usarse en grupos.*"
    }, { quoted: msg });
    return;
  }

  const metadata = await conn.groupMetadata(chatId);
  const participantes = metadata.participants;
  const participante = participantes.find(p => p.id.includes(senderId));
  const isAdmin = participante?.admin === "admin" || participante?.admin === "superadmin";

  const ownerPath = path.resolve("owner.json");
  const owners = fs.existsSync(ownerPath) ? JSON.parse(fs.readFileSync(ownerPath)) : [];
  const isOwner = owners.some(([id]) => id === senderId);

  if (!isAdmin && !isOwner) {
    await conn.sendMessage(chatId, {
      text: "⛔ *Solo administradores o dueños del bot pueden usar este comando.*"
    }, { quoted: msg });
    return;
  }

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  let targets = mentions;

  if (!mentions.length && msg.message?.extendedTextMessage?.contextInfo?.participant) {
    targets = [msg.message.extendedTextMessage.contextInfo.participant];
  }

  if (!targets.length) {
    await conn.sendMessage(chatId, {
      text: "📌 *Debes mencionar o citar al usuario que quieres volver administrador.*"
    }, { quoted: msg });
    return;
  }

  try {
    await conn.groupParticipantsUpdate(chatId, targets, "promote");
    await conn.sendMessage(chatId, {
      text: `✅ *Se otorgó admin a:* ${targets.map(jid => `@${jid.split("@")[0]}`).join(", ")}`,
      mentions: targets
    }, { quoted: msg });
  } catch (e) {
    console.error("❌ Error al dar admin:", e);
    await conn.sendMessage(chatId, {
      text: "❌ *No se pudo otorgar admin.*"
    }, { quoted: msg });
  }
};

handler.command = ["daradmins"];
module.exports = handler;
