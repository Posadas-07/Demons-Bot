const { setConfig, getConfig } = requireFromRoot("db");

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");

  if (!isGroup) {
    await conn.sendMessage(chatId, {
      text: "❌ *Este comando solo puede usarse en grupos.*"
    }, { quoted: msg });
    return;
  }

  // Verificar si es admin
  let isAdmin = false;
  try {
    const metadata = await conn.groupMetadata(chatId);
    const participante = metadata.participants.find(p => p.id === sender);
    isAdmin = participante?.admin === "admin" || participante?.admin === "superadmin";
  } catch {}

  if (!isAdmin && !msg.key.fromMe) {
    await conn.sendMessage(chatId, {
      text: "⛔ *Solo los administradores pueden activar o desactivar el modo anti stickers.*"
    }, { quoted: msg });
    return;
  }

  const opcion = (args[0] || "").toLowerCase();
  if (opcion !== "on" && opcion !== "off") {
    await conn.sendMessage(chatId, {
      text: "⚙️ Usa: *antis on* o *antis off* para activar o desactivar el modo anti stickers."
    }, { quoted: msg });
    return;
  }

  const valor = opcion === "on" ? 1 : 0;
  await setConfig(chatId, "antis", valor);

  await conn.sendMessage(chatId, {
    text: `✅ *Modo anti stickers* ${valor ? "activado" : "desactivado"} correctamente.`
  }, { quoted: msg });

  await conn.sendMessage(chatId, {
    react: { text: valor ? "🛡️" : "❌", key: msg.key }
  });
};

handler.command = ["antis"];
module.exports = handler;
