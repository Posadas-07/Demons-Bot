const fs = require("fs");
const path = require("path");

// 🧩 Extrae solo dígitos del JID
const DIGITS = (s = "") => String(s || "").replace(/\D/g, "");

const unwarnsHandler = async (m, { conn, args }) => {
  try {
    const chatId = m.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const fromMe = !!m.key.fromMe;

    await conn.sendMessage(chatId, { react: { text: "♻️", key: m.key } }).catch(() => {});

    if (!isGroup)
      return conn.sendMessage(chatId, { text: "⚠️ *Este comando solo puede usarse en grupos.*" }, { quoted: m });

    // 🧠 Identificar remitente
    const senderId = m.key.participant || m.key.remoteJid;
    const senderDigits = DIGITS(senderId);

    // 🧍‍♂️ Verificar si es dueño o admin
    const isOwner = Array.isArray(global.owner) && global.owner.some(([id]) => id === senderDigits);

    let meta;
    try {
      meta = await conn.groupMetadata(chatId);
    } catch (e) {
      console.error("[unwarns] Error metadata:", e);
      return conn.sendMessage(chatId, { text: "❌ No se pudo obtener la información del grupo." }, { quoted: m });
    }

    const participantes = Array.isArray(meta?.participants) ? meta.participants : [];
    const isAdmin = participantes.some(p =>
      (p?.id && DIGITS(p.id) === senderDigits) && (p?.admin === "admin" || p?.admin === "superadmin")
    );

    // 🚫 Solo admins, dueño o el bot
    if (!isAdmin && !isOwner && !fromMe)
      return conn.sendMessage(chatId, {
        text: "🚫 *Solo administradores o el dueño del bot pueden usar este comando.*"
      }, { quoted: m });

    // 📂 Ruta del archivo de advertencias
    const dbFolder = path.resolve("./database");
    const warnPath = path.join(dbFolder, "advertencias.json");

    if (!fs.existsSync(warnPath))
      return conn.sendMessage(chatId, { text: "⚠️ *No hay advertencias registradas aún.*" }, { quoted: m });

    const warnData = JSON.parse(fs.readFileSync(warnPath));

    // 🎯 Identificar al usuario objetivo (mencionado, citado o argumento)
    let target;
    const context = m.message?.extendedTextMessage?.contextInfo;

    if (context?.mentionedJid?.length) {
      target = DIGITS(context.mentionedJid[0]);
    } else if (context?.participant) {
      target = DIGITS(context.participant);
    } else if (args[0]) {
      target = DIGITS(args[0]);
    }

    if (!target)
      return conn.sendMessage(chatId, {
        text: "⚠️ *Debes mencionar, citar o escribir el número del usuario al que quieres quitarle una advertencia.*"
      }, { quoted: m });

    // 🔍 Verificar si el usuario tiene advertencias
    if (warnData[chatId] && warnData[chatId][`${target}@s.whatsapp.net`]) {
      const userJid = `${target}@s.whatsapp.net`;
      warnData[chatId][userJid] -= 1;

      // 🧹 Si baja a 0 o menos, eliminar registro
      if (warnData[chatId][userJid] <= 0) {
        delete warnData[chatId][userJid];
      }

      // 📝 Guardar cambios
      fs.writeFileSync(warnPath, JSON.stringify(warnData, null, 2));

      const restantes = warnData[chatId][userJid] || 0;

      await conn.sendMessage(chatId, {
        text: `✅ *Se ha eliminado una advertencia del usuario @${target}.*\nAhora tiene *${restantes} advertencia(s) por ser creador de SPAM*.`,
        mentions: [userJid]
      }, { quoted: m });

    } else {
      await conn.sendMessage(chatId, {
        text: `⚠️ *El usuario @${target} no tiene advertencias registradas.*`,
        mentions: [`${target}@s.whatsapp.net`]
      }, { quoted: m });
    }

  } catch (err) {
    console.error("❌ Error en comando unwarns:", err);
    await conn.sendMessage(m.key.remoteJid, { text: "❌ Error al ejecutar el comando `unwarns`." }, { quoted: m });
  }
};

// 📦 Configuración del comando
unwarnsHandler.command = ["unwarns", "unwarn"];
unwarnsHandler.tags = ["group"];
unwarnsHandler.help = ["unwarns @usuario"];
unwarnsHandler.group = true;

module.exports = unwarnsHandler;