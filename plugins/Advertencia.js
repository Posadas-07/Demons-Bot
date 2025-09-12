const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn, command }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderNum = senderId.replace(/[^0-9]/g, "");
  const isGroup = chatId.endsWith("@g.us");
  const isOwner = global.owner.some(([id]) => id === senderNum);

  if (!isGroup) {
    return conn.sendMessage(chatId, {
      text: "📛 *Este comando solo está disponible en grupos.*",
    }, { quoted: msg });
  }

  const metadata = await conn.groupMetadata(chatId);
  const isAdmin = metadata.participants.find(p => p.id === senderId)?.admin;

  if (!isAdmin && !isOwner) {
    return conn.sendMessage(chatId, {
      text: "🚫 *Permiso denegado*\nSolo los *admins* o el *dueño del bot* pueden usar este comando.",
    }, { quoted: msg });
  }

  const context = msg.message?.extendedTextMessage?.contextInfo;
  const mentionedJid = context?.mentionedJid || [];

  let target = null;

  if (context?.participant) {
    target = context.participant;
  } else if (mentionedJid.length > 0) {
    target = mentionedJid[0];
  }

  if (!target) {
    return conn.sendMessage(chatId, {
      text: "📍 *Debes responder o mencionar al usuario que deseas advertir o quitar advertencia.*",
    }, { quoted: msg });
  }

  const targetNum = target.replace(/[^0-9]/g, "");
  if (global.owner.some(([id]) => id === targetNum)) {
    return conn.sendMessage(chatId, {
      text: "❌ *No puedes usar este comando con el dueño del bot.*",
    }, { quoted: msg });
  }

  const warnPath = path.resolve("./database/warns.json");
  const warnData = fs.existsSync(warnPath) ? JSON.parse(fs.readFileSync(warnPath)) : {};
  if (!warnData[chatId]) warnData[chatId] = {};
  if (!warnData[chatId][target]) warnData[chatId][target] = 0;

  if (command === "advertencia") {
    warnData[chatId][target] += 1;
    const totalWarns = warnData[chatId][target];
    fs.writeFileSync(warnPath, JSON.stringify(warnData, null, 2));

    if (totalWarns >= 3) {
      await conn.sendMessage(chatId, {
        text:
`❌ *Usuario expulsado por acumulación de advertencias.*

╭─⬣「 *Expulsado* 」⬣
│ 👤 Usuario: @${target.split("@")[0]}
│ ⚠️ Advertencias: ${totalWarns}/3
╰─⬣`,
        mentions: [target]
      }, { quoted: msg });

      await conn.groupParticipantsUpdate(chatId, [target], "remove");
      warnData[chatId][target] = 0;
      fs.writeFileSync(warnPath, JSON.stringify(warnData, null, 2));
    } else {
      await conn.sendMessage(chatId, {
        text:
`⚠️ *Advertencia aplicada.*

╭─⬣「 *Advertencia* 」⬣
│ 👤 Usuario: @${target.split("@")[0]}
│ ⚠️ Advertencias: ${totalWarns}/3
╰─⬣`,
        mentions: [target]
      }, { quoted: msg });
    }
  }

  if (command === "quitaradvertencia") {
    if (warnData[chatId][target] === 0) {
      return conn.sendMessage(chatId, {
        text: `✅ *El usuario no tiene advertencias que quitar.*`,
      }, { quoted: msg });
    }

    warnData[chatId][target] -= 1;
    fs.writeFileSync(warnPath, JSON.stringify(warnData, null, 2));

    const totalWarns = warnData[chatId][target];
    await conn.sendMessage(chatId, {
      text:
`🗑️ *Advertencia eliminada.*

╭─⬣「 *Quitar advertencia* 」⬣
│ 👤 Usuario: @${target.split("@")[0]}
│ ⚠️ Advertencias: ${totalWarns}/3
╰─⬣`,
      mentions: [target]
    }, { quoted: msg });
  }
};

handler.command = ["advertencia", "quitaradvertencia"];
module.exports = handler;