const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderId = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");

  if (!chatId.endsWith("@g.us")) {
    await conn.sendMessage(chatId, {
      text: "❌ *Este comando solo se puede usar en grupos.*"
    }, { quoted: msg });
    return;
  }

  const metadata = await conn.groupMetadata(chatId);
  const participante = metadata.participants.find(p => p.id.includes(senderId));
  const isAdmin = participante?.admin === "admin" || participante?.admin === "superadmin";

  const ownerPath = path.resolve("owner.json");
  const owners = fs.existsSync(ownerPath) ? JSON.parse(fs.readFileSync(ownerPath)) : [];
  const isOwner = owners.some(([id]) => id === senderId);

  if (!isAdmin && !isOwner) {
    await conn.sendMessage(chatId, {
      text: "⛔ *Solo administradores o dueños del bot pueden usar este comando.*"
    }, { quoted: msg });
    return;
  }

  const limite = parseInt(args[0]);
  if (isNaN(limite)) {
    await conn.sendMessage(chatId, {
      text: "🎛️ *Debes escribir un número de mensajes como límite.*\n\nEjemplo: `.fankick 10`\n\n⚠️ *Advertencia importante:* Este sistema elimina automáticamente a todos los usuarios que hayan enviado *menos de 10 mensajes*  o como tu lo configures ok. desde que el bot entró al grupo. No analiza actividad antigua ni visualizaciones. Solo se basa en los mensajes contados por el bot desde que está presente. Usa este comando con responsabilidad, ya que puede expulsar miembros valiosos por error si no se ha hecho un buen seguimiento. 👻"
    }, { quoted: msg });
    return;
  }

  const filePath = path.resolve("setwelcome.json");
  const data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};
  const chatData = data[chatId]?.chatCount || {};

  const participantes = metadata.participants;
  const ownersNum = owners.map(([id]) => id);
  const botNumber = conn.user.id.split(":")[0];
  const eliminados = [];

  for (const p of participantes) {
    const jid = p.id;
    const num = jid.replace(/[^0-9]/g, "");
    const count = parseInt(chatData[jid]) || 0;

    const esAdmin = p.admin === "admin" || p.admin === "superadmin";
    const esOwner = ownersNum.includes(num);
    const esBot = num === botNumber;

    if (!esAdmin && !esOwner && !esBot && count < limite) {
      try {
        await conn.groupParticipantsUpdate(chatId, [jid], "remove");
        eliminados.push(`@${num}`);
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error(`❌ No se pudo eliminar a ${jid}:`, e);
      }
    }
  }

  if (eliminados.length === 0) {
    await conn.sendMessage(chatId, {
      text: `🎉 *No se eliminó a nadie.* Todos tienen más de ${limite} mensajes o son admins/owners/bot.`
    }, { quoted: msg });
  } else {
    await conn.sendMessage(chatId, {
      text: `🧹 *Usuarios eliminados por inactividad (< ${limite} mensajes):*\n\n` +
        eliminados.map((u, i) => `${i + 1}. ${u}`).join("\n"),
      mentions: eliminados.map(j => j.replace("@", "") + "@s.whatsapp.net")
    }, { quoted: msg });
  }
};

handler.command = ["fankick"];
module.exports = handler;
