const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderNum = senderId.replace(/[^0-9]/g, "");
  const isGroup = chatId.endsWith("@g.us");
  const fromMe = msg.key.fromMe;
  const isOwner = global.isOwner(senderId);

  if (!isGroup) {
    return conn.sendMessage(chatId, {
      text: "❌ *Este comando solo puede usarse en grupos.*"
    }, { quoted: msg });
  }

  const metadata = await conn.groupMetadata(chatId);
  const isAdmin = metadata.participants.find(p => p.id === senderId)?.admin;

  if (!isAdmin && !isOwner && !fromMe) {
    return conn.sendMessage(chatId, {
      text: "⛔ *Solo administradores o dueños del bot pueden usar este comando.*"
    }, { quoted: msg });
  }

  // 🧠 Detectar usuarios a desmutear
  const context = msg.message?.extendedTextMessage?.contextInfo;
  const mentionedJids = context?.mentionedJid || [];
  const targetReply = context?.participant;

  const targets = new Set();

  if (targetReply) targets.add(targetReply);
  if (mentionedJids.length) mentionedJids.forEach(j => targets.add(j));

  if (!targets.size) {
    return conn.sendMessage(chatId, {
      text: "⚠️ *Responde o menciona a uno o más usuarios para desmutear.*"
    }, { quoted: msg });
  }

  const welcomePath = path.resolve("setwelcome.json");
  const welcomeData = fs.existsSync(welcomePath)
    ? JSON.parse(fs.readFileSync(welcomePath, "utf-8"))
    : {};

  welcomeData[chatId] = welcomeData[chatId] || {};
  welcomeData[chatId].muted = welcomeData[chatId].muted || [];

  const desmuteados = [];
  const noMuteados = [];

  for (const jid of targets) {
    const num = jid.replace(/[^0-9]/g, "");

    if (welcomeData[chatId].muted.includes(jid)) {
      welcomeData[chatId].muted = welcomeData[chatId].muted.filter(u => u !== jid);
      desmuteados.push(`@${num}`);
    } else {
      noMuteados.push(`@${num}`);
    }
  }

  fs.writeFileSync(welcomePath, JSON.stringify(welcomeData, null, 2));

  let texto = "";

  if (desmuteados.length > 0) {
    texto += `🔊 *Usuarios desmuteados correctamente:*\n${desmuteados.map((u, i) => `${i + 1}. ${u}`).join("\n")}\n\n`;
  }

  if (noMuteados.length > 0) {
    texto += `ℹ️ *Estos usuarios no estaban muteados:*\n${noMuteados.map((u, i) => `${i + 1}. ${u}`).join("\n")}`;
  }

  await conn.sendMessage(chatId, {
    text: texto.trim(),
    mentions: [...desmuteados, ...noMuteados].map(u => u.replace("@", "") + "@s.whatsapp.net")
  }, { quoted: msg });
};

handler.command = ["unmute"];
module.exports = handler;
