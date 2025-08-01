const path = require("path");
const { getConfig, setConfig, deleteConfig } = requireFromRoot("db");

const handler = async (msg, { conn }) => {
  try {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const senderId = msg.key.participant || msg.key.remoteJid;
    const senderNum = senderId.replace(/[^0-9]/g, "");
    const isBotMessage = msg.key.fromMe;

    if (!isGroup) {
      await conn.sendMessage(chatId, {
        text: "❌ Este comando solo se puede usar en grupos."
      }, { quoted: msg });
      return;
    }

    const metadata = await conn.groupMetadata(chatId);
    const participant = metadata.participants.find(p => p.id === senderId);
    const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
    const isOwner = global.owner.some(([id]) => id === senderNum);

    if (!isAdmin && !isBotMessage) {
      await conn.sendMessage(chatId, {
        text: "🚫 Solo los administradores del grupo pueden usar este comando."
      }, { quoted: msg });
      return;
    }

    const messageText =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "";
    const args = messageText.trim().split(" ").slice(1);
    const estado = args[0]?.toLowerCase();

    if (!["on", "off"].includes(estado)) {
      await conn.sendMessage(chatId, {
        text: "✳️ Usa correctamente:\n\n.chat on / off"
      }, { quoted: msg });
      return;
    }

    if (estado === "on") {
      setConfig(chatId, "chatgpt", 1);
    } else {
      deleteConfig(chatId, "chatgpt");
    }

    await conn.sendMessage(chatId, {
      text: `🤖 *ChatGPT* ha sido *${estado === "on" ? "activado" : "desactivado"}* en este grupo.`,
      react: { text: "✅", key: msg.key }
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ Error en comando .chat:", err);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ Ocurrió un error al cambiar el estado de ChatGPT.",
      react: { text: "❌", key: msg.key }
    }, { quoted: msg });
  }
};

handler.command = ["chat"];
module.exports = handler;
