// plugins/gay.js
const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  const textRaw = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).trim();

  const match = textRaw.match(/^[!./#]?\s*([a-zA-Z]+)/);
  const comando = match ? match[1].toLowerCase() : null;

  if (comando !== 'gay') return;

  let mentionedJid = null;
  try {
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      mentionedJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (msg.message?.contextInfo?.mentionedJid?.length) {
      mentionedJid = msg.message.contextInfo.mentionedJid[0];
    } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      mentionedJid = msg.message.extendedTextMessage.contextInfo.participant;
    } else if (msg.message?.contextInfo?.participant) {
      mentionedJid = msg.message.contextInfo.participant;
    }
  } catch {
    mentionedJid = null;
  }

  if (!mentionedJid) {
    return await conn.sendMessage(chatId, {
      text: `❗ *Uso incorrecto del comando.*\n\nDebes *etiquetar* a alguien o *responder su mensaje* para escanear.\n\n*Ejemplos válidos:*\n> .gay @usuario\n> .gay (respondiendo al mensaje de alguien)`,
    }, { quoted: msg });
  }

  const numero = mentionedJid.split('@')[0];

  // Si escanean al owner, respuesta especial
  const frasesOwner = [
    '🌈 @{user} es el arcoíris original. Nivel: Divino.',
    '👑 No puedes medir la gaydad del creador, @{user} dicta la escala.',
    '🚫 Escaneo fallido. @{user} es inmedible.',
    '🔒 El universo protege la energía de @{user}.',
    '⚠️ Resultados prohibidos para @{user}.'
  ];

  const isTaggedOwner = Array.isArray(global.owner) && global.owner.some(([id]) => id === numero);
  if (isTaggedOwner) {
    const frase = frasesOwner[Math.floor(Math.random() * frasesOwner.length)].replace('{user}', numero);
    return await conn.sendMessage(chatId, {
      text: frase,
      mentions: [mentionedJid]
    }, { quoted: msg });
  }

  // Frases para el remate
  const frasesGay = [
    '𐀔 Brillas más que el arcoíris.',
    '𐀔 Tu closet se quedó sin candado.',
    '𐀔 RuPaul estaría orgulloso.',
    '𐀔 Nadie usa mejor el glitter que tú.',
    '𐀔 El Pride se queda corto contigo.',
    '𐀔 Tu bandera ondea en cada paso.'
  ];

  const cierres = [
    '➢ Escaneo avalado por la comunidad 🌈.',
    '➢ Certificado por los dioses del glitter.',
    '➢ Validación oficial de la rainbow crew.',
    '➢ Registro eterno en los archivos LGBT.',
    '➢ Informe aprobado por el comité Pride.'
  ];

  const remate = frasesGay[Math.floor(Math.random() * frasesGay.length)];
  const cierre = cierres[Math.floor(Math.random() * cierres.length)];
  const porcentaje = Math.floor(Math.random() * 101);

  const textoFinal = `🌈 *ANÁLISIS COMPLETO DEL ESCÁNER GAY*\n\n*📡 RESULTADO:* @${numero} *es* 『 ${porcentaje}% 』 GAY 🌐\n\n> ${remate}\n\n${cierre}`;

  await conn.sendMessage(chatId, {
    text: textoFinal,
    mentions: [mentionedJid]
  }, { quoted: msg });
};

handler.command = ['gay'];
handler.tags = ['diversión'];
handler.help = ['gay @usuario o responde'];
handler.group = true;
handler.register = true;

module.exports = handler;