const fs = require("fs");
const path = require("path");

const unwarnsHandler = async (msg, { conn, args }) => {
  try {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const sender = msg.key.participant || msg.key.remoteJid;
    const adminList = await conn.groupMetadata(chatId).then(meta => meta.participants.filter(p => p.admin === "admin" || p.admin === "superadmin").map(p => p.id));
    const isAdmin = adminList.includes(sender);

    if (!isGroup) {
      return await conn.sendMessage(chatId, {
        text: "⚠️ *Este comando solo puede usarse en grupos.*"
      }, { quoted: msg });
    }

    if (!isAdmin) {
      return await conn.sendMessage(chatId, {
        text: "❌ *Solo administradores pueden usar este comando.*"
      }, { quoted: msg });
    }

    const dbFolder = path.resolve("./database");
    const warnPath = path.join(dbFolder, "advertencias.json");

    if (!fs.existsSync(warnPath)) {
      return await conn.sendMessage(chatId, {
        text: "⚠️ *No hay advertencias registradas.*"
      }, { quoted: msg });
    }

    const warnData = JSON.parse(fs.readFileSync(warnPath));
    const target = args[0]?.replace(/[@]/g, "") || null;

    if (!target) {
      // Elimina todas las advertencias del grupo
      if (warnData[chatId]) {
        delete warnData[chatId];
        fs.writeFileSync(warnPath, JSON.stringify(warnData, null, 2));
        return await conn.sendMessage(chatId, {
          text: "✅ *Todas las advertencias del grupo han sido eliminadas.*"
        }, { quoted: msg });
      } else {
        return await conn.sendMessage(chatId, {
          text: "⚠️ *No hay advertencias registradas en este grupo.*"
        }, { quoted: msg });
      }
    } else {
      // Restablece las advertencias de un usuario específico
      if (warnData[chatId] && warnData[chatId][target]) {
        delete warnData[chatId][target];
        fs.writeFileSync(warnPath, JSON.stringify(warnData, null, 2));
        return await conn.sendMessage(chatId, {
          text: `✅ *Las advertencias del usuario @${target} han sido eliminadas.*`,
          mentions: [target]
        }, { quoted: msg });
      } else {
        return await conn.sendMessage(chatId, {
          text: `⚠️ *El usuario @${target} no tiene advertencias registradas.*`,
          mentions: [target]
        }, { quoted: msg });
      }
    }
  } catch (err) {
    console.error("❌ Error en comando unwarns:", err);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Hubo un error al ejecutar el comando. Inténtalo de nuevo.*"
    }, { quoted: msg });
  }
};

unwarnsHandler.command = ["unwarns"];
module.exports = unwarnsHandler;