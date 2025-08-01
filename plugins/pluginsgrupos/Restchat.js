const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");

  if (!chatId.endsWith("@g.us")) {
    await conn.sendMessage(chatId, {
      text: "❌ *Este comando solo puede usarse en grupos.*"
    }, { quoted: msg });
    return;
  }

  const metadata = await conn.groupMetadata(chatId);
  const participante = metadata.participants.find(p => p.id.includes(senderId));
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

  const filePath = path.resolve("setwelcome.json");
  if (!fs.existsSync(filePath)) {
    await conn.sendMessage(chatId, {
      text: "❌ *No hay datos para este grupo.*"
    }, { quoted: msg });
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (data[chatId]?.chatCount) {
    delete data[chatId].chatCount;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    await conn.sendMessage(chatId, {
      text: "♻️ *El conteo de mensajes fue reiniciado en este grupo.*"
    }, { quoted: msg });
  } else {
    await conn.sendMessage(chatId, {
      text: "ℹ️ *Este grupo no tiene conteo de mensajes guardado.*"
    }, { quoted: msg });
  }
};

handler.command = ["restchat"];
module.exports = handler;
