const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderId = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");

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

  if (!isAdmin && !isOwner) {
    await conn.sendMessage(chatId, {
      text: "⛔ *Solo administradores o dueños del bot pueden usar este comando.*"
    }, { quoted: msg });
    return;
  }

  const limite = parseInt(args[0]);
  if (isNaN(limite)) {
    await conn.sendMessage(chatId, {
      text: "❓ *Debes escribir un número de mensajes para detectar fantasmas.*\n\nEjemplo: `.fantasmas 10`"
    }, { quoted: msg });
    return;
  }

  const filePath = path.resolve("setwelcome.json");
  const data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};
  const chatData = data[chatId]?.chatCount || {};

  const fantasmas = metadata.participants
    .filter(p => {
      const jid = p.id;
      const count = parseInt(chatData[jid]) || 0;
      return count < limite;
    })
    .map(p => `@${p.id.split("@")[0]}`);

  const advertencia =
    `⚠️ *Advertencia Importante*\n` +
    `Este conteo solo se basa en los mensajes detectados desde que *La Suki Bot* fue agregada al grupo.\n` +
    `No refleja actividad real de todo el historial del grupo. Podría mostrar como fantasmas a miembros valiosos que simplemente no han hablado aún.\n\n` +
    `Usa este comando con inteligencia 💡. Si planeas expulsar con *.fankick*, asegúrate de entender este límite.\n\n`;

  if (fantasmas.length === 0) {
    await conn.sendMessage(chatId, {
      text: `✅ *Todos los miembros han enviado más de ${limite} mensajes.*`
    }, { quoted: msg });
    return;
  }

  const texto =
    advertencia +
    `👻 *Total de fantasmas detectados:* ${fantasmas.length} usuarios\n` +
    `📝 *Esta es la lista de los miembros que han enviado menos de ${limite} mensajes en el grupo:*\n\n` +
    `╭───────────────◆\n` +
    fantasmas.map((u, i) => `│ ${i + 1}. ${u}`).join("\n") +
    `\n╰───────────────◆\n\n` +
    `🗑️ Usa *.fankick ${limite}* para eliminar automáticamente a estos inactivos.`;

  await conn.sendMessage(chatId, {
    text: texto,
    mentions: fantasmas.map(u => u.replace("@", "") + "@s.whatsapp.net")
  }, { quoted: msg });
};

handler.command = ["fantasmas"];
module.exports = handler;
