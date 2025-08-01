const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderId = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");
  const isFromMe = msg.key.fromMe;

  if (!chatId.endsWith("@g.us")) {
    await conn.sendMessage(chatId, {
      text: "❌ *Este comando solo se puede usar en grupos.*"
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
      text: "⛔ *Solo administradores o owners pueden cambiar el nombre del grupo.*"
    }, { quoted: msg });
    return;
  }

  const nuevoNombre = args.join(" ").trim();
  if (!nuevoNombre) {
    await conn.sendMessage(chatId, {
      text: "ℹ️ *Debes escribir el nuevo nombre del grupo.*\n\nEjemplo:\n*.setname La Familia de Suki 💕*"
    }, { quoted: msg });
    return;
  }

  try {
    await conn.groupUpdateSubject(chatId, nuevoNombre);
    await conn.sendMessage(chatId, {
      text: `✅ *Nombre del grupo actualizado con éxito.*\n\n📝 *Nuevo nombre:*\n${nuevoNombre}`
    }, { quoted: msg });

    await conn.sendMessage(chatId, {
      react: { text: "✅", key: msg.key }
    });
  } catch (error) {
    console.error("❌ Error al cambiar el nombre del grupo:", error);
    await conn.sendMessage(chatId, {
      text: "❌ *Ocurrió un error al cambiar el nombre del grupo.*"
    }, { quoted: msg });
  }
};

handler.command = ["setname"];
module.exports = handler;
