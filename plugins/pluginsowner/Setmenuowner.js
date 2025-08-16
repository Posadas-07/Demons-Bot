// plugins/setmenuowner.js
const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const DIGITS = (s = "") => String(s).replace(/\D/g, "");

function isOwnerByNumber(num) {
  if (typeof global.isOwner === "function") return global.isOwner(num);
  return Array.isArray(global.owner) && global.owner.some(([id]) => id === num);
}

/** Texto del mensaje citado (mantiene saltos/espacios) */
function getQuotedText(msg) {
  const q = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!q) return null;
  return (
    q.conversation ||
    q?.extendedTextMessage?.text ||
    q?.ephemeralMessage?.message?.conversation ||
    q?.ephemeralMessage?.message?.extendedTextMessage?.text ||
    q?.viewOnceMessageV2?.message?.conversation ||
    q?.viewOnceMessageV2?.message?.extendedTextMessage?.text ||
    q?.viewOnceMessageV2Extension?.message?.conversation ||
    q?.viewOnceMessageV2Extension?.message?.extendedTextMessage?.text ||
    null
  );
}

const handler = async (msg, { conn, args, text }) => {
  const chatId    = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNum = DIGITS(senderJid);
  const fromMe    = !!msg.key.fromMe;

  // 🔐 Permisos: solo owners o el mismo bot
  const botNum = DIGITS(conn.user?.id || "");
  const owner  = isOwnerByNumber(senderNum);
  if (!owner && !fromMe && senderNum !== botNum) {
    try { await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }); } catch {}
    return conn.sendMessage(chatId, {
      text: "🚫 Este comando solo puede usarlo un *Owner* o el *bot*.",
    }, { quoted: msg });
  }

  // ✏️ Texto crudo (no recortar)
  const textoArg  = typeof text === "string" ? text : (Array.isArray(args) ? args.join(" ") : "");
  const textoUser = textoArg.startsWith(" ") ? textoArg.slice(1) : textoArg;

  // Contexto posible imagen citada
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quotedImage = ctx?.quotedMessage?.imageMessage;

  // Si no hay texto, intentar tomar del citado
  const quotedText = !textoUser ? getQuotedText(msg) : null;

  if (!textoUser && !quotedText && !quotedImage) {
    try { await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }); } catch {}
    return conn.sendMessage(chatId, {
      text: "✏️ Usa: *setmenuowner <texto>* (multilínea permitido)\nO responde a una *imagen* con: *setmenuowner <texto>*",
    }, { quoted: msg });
  }

  // Descargar imagen si fue citada
  let imagenBase64 = null;
  if (quotedImage) {
    try {
      const stream = await downloadContentFromMessage(quotedImage, "image");
      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      imagenBase64 = buffer.toString("base64");
    } catch (e) {
      console.error("[setmenuowner] error leyendo imagen citada:", e);
    }
  }

  const textoFinal = (textoUser || quotedText || "");

  // 💾 Guardar en setmenu.json (global)
  const filePath = path.resolve("./setmenu.json");
  const data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};

  data.texto_owner  = textoFinal;      // texto exacto
  data.imagen_owner = imagenBase64;    // null si no hay

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  try { await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }); } catch {}
  return conn.sendMessage(chatId, { text: "✅ *C-Menu Owner* actualizado globalmente." }, { quoted: msg });
};

handler.command = ["setmenuowner"];
handler.tags = ["menu"];
handler.help = ["setmenuowner <texto> (o respondiendo a imagen)"];

module.exports = handler;
