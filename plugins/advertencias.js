const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");

  if (!isGroup) {
    return conn.sendMessage(chatId, {
      text: "📛 *Este comando solo está disponible en grupos.*",
    }, { quoted: msg });
  }

  const warnPath = path.resolve("./database/warns.json");
  if (!fs.existsSync(warnPath)) {
    return conn.sendMessage(chatId, {
      text: "❌ *No hay advertencias registradas en este grupo.*",
    }, { quoted: msg });
  }

  const warnData = JSON.parse(fs.readFileSync(warnPath));
  const warnsGroup = warnData[chatId];

  if (!warnsGroup || Object.keys(warnsGroup).length === 0) {
    return conn.sendMessage(chatId, {
      text: "✅ *Todos los miembros del grupo están sin advertencias.*",
    }, { quoted: msg });
  }

  let msgList = `╭─⬣「 *Advertencias del grupo* 」⬣\n`;
  const mentionList = [];

  for (const jid in warnsGroup) {
    const count = warnsGroup[jid];
    msgList += `│ 👤 @${jid.split("@")[0]} — ⚠️ ${count}/3\n`;
    mentionList.push(jid);
  }

  msgList += `╰─⬣`;

  await conn.sendMessage(chatId, {
    text: msgList.trim(),
    mentions: mentionList
  }, { quoted: msg });
};

handler.command = ["advertenciasgrupo"];
module.exports = handler;