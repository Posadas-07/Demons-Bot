const path = require("path");
const { getConfig, setConfig, deleteConfig } = requireFromRoot("db");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderNum = senderId.replace(/[^0-9]/g, "");
  const isBot = msg.key.fromMe;

  // Reacción inicial
  await conn.sendMessage(chatId, { react: { text: "👋", key: msg.key } });

  // Solo grupos
  if (!chatId.endsWith("@g.us")) {
    await conn.sendMessage(chatId, {
      react: { text: "❌", key: msg.key },
      text: "❌ Este comando solo puede usarse en grupos."
    }, { quoted: msg });
    return;
  }

  // Verificar admins
  let isAdmin = false;
  try {
    const meta = await conn.groupMetadata(chatId);
    const participant = meta.participants.find(p => p.id === senderId);
    isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  } catch {
    isAdmin = false;
  }

  if (!isAdmin && !isBot) {
    await conn.sendMessage(chatId, {
      react: { text: "⛔", key: msg.key },
      text: "🚫 Solo los administradores pueden usar este comando."
    }, { quoted: msg });
    return;
  }

  const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
  const args = body.trim().split(" ").slice(1);
  const estado = args[0]?.toLowerCase();

  if (!["on", "off"].includes(estado)) {
    await conn.sendMessage(chatId, {
      react: { text: "❓", key: msg.key },
      text: `✳️ Usa correctamente:\n\n.despedidas on / off`
    }, { quoted: msg });
    return;
  }

  if (estado === "on") {
    setConfig(chatId, "despedidas", 1);
  } else {
    deleteConfig(chatId, "despedidas");
  }

  await conn.sendMessage(chatId, {
    react: { text: "✅", key: msg.key },
    text: `👋 Sistema de *despedidas* ha sido *${estado === "on" ? "activado" : "desactivado"}* en este grupo.`
  }, { quoted: msg });

  console.log(`📥 Despedidas ${estado.toUpperCase()} guardado en activos.db para ${chatId}`);
};

handler.command = ["despedidas"];
module.exports = handler;
