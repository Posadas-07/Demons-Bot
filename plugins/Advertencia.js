const fs = require("fs");
const path = require("path");

const DIGITS = (s = "") => String(s).replace(/\D/g, "");

function lidParser(participants = []) {
  try {
    return participants.map(v => ({
      id: (typeof v?.id === "string" && v.id.endsWith("@lid") && v.jid) ? v.jid : v.id,
      admin: v?.admin ?? null,
      raw: v
    }));
  } catch {
    return participants || [];
  }
}

async function isAdminByNumber(conn, chatId, number) {
  try {
    const meta = await conn.groupMetadata(chatId);
    const raw  = Array.isArray(meta?.participants) ? meta.participants : [];
    const norm = lidParser(raw);

    const adminNums = new Set();
    for (let i = 0; i < raw.length; i++) {
      const r = raw[i], n = norm[i];
      const flag = (r?.admin === "admin" || r?.admin === "superadmin" ||
                    n?.admin === "admin" || n?.admin === "superadmin");
      if (flag) {
        [r?.id, r?.jid, n?.id].forEach(x => {
          const d = DIGITS(x || "");
          if (d) adminNums.add(d);
        });
      }
    }
    return adminNums.has(number);
  } catch {
    return false;
  }
}

const handler = async (msg, { conn, command }) => {
  const chatId   = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderNo = DIGITS(senderId);
  const fromMe   = !!msg.key.fromMe;
  const isOwner  = (typeof global.isOwner === "function") ? global.isOwner(senderId) : 
                   (Array.isArray(global.owner) && global.owner.some(([id]) => id === senderNo));

  const isGroup  = chatId.endsWith("@g.us");
  if (!isGroup) {
    return conn.sendMessage(chatId, {
      text: "📛 *Este comando solo está disponible en grupos.*",
    }, { quoted: msg });
  }

  const isAdmin = await isAdminByNumber(conn, chatId, senderNo);
  if (!isAdmin && !isOwner && !fromMe) {
    return conn.sendMessage(chatId, {
      text: "🚫 *Permiso denegado*\nSolo los *admins* o el *dueño del bot* pueden usar este comando.",
    }, { quoted: msg });
  }

  const context = msg.message?.extendedTextMessage?.contextInfo;
  const mentionedJid = Array.isArray(context?.mentionedJid) ? context.mentionedJid : [];

  let target = null;
  if (context?.participant) target = context.participant;
  else if (mentionedJid.length > 0) target = mentionedJid[0];

  if (!target) {
    return conn.sendMessage(chatId, {
      text: "📍 *Debes responder o mencionar al usuario que deseas advertir o quitar advertencia.*",
    }, { quoted: msg });
  }

  const targetNum = DIGITS(target);
  if (Array.isArray(global.owner) && global.owner.some(([id]) => id === targetNum)) {
    return conn.sendMessage(chatId, {
      text: "❌ *No puedes usar este comando con el dueño del bot.*",
    }, { quoted: msg });
  }

  // === ASEGURAR QUE LA CARPETA Y EL ARCHIVO EXISTAN ===
  const dbFolder = path.resolve("./database");
  const warnPath = path.join(dbFolder, "advertencias.json");

  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
  }

  if (!fs.existsSync(warnPath)) {
    fs.writeFileSync(warnPath, JSON.stringify({}, null, 2));
  }

  const warnData = JSON.parse(fs.readFileSync(warnPath));

  if (!warnData[chatId]) warnData[chatId] = {};
  if (!warnData[chatId][target]) warnData[chatId][target] = 0;

  // === APLICAR ADVERTENCIA ===
  if (command === "advertencia") {
    warnData[chatId][target] += 1;
    const totalWarns = warnData[chatId][target];
    fs.writeFileSync(warnPath, JSON.stringify(warnData, null, 2));

    if (totalWarns >= 3) {
      await conn.sendMessage(chatId, {
        text:
`❌ *Usuario expulsado por acumulación de advertencias.*

╭─⬣「 *Expulsado* 」⬣
│ 👤 Usuario: @${targetNum}
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
│ 👤 Usuario: @${targetNum}
│ ⚠️ Advertencias: ${totalWarns}/3
╰─⬣`,
        mentions: [target]
      }, { quoted: msg });
    }
  }

  // === QUITAR ADVERTENCIA ===
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
│ 👤 Usuario: @${targetNum}
│ ⚠️ Advertencias: ${totalWarns}/3
╰─⬣`,
      mentions: [target]
    }, { quoted: msg });
  }
};

handler.command = ["advertencia", "quitaradvertencia"];
module.exports = handler;