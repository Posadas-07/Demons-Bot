const { getConfig, setConfig, deleteConfig } = requireFromRoot("db");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const isBot = msg.key.fromMe;

  if (!isGroup) {
    await conn.sendMessage(chatId, {
      text: "❌ Este comando solo puede usarse en grupos."
    }, { quoted: msg });
    return;
  }

  // Verificar admin
  let isAdmin = false;
  try {
    const meta = await conn.groupMetadata(chatId);
    const participant = meta.participants.find(p => p.id === senderId);
    isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  } catch {}

  if (!isAdmin && !isBot) {
    await conn.sendMessage(chatId, {
      text: "🚫 Solo los administradores pueden activar o desactivar el antiárabe."
    }, { quoted: msg });
    return;
  }

  // Leer estado actual del mensaje
  const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
  const args = body.trim().split(" ").slice(1);
  const estado = args[0]?.toLowerCase();

  if (!["on", "off"].includes(estado)) {
    await conn.sendMessage(chatId, {
      text: `✳️ Usa:\n\n.antiarabe on / off`
    }, { quoted: msg });
    return;
  }

  if (estado === "on") {
    await setConfig(chatId, "antiarabe", 1);
  } else {
    await deleteConfig(chatId, "antiarabe");
  }

  await conn.sendMessage(chatId, {
    text: `🛡️ AntiÁrabe ha sido *${estado === "on" ? "activado" : "desactivado"}* correctamente en este grupo.`
  }, { quoted: msg });

  console.log(`🛡️ AntiÁrabe ${estado.toUpperCase()} guardado en activos.db para ${chatId}`);
};

handler.command = ["antiarabe"];
module.exports = handler;
