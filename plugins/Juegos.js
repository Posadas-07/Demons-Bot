const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  const textRaw = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).trim();

  const match = textRaw.match(/^[!./#]?\s*([a-zA-Z]+)/);
  const comando = match ? match[1].toLowerCase() : null;

  const comandosValidos = [
    'puta', 'puto', 'peruano', 'peruana',
    'negro', 'negra', 'manca', 'manco',
    'fea', 'feo', 'enano', 'enana',
    'cachudo', 'cachuda', 'pajero', 'pajera',
    'rata', 'adoptado', 'adoptada'
  ];

  if (!comando || !comandosValidos.includes(comando)) return;

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
      text: `❗ *Uso incorrecto del comando.*\n\nDebes *etiquetar* a alguien o *responder su mensaje* para escanear.\n\n*Ejemplos válidos:*\n> .${comando} @usuario\n> .${comando} (respondiendo al mensaje de alguien)`,
    }, { quoted: msg });
  }

  const numero = mentionedJid.split('@')[0];

  const frasesOwner = [
    '🛡️ @{user} está protegido por los dioses del bot. Nivel: Inalcanzable.',
    '👑 Intentaste medir al creador, @{user} ríe desde su trono.',
    '🚫 Escaneo fallido. @{user} es intocable.',
    '🔒 Modo inmortal activado para @{user}.',
    '⚠️ El universo bloqueó tu intento de escanear a @{user}.'
  ];

  const isTaggedOwner = Array.isArray(global.owner) && global.owner.some(([id]) => id === numero);
  if (isTaggedOwner) {
    const frase = frasesOwner[Math.floor(Math.random() * frasesOwner.length)].replace('{user}', numero);
    return await conn.sendMessage(chatId, {
      text: frase,
      mentions: [mentionedJid]
    }, { quoted: msg });
  }

  const frasesPorComando = {
    puta: ['𐀔 Nadie cobra tanto por tan poco.', '𐀔 Tu reputación te precede.', '𐀔 Cada esquina sabe tu nombre.', '𐀔 Nivel experto en travesuras.'],
    puto: ['𐀔 Se sienta más rápido que la paciencia de todos.', '𐀔 Su fama lo persigue hasta en sueños.', '𐀔 Hasta el WiFi se esconde de ti.', '𐀔 Leyenda urbana del barrio.'],
    peruano: ['𐀔 Tu sabor es tan único como tu conexión.', '𐀔 Cada ceviche llora a tu paso.', '𐀔 Machu Picchu te envidia.', '𐀔 Eres historia viva de tu tierra.'],
    peruana: ['𐀔 Tus audios deberían ser patrimonio.', '𐀔 Cada sticker vale oro.', '𐀔 Tus palabras mueven terremotos.', '𐀔 Misterio y encanto en un solo paquete.'],
    negro: ['𐀔 La noche te envidia tu sombra.', '𐀔 Invisible hasta para la linterna.', '𐀔 Oscuridad con estilo.', '𐀔 Apariciones dignas de leyenda.'],
    negra: ['𐀔 Apagas luces al caminar.', '𐀔 Silueta imponente incluso de día.', '𐀔 Eclipse portátil.', '𐀔 Brillo único en la sombra.'],
    manca: ['𐀔 Más fallas que un parche beta.', '𐀔 La puntería te esquiva siempre.', '𐀔 Tu KD es irrelevante.', '𐀔 Dudas dispara, no balas.'],
    manco: ['𐀔 Creaste tus propias reglas de puntería.', '𐀔 Manos legendarias en su imperfección.', '𐀔 Cargas lento, pero con estilo.', '𐀔 Precisión cuestionable, fama asegurada.'],
    fea: ['𐀔 Espejos rehúyen tu reflejo.', '𐀔 Filtro de belleza rechazado.', '𐀔 Modo oscuro activado automáticamente.', '𐀔 Tu cara rompe estándares.'],
    feo: ['𐀔 Nació para sorprender al doctor.', '𐀔 Sustos garantizados cada noche.', '𐀔 Hasta el WiFi te evita.', '𐀔 Definición de estética alternativa.'],
    enana: ['𐀔 Escalera obligatoria para todo.', '𐀔 Invisible en VS.', '𐀔 Miniatura con personalidad gigante.', '𐀔 Sticker vivo de tamaño reducido.'],
    enano: ['𐀔 Salto sin efecto de miedo.', '𐀔 Edición demo de persona.', '𐀔 Cargado con nostalgia tecnológica.', '𐀔 Emoji andante versión real.'],
    cachudo: ['𐀔 Frente imposible de selfies.', '𐀔 Cornómetro activado.', '𐀔 Sueños traicioneros.', '𐀔 Infidelidad en sombra constante.'],
    cachuda: ['𐀔 Pareja confusa con tus giros.', '𐀔 Trompos y vueltas sin fin.', '𐀔 Ni la suegra sabe.', '𐀔 Todo el grupo al tanto menos tú.'],
    pajero: ['𐀔 Datos gastados en solitario.', '𐀔 MVP de lo desconocido.', '𐀔 Saludo izquierdo activado.', '𐀔 Historial digno de misterio.'],
    pajera: ['𐀔 Vacaciones urgentes para el vibrador.', '𐀔 Netflix y tú, protagonista.', '𐀔 Nadie te entiende, pero tú sí.', '𐀔 Scripts secretos dominados.'],
    rata: ['𐀔 No prestas ni un saludo.', '𐀔 Oculto en tu turno de pago.', '𐀔 Inflación humana.', '𐀔 Más codo que robot sin brazo.'],
    adoptado: ['𐀔 DLC de la familia.', '𐀔 Perro confundido.', '𐀔 Tutorial omitido.', '𐀔 Parche emocional en progreso.'],
    adoptada: ['𐀔 Misterio genealógico.', '𐀔 Sticker sorpresa de la familia.', '𐀔 Abuela intrigada.', '𐀔 Existencia inesperada.']
  };

  const cierres = [
    '➢ Validación cósmica completada.',
    '➢ Datos cruzados con la divinidad.',
    '➢ Informe autenticado en la nave madre.',
    '➢ Resultado registrado en archivos eternos.',
    '➢ Escaneo certificado y aprobado.'
  ];

  const remate = frasesPorComando[comando][Math.floor(Math.random() * frasesPorComando[comando].length)];
  const cierre = cierres[Math.floor(Math.random() * cierres.length)];
  const porcentaje = Math.floor(Math.random() * 101);

  const textoFinal = `💫 *ANÁLISIS COMPLETO DEL ESCÁNER*\n\n*📡 RESULTADO:* @${numero} *es* 『 ${porcentaje}% 』 ${comando.toUpperCase()} 🌐\n\n> ${remate}\n\n${cierre}`;

  await conn.sendMessage(chatId, {
    text: textoFinal,
    mentions: [mentionedJid]
  }, { quoted: msg });
};

handler.command = [
  'puta', 'puto', 'peruano', 'peruana',
  'negro', 'negra', 'manca', 'manco',
  'fea', 'feo', 'enano', 'enana',
  'cachudo', 'cachuda', 'pajero', 'pajera',
  'rata', 'adoptado', 'adoptada'
];

handler.tags = ['diversión'];
handler.help = handler.command.map(c => `${c} @usuario o responde`);
handler.group = true;
handler.register = true;

module.exports = handler;