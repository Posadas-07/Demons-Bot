  const chatId = msg.key.remoteJid;
  const fromUser = msg.key.participant || msg.key.remoteJid;

  const frasesOwner = [
    '🛡️ *Defensas activadas*\n@{user} no puede ser escaneado. Nivel: Dios supremo.',
    '👑 *Acceso denegado*\nIntentaste medir al Creador. Fallo crítico del sistema.',
    '🚫 Usuario intocable detectado.\n@{user} está fuera del alcance del gayómetro.',
    '🔒 Seguridad legendaria activa. @{user} está en modo inmortal.',
    '⚠️ El universo impide escanear al Owner.\nNi lo intentes otra vez.'
  ];

  const stickersOwner = [
    'https://cdn.russellxz.click/9087aa1c.webp',
    'https://cdn.russellxz.click/85a16aa5.webp',
    'https://cdn.russellxz.click/270edf17.webp',
    'https://cdn.russellxz.click/afd908e6.webp'
  ];

  const audioURL = 'https://cdn.russellxz.click/96beb11b.mp3';

  let mentionedJid;
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
      text: '🔍 *Etiqueta o responde a alguien para escanear su porcentaje gay.*',
    }, { quoted: msg });
  }

  const numero = mentionedJid.split('@')[0];

  const isTaggedOwner = Array.isArray(global.owner) && global.owner.some(([id]) => id === numero);
  if (isTaggedOwner) {
    const frase = frasesOwner[Math.floor(Math.random() * frasesOwner.length)].replace('{user}', numero);
    const sticker = stickersOwner[Math.floor(Math.random() * stickersOwner.length)];

    await conn.sendMessage(chatId, {
      text: frase,
      mentions: [mentionedJid]
    }, { quoted: msg });

    await conn.sendMessage(chatId, {
      sticker: { url: sticker }
    }, { quoted: msg });

    return;
  }

  const porcentaje = Math.floor(Math.random() * 101);

  const frasesFinales = [
    '𐀔 Tus chakras vibran con glitter.',
    '𐀔 Te vieron en el Pride bailando con estilo.',
    '𐀔 Eso ya no es sospecha, es escándalo confirmado.',
    '𐀔 Lo tuyo es arte, drama y tacones.',
    '𐀔 Si fueras más gay, serías el himno de Cher.',
    '𐀔 Eres más brillante que una bola disco.',
    '𐀔 Confirmado: gayómetro colapsó contigo.',
    '𐀔 Hollywood quiere hacer una serie sobre tu vida arcoíris.',
    '𐀔 Eres la inspiración de RuPaul.',
    '𐀔 Hasta el algoritmo te detecta como fabuloso.'
  ];

  const frasesCierre = [
    '➢ 𝑉𝑒𝓇𝒾𝒻𝒾𝒸𝒶𝒹ℴ 𝒸ℴ𝓃 𝓅𝓇ℯ𝒸𝒾𝓈𝒾ℴ𝓃 𝓁𝒶𝓈ℯ𝓇.',
    '➢ 𝓔𝓼 𝓭𝓪𝓽𝓸 𝓯𝓲𝓷𝓪𝓵, 𝓬𝓲𝓮𝓷𝓬𝓲𝓪 𝓹𝓾𝓻𝓪.',
    '➢ 𝓢𝓮 𝓪𝓬𝓽𝓲𝓿ó 𝓮𝓵 𝓶𝓸𝓭𝓸 𝓬𝓸𝓷𝓯𝓲𝓻𝓶𝓪𝓬𝓲ó𝓷.',
    '➢ 𝓛𝓪 𝓮𝓼𝓬𝓪𝓷𝓮𝓪𝓭𝓪 𝓯𝓾𝓮 𝓲𝓷𝓯𝓪𝓵𝓲𝓫𝓵𝓮.',
    '➢ 𝓡𝓮𝓼𝓾𝓵𝓽𝓪𝓭𝓸 𝓼𝓮𝓵𝓵𝓪𝓭𝓸 𝓬𝓸𝓷 𝓾𝓷 𝓪𝓻𝓬𝓸í𝓻𝓲𝓼.'
  ];

  const remate = frasesFinales[Math.floor(Math.random() * frasesFinales.length)];
  const cierre = frasesCierre[Math.floor(Math.random() * frasesCierre.length)];

  const resultado =
`💫 *ANÁLISIS COMPLETO DEL GAYDÁR*

*📡 RESULTADO:* @${numero} *posee un* *${porcentaje}%* *de gay interior 🌈*
> ${remate}

${cierre}`;

  await conn.sendMessage(chatId, {
    text: resultado,
    mentions: [mentionedJid]
  }, { quoted: msg });

  if (audioURL) {
    await conn.sendMessage(chatId, {
      audio: { url: audioURL },
      mimetype: 'audio/mp4',
      ptt: true
    }, { quoted: msg });
  }
};

handler.command = ['gay'];
handler.tags = ['diversión'];
handler.help = ['gay @usuario o responde'];
handler.register = true;
handler.group = true;

module.exports = handler;