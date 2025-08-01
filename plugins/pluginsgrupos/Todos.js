const handler = async (msg, { conn, args }) => {
  try {
    const chatId = msg.key.remoteJid;
    const sender = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");
    const isGroup = chatId.endsWith("@g.us");
    const isBotMessage = msg.key.fromMe;

    await conn.sendMessage(chatId, { react: { text: "🔊", key: msg.key } });

    if (!isGroup) {
      await conn.sendMessage(chatId, {
        text: "⚠️ *Este comando solo puede usarse en grupos.*"
      }, { quoted: msg });
      return;
    }

    const metadata = await conn.groupMetadata(chatId);
    const participant = metadata.participants.find(p => p.id.includes(sender));
    const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
    const isOwner = global.owner?.some(([id]) => id === sender);

    if (!isAdmin && !isOwner && !isBotMessage) {
      await conn.sendMessage(chatId, {
        text: "🚫 *Este comando solo puede usarlo un administrador o el dueño del bot.*"
      }, { quoted: msg });
      return;
    }

    const mentionIds = metadata.participants.map(p => p.id);
    const mentionList = mentionIds.map(id => `➤ @${id.split("@")[0]}`).join("\n");
    const extraMsg = args.join(" ");

    let finalMsg = `╭─⌈ 🔊 𝐓𝐀𝐆𝐀𝐋𝐋 𝐌𝐎𝐃𝐄 ⌋──╮\n`;
    finalMsg += `│ 🤖 *✧ Sᵘᵏⁱ 3.0 ᴮᵒᵗ ✧*\n`;
    finalMsg += `│ 👤 *Invocador:* @${sender}\n`;
    if (extraMsg.length > 0) {
      finalMsg += `│ 💬 *Mensaje:* ${extraMsg}\n`;
    }
    finalMsg += `╰──────────────╯\n\n`;
    finalMsg += `📢 *Etiquetando a todos los miembros...*\n\n`;
    finalMsg += mentionList;

    await conn.sendMessage(chatId, {
      image: { url: "https://cdn.russellxz.click/034af9ef.jpeg" },
      caption: finalMsg,
      mentions: mentionIds
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ Error en el comando tagall:", err);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ Ocurrió un error al ejecutar el comando tagall."
    }, { quoted: msg });
  }
};

handler.command = ["tagall", "invocar", "todos"];
module.exports = handler;
