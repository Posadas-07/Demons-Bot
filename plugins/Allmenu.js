const handler = async (msg, { conn }) => {
  const chatId  = msg.key.remoteJid;
  const prefijo = global.prefixes?.[0] || ".";

  await conn.sendMessage2(chatId, { react: { text: "🧩", key: msg.key } }, msg);

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

  const caption = ` DE҈M҉O҉N҉S҉ NO҉V҉A҉ CR҉O҉N҉H҉O҉S҉

🔧 *Total comandos activos:* ${total}
🔑 *Prefijo actual:* ${prefijo}

📦 *Lista de comandos:*
${todosLosComandos.map(c => `➤ ${prefijo}${c}`).join("\n")}
  
💫 *Demons-Bot WhatsApp*
`.trim();

  return conn.sendMessage2(chatId, {
    image: { url: "https://cdn.russellxz.click/40df9bcb.jpeg" },
    caption
  }, msg);
};

handler.command = ["allmenu"];
handler.help = ["allmenu"];
handler.tags = ["menu"];

module.exports = handler;
