// plugins/checkTiempoGrupos.js
const fs = require("fs");
const path = require("path");

const handler = async (conn) => {
  setInterval(async () => {
    try {
      const filePath = path.resolve("setwelcome.json");
      if (!fs.existsSync(filePath)) return;

      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const ahora = Date.now();

      for (const chatId in data) {
        const info = data[chatId];

        // URL de la imagen que se usará
        const imgURL = "https://cdn.russellxz.click/a751c396.jpeg";

        // Cierre automático
        if (info?.cerrar && ahora >= info.cerrar) {
          await conn.groupSettingUpdate(chatId, "announcement"); // Grupo cerrado
          delete info.cerrar;

          await conn.sendMessage(chatId, {
            image: { url: imgURL },
            caption: "🔒 El grupo ha sido cerrado automáticamente."
          });
        }

        // Apertura automática
        if (info?.abrir && ahora >= info.abrir) {
          await conn.groupSettingUpdate(chatId, "not_announcement"); // Grupo abierto
          delete info.abrir;

          await conn.sendMessage(chatId, {
            image: { url: imgURL },
            caption: "🔓 El grupo ha sido abierto automáticamente."
          });
        }

        // Limpieza si no queda nada
        if (info && Object.keys(info).length === 0) {
          delete data[chatId];
        }
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("❌ Error al procesar cierre/apertura programada:", err);
    }
  }, 10000); // cada 10 segundos
};

handler.run = handler;
module.exports = handler;