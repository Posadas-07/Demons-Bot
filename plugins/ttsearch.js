const axios = require("axios");

let cacheTikTok = {};
let usosPorUsuarioTT = {};

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNum = sender.replace(/[^0-9]/g, "");

  const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
  const cleanBody = body.trim();

  const comandos = ["ttsearch", "tiktoks", "tiktoksearch"];
  const usedPrefix = ".";

  const match = cleanBody.match(new RegExp(`^\\${usedPrefix}\\s*(${comandos.join("|")})`, "i"));
  if (!match) return;

  const text = cleanBody.slice(match[0].length).trim();

  const isOwner = global.owner?.some(([num]) => num === senderNum);

  // Cooldown: 15 minutos excepto para owner
  if (!isOwner && usosPorUsuarioTT[senderNum] && Date.now() < usosPorUsuarioTT[senderNum]) {
    const minutos = Math.ceil((usosPorUsuarioTT[senderNum] - Date.now()) / 60000);
    return conn.sendMessage(chatId, {
      text: `🕒 Espera *${minutos} minuto(s)* antes de volver a usar este comando.`
    }, { quoted: msg });
  }

  if (!text) {
    return conn.sendMessage(chatId, {
      text:
`📌 𝗠𝗼𝗱𝗼 𝗱𝗲 𝘂𝘀𝗼 𝗱𝗲𝗹 𝗰𝗼𝗺𝗮𝗻𝗱𝗼:

🔍 Escribe el comando seguido del tema que quieras buscar.

Ejemplo:
${usedPrefix}ttsearch futbol
${usedPrefix}ttsearch edits anime
${usedPrefix}ttsearch carros deportivos`
    }, { quoted: msg });
  }

  try {
    await conn.sendMessage(chatId, {
      react: { text: "🔍", key: msg.key }
    });

    const { data: response } = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${encodeURIComponent(text)}`);
    let results = response?.data;

    if (!results || results.length === 0) {
      return conn.sendMessage(chatId, {
        text: "😔 *No se encontraron resultados para tu búsqueda.*"
      }, { quoted: msg });
    }

    results.sort(() => Math.random() - 0.5);
    const topResults = results.slice(0, 4);

    const { nowm, author, duration, likes } = topResults[0];

    const caption = `
╔═『𝗧𝗜𝗞𝗧𝗢𝗞 𝗗𝗘𝗦𝗖𝗔𝗥𝗚𝗔𝗗𝗢 』═╗

╠🧑🏻‍💻 𝙰𝚞𝚝𝚘𝚛: ${author || "Desconocido"}
╠⏰ 𝙳𝚞𝚛𝚊𝚌𝚒𝗈𝗇: ${duration || "Desconocida"}
╠❤️ 𝙻𝗂𝗄𝖾𝗌: ${likes || "0"}
╠🔗 𝙻𝗂𝗇𝗄: ${nowm}

> ʀᴇᴀᴄᴄɪᴏɴᴀ ᴘᴀʀᴀ ᴇʟ sɪɢᴜɪᴇɴᴛᴇ ᴠɪᴅᴇ𝗈`.trim();

    const sentMsg = await conn.sendMessage(chatId, {
      video: { url: nowm },
      caption,
      mimetype: "video/mp4"
    }, { quoted: msg });

    await conn.sendMessage(chatId, {
      react: { text: "✅", key: sentMsg.key }
    });

    cacheTikTok[sentMsg.key.id] = {
      chatId,
      results: topResults,
      index: 1,
      sender,
      usos: 0
    };

    if (!isOwner) {
      usosPorUsuarioTT[senderNum] = Date.now() + 15 * 60 * 1000;
    }

    conn.ev.on("messages.upsert", async ({ messages }) => {
      const m = messages[0];
      if (!m?.message?.reactionMessage) return;

      const reaction = m.message.reactionMessage;
      const reactedMsgId = reaction.key?.id;
      const user = m.key.participant || m.key.remoteJid;

      if (!cacheTikTok[reactedMsgId]) return;
      if (user !== cacheTikTok[reactedMsgId].sender) return;

      const state = cacheTikTok[reactedMsgId];
      const { results, index, usos } = state;

      if (usos >= 3) {
        return conn.sendMessage(chatId, {
          text: "✅ Ya viste los 3 videos disponibles. Usa el comando nuevamente más tarde."
        });
      }

      if (index >= results.length) {
        return conn.sendMessage(chatId, {
          text: "✅ Ya no hay más resultados para mostrar."
        });
      }

      const { nowm, author, duration, likes } = results[index];

      const newCaption = `
╔═『𝗧𝗜𝗞𝗧𝗢𝗞 𝗗𝗘𝗦𝗖𝗔𝗥𝗚𝗔𝗗𝗢 』═╗

╠🧑🏻‍💻 𝙰𝚞𝚝𝚘𝚛: ${author || "Desconocido"}
╠⏰ 𝙳𝚞𝚛𝚊𝚌𝚒𝗈𝗇: ${duration || "Desconocida"}
╠❤️ 𝙻𝗂𝗄𝖾𝗌: ${likes || "0"}
╠🔗 𝙻𝗂𝗇𝗄: ${nowm}

> ʀᴇᴀᴄᴄɪᴏɴᴀ ᴘᴀʀᴀ ᴏᴛʀᴏ ᴠɪᴅᴇᴏ 𝘀ɪ𝓰ᴜɪᴇɴᴛᴇ`.trim();

      const newMsg = await conn.sendMessage(chatId, {
        video: { url: nowm },
        caption: newCaption,
        mimetype: "video/mp4"
      });

      await conn.sendMessage(chatId, {
        react: { text: "✅", key: newMsg.key }
      });

      cacheTikTok[newMsg.key.id] = {
        chatId,
        results,
        index: index + 1,
        sender: user,
        usos: usos + 1
      };

      delete cacheTikTok[reactedMsgId];
    });

  } catch (err) {
    console.error(err);
    return conn.sendMessage(chatId, {
      text: "❌ Error al buscar o enviar los videos:\n" + err.message
    }, { quoted: msg });
  }
};

handler.command = ["ttsearch", "tiktoks", "tiktoksearch"];
handler.tags = ["buscador"];
handler.help = ["ttsearch <tema>"];
handler.register = true;

module.exports = handler;