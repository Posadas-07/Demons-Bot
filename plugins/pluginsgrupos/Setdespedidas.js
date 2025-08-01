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

  // Verificar si el remitente es admin
  let isAdmin = false;
  try {
    const meta = await conn.groupMetadata(chatId);
    const participante = meta.participants.find(p => p.id === senderId);
    isAdmin = participante?.admin === "admin" || participante?.admin === "superadmin";
  } catch {}

  if (!isAdmin && !isBot) {
    await conn.sendMessage(chatId, {
      text: "🚫 Solo los administradores pueden personalizar la despedida."
    }, { quoted: msg });
    return;
  }

  if (!text) {
    await conn.sendMessage(chatId, {
      text: "✳️ Usa:\n.setdespedidas <mensaje personalizado>\n\nEjemplo:\n.setdespedidas Adiós @user, te extrañaremos 💔"
    }, { quoted: msg });
    return;
  }

  const filePath = path.resolve("setwelcome.json");
  const data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};

  // Preservar bienvenida si ya existe
  if (!data[chatId]) data[chatId] = {};
  data[chatId].despedida = text;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  await conn.sendMessage(chatId, {
    text: "✅ Mensaje de despedida personalizado guardado correctamente."
  }, { quoted: msg });
};

handler.command = ["setdespedidas"];
module.exports = handler;
