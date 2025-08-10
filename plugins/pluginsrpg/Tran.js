const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const numeroSender = sender.replace(/\D/g, "");

  await conn.sendMessage(chatId, { react: { text: "💸", key: msg.key } });

  const sukirpgPath = path.join(process.cwd(), "sukirpg.json");
  const db = fs.existsSync(sukirpgPath) ? JSON.parse(fs.readFileSync(sukirpgPath)) : {};
  db.usuarios = db.usuarios || [];

  const remitente = db.usuarios.find(u => u.numero === numeroSender);
  if (!remitente) {
    return conn.sendMessage(chatId, { text: "❌ No estás registrado en el RPG.", quoted: msg });
  }

  let receptorNumero;
  let cantidad;

  // Si se cita un mensaje
  if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
    receptorNumero = msg.message.extendedTextMessage.contextInfo.participant.replace(/\D/g, "");
    cantidad = parseInt(args[0]);
  }
  // Si se menciona un usuario
  else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
    receptorNumero = msg.message.extendedTextMessage.contextInfo.mentionedJid[0].replace(/\D/g, "");
    cantidad = parseInt(args[1]);
  } else {
    return conn.sendMessage(chatId, {
      text: "✳️ Uso:\n.responder a un usuario + cantidad\n.mencionar a un usuario + cantidad",
      quoted: msg
    });
  }

  if (!cantidad || cantidad <= 0 || isNaN(cantidad)) {
    return conn.sendMessage(chatId, { text: "❌ Ingresa una cantidad válida.", quoted: msg });
  }

  if (remitente.creditos < cantidad) {
    return conn.sendMessage(chatId, {
      text: `❌ No tienes créditos suficientes. Tu saldo actual es ${remitente.creditos} 💳`,
      quoted: msg
    });
  }

  const receptor = db.usuarios.find(u => u.numero === receptorNumero);
  if (!receptor) {
    return conn.sendMessage(chatId, { text: "❌ El usuario receptor no está registrado.", quoted: msg });
  }

  // Transferencia
  remitente.creditos -= cantidad;
  receptor.creditos += cantidad;

  fs.writeFileSync(sukirpgPath, JSON.stringify(db, null, 2));

  // Datos para factura
  const fecha = new Date().toLocaleDateString("es-AR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const canvas = createCanvas(900, 500);
  const ctx = canvas.getContext("2d");

  // Fondo
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 900, 500);

  // Logo
  const logo = await loadImage("https://cdn.russellxz.click/9f08a046.jpeg");
  ctx.save();
  ctx.beginPath();
  ctx.arc(80, 80, 60, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(logo, 20, 20, 120, 120);
  ctx.restore();

  // Título
  ctx.fillStyle = "#000";
  ctx.font = "bold 32px Sans-serif";
  ctx.fillText("❦FACTURA DE TRANSFERENCIA❦", 180, 60);

  // Datos
  ctx.font = "20px Sans-serif";
  ctx.fillText(`☛ Fecha: ${fecha}`, 180, 100);
  ctx.fillText(`☛ Remitente: ${remitente.nombre} ${remitente.apellido}`, 180, 140);
  ctx.fillText(`☛ Saldo después: ${remitente.creditos}`, 180, 170);
  ctx.fillText(`☛ Receptor: ${receptor.nombre} ${receptor.apellido}`, 180, 210);
  ctx.fillText(`☛ Saldo después: ${receptor.creditos}`, 180, 240);
  ctx.fillText(`☛ Cantidad Transferida: ${cantidad} créditos`, 180, 280);

  // Texto verde final
  ctx.fillStyle = "#28a745";
  ctx.font = "bold 40px Sans-serif";
  ctx.fillText("✔ TRANSFERENCIA EXITOSA", 165, 350);

  const buffer = canvas.toBuffer("image/png");

  await conn.sendMessage(chatId, {
    image: buffer,
    caption: `✅ La transferencia fue exitosa.\n💸 *${remitente.nombre}* → *${receptor.nombre}*`,
    quoted: msg
  });

  await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
};

handler.command = ["transferir", "tran"];
module.exports = handler;
