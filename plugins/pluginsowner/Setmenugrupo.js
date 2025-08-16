// plugins/setmenugrupo.js
const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const DIGITS = (s = "") => String(s).replace(/\D/g, "");

const handler = async (msg, { conn, args, text }) => {
  const chatId    = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNum = DIGITS(senderJid);
  const fromMe    = !!msg.key.fromMe;

  // 🔐 Permisos globales: solo owners o el bot
  const isOwner = (typeof global.isOwner === "function")
    ? global.isOwner(senderNum)
    : (Array.isArray(global.owner) && global.owner.some(([id]) => id === senderNum));

  if (!isOwner && !fromMe) {
    return conn.sendMessage(chatId, {
      text: "🚫 *Solo un Owner o el bot pueden configurar el C-Menu Grupo (global).*"
    }, { quoted: msg });
  }

  try { await conn.sendMessage(chatId, { react: { text: "🛠️", key: msg.key } }); } catch {}

  // — Texto crudo (conserva saltos/espacios)
  const textoArg   = typeof text === "string" ? text : (Array.isArray(args) ? args.join(" ") : "");
  const textoCrudo = textoArg.startsWith(" ") ? textoArg.slice(1) : textoArg;

  // ¿Imagen citada?
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quotedImage = ctx?.quotedMessage?.imageMessage;

  // Si no hay texto y tampoco hay imagen, pide uso
  if (!textoCrudo && !quotedImage) {
    return conn.sendMessage(chatId, {
      text: "✏️ *Uso:*\n• `setmenugrupo <texto>` (multilínea permitido)\n• O responde a una *imagen* y escribe: `setmenugrupo <texto>`"
    }, { quoted: msg });
  }

  // Descargar imagen si viene citada
  let imagenBase64 = null;
  if (quotedImage) {
    try {
      const stream = await downloadContentFromMessage(quotedImage, "image");
      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      imagenBase64 = buffer.toString("base64");
    } catch (e) {
      console.error("[setmenugrupo] error leyendo imagen citada:", e);
    }
  }

  // 💾 Guardado GLOBAL en setmenu.json
  const filePath = path.resolve("./setmenu.json");
  let data = {};
  try {
    data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};
  } catch {
    data = {};
  }

  data.texto_grupo  = textoCrudo || data.texto_grupo || ""; // mantiene si no envían texto esta vez
  if (imagenBase64 !== null) data.imagen_grupo = imagenBase64; // solo sobrescribe si vino imagen

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  try { await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }); } catch {}
  return conn.sendMessage(chatId, { text: "✅ *C-Menu Grupo (global) actualizado.*" }, { quoted: msg });
};

handler.command = ["setmenugrupo"];
handler.help = ["setmenugrupo <texto> (o respondiendo a imagen)"];
handler.tags = ["menu"];
module.exports = handler;
