const fetch = require('node-fetch');

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const handler = async (m, { conn, text }) => {
  if (!text) {
    return conn.sendMessage(m.chat, { text: `🗣️ Mande un texto pa que Adonix le hable al toque` }, { quoted: m });
  }

  try {
    if (m?.key) await conn.sendMessage(m.chat, { react: { text: '🎤', key: m.key } });

    const res = await fetch(`https://myapiadonix.vercel.app/api/adonixvoz?q=${encodeURIComponent(text)}`);
    if (!res.ok) throw new Error('No pude obtener audio de Adonix');

    const bufferAudio = await streamToBuffer(res.body);

    await conn.sendMessage(m.chat, {
      audio: bufferAudio,
      mimetype: 'audio/mpeg',
      ptt: true
    }, { quoted: m });

    if (m?.key) await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    console.error(e);
    if (m?.key) await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    await conn.sendMessage(m.chat, { text: '❌ Error al generar la voz, intentalo otra vez' }, { quoted: m });
  }
};

handler.command = ['iavoz'];
handler.help = ['iavoz'];
handler.tags = ['ia'];
module.exports = handler;