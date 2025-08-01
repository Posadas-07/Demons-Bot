const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn, args, text }) => {
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const senderId = msg.key.participant || msg.key.remoteJid;
  const isBot = msg.key.fromMe;

  if (!isGroup) {
    await conn.sendMessage(chatId, {
      text: "❌ Este comando solo se puede usar en grupos."
    }, { quoted: msg });
    return;
  }

  // Obtener metadata del grupo
  let isAdmin = false;
  try {
    const meta = await conn.groupMetadata(chatId);
    const participante = meta.participants.find(p => p.id === senderId);
    isAdmin = participante?.admin === "admin" || participante?.admin === "superadmin";
  } catch {}

  if (!isAdmin && !isBot) {
    await conn.sendMessage(chatId, {
      text: "🚫 Solo los administradores pueden personalizar la bienvenida."
    }, { quoted: msg });
    return;
  }

  if (!text) {
    await conn.sendMessage(chatId, {
      text: "✳️ Usa:\n.setwelcome <mensaje personalizado>\n\nEjemplo:\n.setwelcome Bienvenid@ @user a nuestro grupo 💖"
    }, { quoted: msg });
    return;
  }

  const filePath = path.resolve("setwelcome.json");
  const data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};

  // Preservar despedida si ya existe
  if (!data[chatId]) data[chatId] = {};
  data[chatId].bienvenida = text;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  await conn.sendMessage(chatId, {
    text: "✅ Mensaje de bienvenida personalizado guardado correctamente."
  }, { quoted: msg });
};

handler.command = ["setwelcome"];
module.exports = handler;
