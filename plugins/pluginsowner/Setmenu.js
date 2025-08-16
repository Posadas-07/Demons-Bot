// plugins/setmenu.js
const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

/** Extrae texto del mensaje citado (conserva saltos y espacios) */
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
  const chatId   = msg.key.remoteJid;
  const senderId = msg.key.participant || msg.key.remoteJid;
  const numero   = (senderId || "").replace(/[^0-9]/g, "");
  const fromMe   = !!msg.key.fromMe;
  const botID    = (conn.user?.id || "").replace(/[^0-9]/g, "");

  // 🔐 Permisos globales (igual estilo que addowner):
  if (!(typeof global.isOwner === "function" ? global.isOwner(numero) : false) && !fromMe && numero !== botID) {
    try { await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }); } catch {}
    return conn.sendMessage(chatId, {
      text: "🚫 Este comando solo puede usarlo un *Owner* o el *mismo bot*."
    }, { quoted: msg });
  }

  // ——— Texto crudo (NO trim agresivo) ———
  // Si el dispatcher te pasa `text`, úsalo. Si no, une args como fallback.
  const textoArg  = typeof text === "string" ? text : (Array.isArray(args) ? args.join(" ") : "");
  // Quita solo el espacio inicial habitual tras el comando, si existiera.
  const textoCrudo = textoArg.startsWith(" ") ? textoArg.slice(1) : textoArg;

  // Texto de respuesta citado (si no se escribió nada tras el comando)
  const quotedText = !textoCrudo ? getQuotedText(msg) : null;

  // ¿Imagen citada?
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quotedImage = ctx?.quotedMessage?.imageMessage;

  if (!textoCrudo && !quotedText && !quotedImage) {
    return conn.sendMessage(chatId, {
      text: `✏️ *Uso:*\n• .setmenu <texto>  (admite multilínea si respondes a un mensaje de texto)\n• O *responde a una imagen* y escribe: .setmenu <texto opcional>`
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
      console.error("[setmenu] error leyendo imagen citada:", e);
    }
  }

  const textoFinal = (textoCrudo || quotedText || "");

  // 💾 Guardar GLOBAL en setmenu.json
  const filePath = path.resolve("./setmenu.json");
  let data = {};
  if (fs.existsSync(filePath)) {
    try { data = JSON.parse(fs.readFileSync(filePath, "utf-8")); } catch {}
  }

  data.texto  = textoFinal;    // conserva saltos/espacios
  data.imagen = imagenBase64;  // null si no se citó imagen
  data.updatedAt = Date.now();

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  try { await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }); } catch {}
  return conn.sendMessage(chatId, {
    text: `✅ *MENÚ global actualizado.*\n${
      textoFinal ? "• Texto: guardado" : "• Texto: (vacío)"
    }\n${
      imagenBase64 ? "• Imagen: guardada" : "• Imagen: (no enviada)"
    }`
  }, { quoted: msg });
};

handler.command = ["setmenu"];
module.exports = handler;
