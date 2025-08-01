const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");
  const isFromMe = msg.key.fromMe;

  if (!chatId.endsWith("@g.us")) {
    await conn.sendMessage(chatId, {
      text: "❌ *Este comando solo funciona en grupos.*"
    }, { quoted: msg });
    return;
  }

  const metadata = await conn.groupMetadata(chatId);
  const participantes = metadata.participants;

  const isAdmin = participantes.find(p => p.id.includes(senderId))?.admin;
  const ownerPath = path.resolve("owner.json");
  const owners = fs.existsSync(ownerPath) ? JSON.parse(fs.readFileSync(ownerPath)) : [];
  const isOwner = owners.some(([id]) => id === senderId);

  if (!isAdmin && !isOwner && !isFromMe) {
    await conn.sendMessage(chatId, {
      text: "⛔ *Solo administradores o owners pueden usar este comando.*"
    }, { quoted: msg });
    return;
  }

  // Obtener mencionados o citado
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;

  const targets = new Set(mentioned);
  if (quotedJid) targets.add(quotedJid);

  if (targets.size === 0) {
    await conn.sendMessage(chatId, {
      text: "📌 *Debes mencionar o responder al mensaje del usuario que deseas expulsar.*\n\nEjemplo: *.kick @usuario* o responde a su mensaje con *.kick*"
    }, { quoted: msg });
    return;
  }

  const resultados = [];

  for (const id of targets) {
    const targetId = id.replace(/[^0-9]/g, "");
    const isTargetAdmin = participantes.find(p => p.id.includes(targetId))?.admin;
    const isTargetOwner = owners.some(([id]) => id === targetId);

    if (isTargetAdmin || isTargetOwner) {
      resultados.push(`⚠️ *No se puede expulsar a @${targetId} (admin/owner).*`);
      continue;
    }

    try {
      await conn.groupParticipantsUpdate(chatId, [id], "remove");
      resultados.push(`✅ *Usuario @${targetId} expulsado.*`);
    } catch (err) {
      resultados.push(`❌ *Error al expulsar a @${targetId}.*`);
    }
  }

  await conn.sendMessage(chatId, {
    text: resultados.join("\n"),
    mentions: Array.from(targets)
  }, { quoted: msg });

  await conn.sendMessage(chatId, {
    react: { text: "👢", key: msg.key }
  });
};

handler.command = ["kick"];
module.exports = handler;
