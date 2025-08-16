const fetch = require('node-fetch');

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return conn.reply(m.chat, `♻️ *Uso:* ${usedPrefix + command} < prompt del video >`, m);

  try {
    
    await conn.sendMessage(m.chat, { react: { text: '🕕', key: m.key } });

    let apiURL = `https://myapiadonix.vercel.app/api/veo3?prompt=${encodeURIComponent(text)}&apikey=adonixveo3`;

    let res = await fetch(apiURL);
    let json = await res.json();

    if (!json.success || !json.video_url) throw new Error(json.message || 'No se pudo generar el video');

    let video = await fetch(json.video_url);
    let buffer = await video.buffer();

    await conn.sendMessage(m.chat, { 
      video: buffer, 
      caption: `
━━━━━━━━━━━━━━
🎬 *VIDEO GENERADO*
━━━━━━━━━━━━━━
📌 *Prompt:* ${json.prompt}\n🦖 *API: myapiadonix.vercel.app*
━━━━━━━━━━━━━━
`, 
      gifPlayback: false 
    }, { quoted: m });

    
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } });
  }
};

handler.help = ['aivideo'];
handler.tags = ['ia'];
handler.command = ['aivideo', 'videoai', 'iavideo'];

module.exports = handler;