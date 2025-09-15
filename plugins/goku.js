const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  const videoUrl = "https://cdn.russellxz.click/e070de75.mp4"; // 🎥 Video con sonido

  await conn.sendMessage(chatId, {
    video: { url: videoUrl },
    caption: "AQUI TIENES A TÚ GOKUU.."
  }, { quoted: msg });

  await conn.sendMessage(chatId, {
    react: { text: "💀", key: msg.key }
  });
};

handler.command = ["goku"];
module.exports = handler;