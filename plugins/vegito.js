const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  const videoUrl = "https://cdn.russellxz.click/a91047df.mp4"; // 🎥 Video con sonido

  await conn.sendMessage(chatId, {
    video: { url: videoUrl },
    caption: ""
  }, { quoted: msg });

  await conn.sendMessage(chatId, {
    react: { text: "💀", key: msg.key }
  });
};

handler.command = ["vegito"];
module.exports = handler;