const path = require("path");
const { getConfig, setConfig, deleteConfig } = requireFromRoot("db");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderNum = senderId.replace(/[^0-9]/g, "");
  const isBot = msg.key.fromMe;

  // Reacción inicial
  await conn.sendMessage(chatId, { react: { text: "🦋", key: msg.key } });

  // Verificar que sea grupo
  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(chatId, {
      react: { text: "❌", key: msg.key },
      text: "❌ Este comando solo puede usarse en grupos."
    }, { quoted: msg });
  }

  // Verificar si es admin
  let isAdmin = false;
  try {
    const meta = await conn.groupMetadata(chatId);
    const participant = meta.participants.find(p => p.id === senderId);
    isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  } catch {}

  if (!isAdmin && !isBot) {
    return await conn.sendMessage(chatId, {
      react: { text: "🚫", key: msg.key },
      text: "🚫 Solo los administradores pueden usar este comando."
    }, { quoted: msg });
  }

  // Obtener estado
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
  const args = text.trim().split(/\s+/).slice(1);
  const estado = args[0]?.toLowerCase();

  if (!["on", "off"].includes(estado)) {
    return await conn.sendMessage(chatId, {
      react: { text: "❓", key: msg.key },
      text: `✳️ Usa correctamente:\n\n.linkall on / off`
    }, { quoted: msg });
  }

  if (estado === "on") {
    setConfig(chatId, "linkall", 1);
  } else {
    deleteConfig(chatId, "linkall");
  }

  await conn.sendMessage(chatId, {
    react: { text: "✅", key: msg.key },
    text: `🔗 *LinkAll* ha sido *${estado === "on" ? "activado" : "desactivado"}* correctamente en este grupo.`
  }, { quoted: msg });

  console.log(`[LOG] LinkAll ${estado.toUpperCase()} en ${chatId}`);
};

handler.command = ["linkall"];
module.exports = handler;
