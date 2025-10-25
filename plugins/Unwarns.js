const fs = require("fs");
const path = require("path");

// Función para obtener solo los dígitos de un JID
const DIGITS = (s = "") => String(s || "").replace(/\D/g, "");

const unwarnsHandler = async (msg, { conn, args }) => {
  try {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const isFromMe = !!msg.key.fromMe;

    await conn.sendMessage(chatId, { react: { text: "♻️", key: msg.key } }).catch(() => {});

    if (!isGroup) {
      return conn.sendMessage(chatId, { text: "⚠️ *Este comando solo puede usarse en grupos.*" }, { quoted: msg });
    }

    // Verificar el remitente
    const senderId = msg.key.participant || msg.key.remoteJid;
    const senderRealJid = typeof msg.realJid === "string"
      ? msg.realJid
      : (senderId?.endsWith?.("@s.whatsapp.net") ? senderId : null);
    const senderDigits = DIGITS(senderRealJid || senderId);

    // Verificación de dueño
    const isOwner = Array.isArray(global.owner) && global.owner.some(([id]) => id === senderDigits);

    // Obtener metadata del grupo
    let meta;
    try {
      meta = await conn.groupMetadata(chatId);
    } catch (e) {
      console.error("[unwarns] metadata error:", e);
      return conn.sendMessage(chatId, { text: "❌ No se pudo leer la metadata del grupo." }, { quoted: msg });
    }

    const participantes = Array.isArray(meta?.participants) ? meta.participants : [];

    // Verificación de administrador
    const authorCandidates = new Set([
      senderId,
      senderRealJid,
      `${senderDigits}@s.whatsapp.net`,
      `${senderDigits}@lid`
    ].filter(Boolean));

    const isAdmin = participantes.some(p => {
      const idsPosibles = [
        p?.id,
        (typeof p?.jid === "string" ? p.jid : "")
      ].filter(Boolean);

      const matchId = idsPosibles.some(id => authorCandidates.has(id) || DIGITS(id) === senderDigits);
      const rolOK = p?.admin === "admin" || p?.admin === "superadmin";
      return matchId && rolOK;
    });

    // Solo administradores, dueños o mensajes enviados por el bot pueden usar este comando
    if (!isAdmin && !isOwner && !isFromMe) {
      return conn.sendMessage(chatId, {
        text: "🚫 *Este comando solo puede ser usado por administradores o el dueño del bot.*"
      }, { quoted: msg });
    }

    // Ruta de la base de datos
    const dbFolder = path.resolve("./database");
    const warnPath = path.join(dbFolder, "advertencias.json");

    if (!fs.existsSync(warnPath)) {
      return await conn.sendMessage(chatId, {
        text: "⚠️ *No hay advertencias registradas.*"
      }, { quoted: msg });
    }

    const warnData = JSON.parse(fs.readFileSync(warnPath));

    // Obtener el usuario objetivo (citado o con @usuario)
    let target;
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      // Si hay mención, usamos al usuario mencionado
      target = DIGITS(msg.message.extendedTextMessage.contextInfo.mentionedJid[0]);
    } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      // Si el mensaje fue citado, usamos al autor del mensaje citado
      target = DIGITS(msg.message.extendedTextMessage.contextInfo.participant);
    } else if (args[0]) {
      // Si se pasa un argumento con @usuario, lo procesamos
      target = DIGITS(args[0]);
    }

    if (!target) {
      return await conn.sendMessage(chatId, {
        text: "⚠️ *Debes citar un mensaje o mencionar a un usuario para quitarle una advertencia.*"
      }, { quoted: msg });
    }

    if (warnData[chatId] && warnData[chatId][target]) {
      // Reducir advertencia en 1
      warnData[chatId][target] -= 1;

      // Si las advertencias llegan a 0, eliminamos el registro del usuario
      if (warnData[chatId][target] <= 0) {
        delete warnData[chatId][target];
      }

      fs.writeFileSync(warnPath, JSON.stringify(warnData, null, 2));

      return await conn.sendMessage(chatId, {
        text: `✅ *Se ha eliminado 1 advertencia del usuario @${target}.*`,
        mentions: [`${target}@s.whatsapp.net`]
      }, { quoted: msg });
    } else {
      return await conn.sendMessage(chatId, {
        text: `⚠️ *El usuario @${target} no tiene advertencias registradas.*`,
        mentions: [`${target}@s.whatsapp.net`]
      }, { quoted: msg });
    }
  } catch (err) {
    console.error("❌ Error en el comando unwarns:", err);
    await conn.sendMessage(msg.key.remoteJid, { text: "❌ Ocurrió un error al ejecutar el comando unwarns." }, { quoted: msg });
  }
};

unwarnsHandler.command = ["unwarns"];
module.exports = unwarnsHandler;