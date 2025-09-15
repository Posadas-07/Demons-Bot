const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  const videoUrl = "https://cdn.russellxz.click/20f8ea7a.mp4"; // 🎥 Video con sonido

  await conn.sendMessage(chatId, {
    video: { url: videoUrl },
    caption: "AQUI TIENES TÚ ULTRA INSTINTO.."
  }, { quoted: msg });

  await conn.sendMessage(chatId, {
    react: { text: "💀", key: msg.key }
  });
};

handler.command = ["ultra"];
module.exports = handler;