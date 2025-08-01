const path = require("path");
const { getConfig, setConfig, deleteConfig } = requireFromRoot("db");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const isBot = msg.key.fromMe;

  // Reacción inicial
  await conn.sendMessage(chatId, { react: { text: "📢", key: msg.key } });

  // Solo grupos
  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(chatId, {
      text: "❌ Este comando solo puede usarse en grupos.",
      react: { text: "❌", key: msg.key }
    }, { quoted: msg });
  }

  // Verificar si es admin
  let isAdmin = false;
  try {
    const meta = await conn.groupMetadata(chatId);
    const participant = meta.participants.find(p => p.id === senderId);
    isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  } catch {
    isAdmin = false;
  }

  if (!isAdmin && !isBot) {
    return await conn.sendMessage(chatId, {
      text: "🚫 Solo los administradores pueden usar este comando.",
      react: { text: "❌", key: msg.key }
    }, { quoted: msg });
  }

  const messageText =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    "";
  const args = messageText.trim().split(" ").slice(1);
  const estado = args[0]?.toLowerCase();

  if (!["on", "off"].includes(estado)) {
    return await conn.sendMessage(chatId, {
      text: `✳️ Usa correctamente:\n\n.welcome on / off`,
      react: { text: "ℹ️", key: msg.key }
    }, { quoted: msg });
  }

  if (estado === "on") {
    setConfig(chatId, "welcome", 1);
  } else {
    deleteConfig(chatId, "welcome");
  }

  return await conn.sendMessage(chatId, {
    text: `🎉 Función de bienvenida *${estado === "on" ? "activada" : "desactivada"}* correctamente.`,
    react: { text: "✅", key: msg.key }
  }, { quoted: msg });
};

handler.command = ["welcome"];
module.exports = handler;
