// plugins/allmenu.js
const handler = async (msg, { conn }) => {
  const chatId  = msg.key.remoteJid;
  const prefijo = global.prefixes?.[0] || ".";

  // Reacción
  await conn.sendMessage(chatId, { react: { text: "🧩", key: msg.key } });

  // Extraer comandos (solo strings), únicos y ordenados
  const todosLosComandos = [
    ...new Set(
      (global.plugins || [])
        .flatMap(p => {
          const c = p?.command;
          if (!c) return [];
          const arr = Array.isArray(c) ? c : [c];
          return arr.filter(x => typeof x === "string");
        })
    )
  ].sort((a, b) => a.localeCompare(b));

  const total = todosLosComandos.length;

  const caption = `
╔════════════════════╗
║🤖 *ALL MENU LA SUKI BOT*
╚════════════════════╝

🧠 *Bot creado desde cero.*
🔧 *Total comandos activos:* ${total}
🔑 *Prefijo actual:* ${prefijo}

📦 *Lista de comandos:*
${todosLosComandos.map(c => `➤ ${prefijo}${c}`).join("\n")}
  
💫 *Gracias por usar suki Omega.*
`.trim();

  // Enviar imagen con el menú
  return conn.sendMessage(chatId, {
    image: { url: "https://cdn.russellxz.click/40df9bcb.jpeg" },
    caption
  }, { quoted: msg });
};

handler.command = ["allmenu"];
handler.help = ["allmenu"];
handler.tags = ["menu"];

module.exports = handler;
