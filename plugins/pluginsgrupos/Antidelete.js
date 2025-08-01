const fs = require("fs");
const path = require("path");
const { setConfig } = requireFromRoot("db");

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderId = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");
  const isFromMe = msg.key.fromMe;

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

  if (!isAdmin && !isOwner && !isFromMe) {
    await conn.sendMessage(chatId, {
      text: "⛔ *Solo administradores o dueños del bot pueden usar este comando.*"
    }, { quoted: msg });
    return;
  }

  const estado = args[0]?.toLowerCase();
  if (!["on", "off"].includes(estado)) {
    await conn.sendMessage(chatId, {
      text: "🎛️ *Usa:* `.antidelete on` o `.antidelete off`"
    }, { quoted: msg });
    return;
  }

  const nuevoEstado = estado === "on" ? 1 : 0;
  await setConfig(chatId, "antidelete", nuevoEstado);

  await conn.sendMessage(chatId, {
    text: `✅ *Antidelete* ha sido ${estado === "on" ? "*activado*" : "*desactivado*"} para este grupo.`,
    quoted: msg
  });

  await conn.sendMessage(chatId, {
    react: { text: estado === "on" ? "🛡️" : "❌", key: msg.key }
  });
};

handler.command = ["antidelete"];
module.exports = handler;
