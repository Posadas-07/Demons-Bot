const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const pref = global.prefixes?.[0] || ".";

  await conn.sendMessage2(chatId, {
    react: { text: "👑", key: msg.key }
  }, msg);

  try {
    const filePath = path.resolve("./setmenu.json");
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) || {};
      const rawTexto = typeof data.texto_owner === "string" ? data.texto_owner : null;
      const imgB64   = data.imagen_owner || null;

      if ((rawTexto && rawTexto.trim()) || imgB64) {
        const caption = (rawTexto || "").replace(/\{pref\}/g, pref).trim();

        if (imgB64) {
          const buffer = Buffer.from(imgB64, "base64");
          await conn.sendMessage2(chatId, { image: buffer, caption: caption || undefined }, msg);
        } else {
          await conn.sendMessage2(chatId, { text: caption || " " }, msg);
        }
        return;
      }
    }
  } catch (e) {
    console.error("[menuowner] Error leyendo menú owner personalizado:", e);
  }

  const caption = `╔════════════════╗
   👑 𝙼𝙴𝙽𝚄 𝙳𝙴 𝙾𝚆𝙽𝙴𝚁 👑
╚════════════════╝

🧩 *COMANDOS EXCLUSIVOS*
╭─────◆
│๛ ${pref}bc
│๛ ${pref}bc2
│๛ ${pref}rest
│๛ ${pref}carga
│๛ ${pref}modoprivado on/off
│๛ ${pref}botfoto
│๛ ${pref}botname
│๛ ${pref}setprefix
│๛ ${pref}git
│๛ ${pref}re
│๛ ${pref}unre
│๛ ${pref}autoadmins
│๛ ${pref}antideletepri on/off
│๛ ${pref}apagado
│๛ ${pref}addlista
│๛ ${pref}dellista
│๛ ${pref}vergrupos
│๛ ${pref}addowner
│๛ ${pref}delowner
│๛ ${pref}dar
│๛ ${pref}deleterpg
│๛ ${pref}addfactura
│๛ ${pref}delfactura
│๛ ${pref}facpaga
│๛ ${pref}verfac
│๛ ${pref}setmenu
│๛ ${pref}setmenugrupo
│๛ ${pref}setmenuowner
│๛ ${pref}delmenu
│๛ ${pref}delmenugrupo 
│๛ ${pref}delmenuowner
╰─────◆

🤖 *La Suki Bot - Modo Dios activado*
`.trim();

  await conn.sendMessage2(chatId, {
    video: { url: "https://cdn.russellxz.click/a0b60c86.mp4" },
    gifPlayback: true,
    caption
  }, msg);
};

handler.command = ["menuowner", "ownermenu"];
handler.help = ["menuowner"];
handler.tags = ["menu"];

module.exports = handler;
