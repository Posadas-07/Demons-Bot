// plugins/transferir.js
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const numeroSender = (sender || "").replace(/\D/g, "");

  await conn.sendMessage(chatId, { react: { text: "💸", key: msg.key } });

  const sukirpgPath = path.join(process.cwd(), "sukirpg.json");
  const db = fs.existsSync(sukirpgPath) ? JSON.parse(fs.readFileSync(sukirpgPath)) : {};
  db.usuarios = Array.isArray(db.usuarios) ? db.usuarios : [];
  db.banco = db.banco || null;

  const remitente = db.usuarios.find(u => u.numero === numeroSender);
  if (!remitente) {
    return conn.sendMessage(chatId, { text: "❌ No estás registrado en el RPG.", quoted: msg });
  }

  // === BLOQUEO POR DEUDA ACTIVA EN EL BANCO ===
  if (db.banco && Array.isArray(db.banco.prestamos)) {
    const deudaActiva = db.banco.prestamos.find(p =>
      String(p.numero) === numeroSender &&
      String(p.estado || "activo") === "activo" &&
      Number(p.pendiente || p.totalAPagar || 0) > 0
    );
    if (deudaActiva) {
      const deudaPendiente = deudaActiva.pendiente || deudaActiva.totalAPagar || 0;
      const fechaLimite = deudaActiva.fechaLimite ? new Date(deudaActiva.fechaLimite).toLocaleString() : "Sin fecha registrada";
      return conn.sendMessage(chatId, {
        text:
`🚫 No puedes transferir créditos mientras tengas deuda activa.
💳 No tienes ni pagar tu deuda en el banco y quieres transferir… *eres un mala paga*.

🏦 *Banco de Suki*:
• 📉 Deuda actual: *${deudaPendiente}* créditos
• ⏳ Fecha límite de pago: *${fechaLimite}*

📌 Usa *.pagarall* para saldar tu deuda y poder transferir nuevamente.`,
        quoted: msg
      });
    }
  }

  // Obtener receptor y cantidad (por respuesta o mención)
  let receptorNumero;
  let cantidad;

  if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
    receptorNumero = msg.message.extendedTextMessage.contextInfo.participant.replace(/\D/g, "");
    cantidad = parseInt(args[0], 10);
  } else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
    receptorNumero = msg.message.extendedTextMessage.contextInfo.mentionedJid[0].replace(/\D/g, "");
    cantidad = parseInt(args[1], 10);
  } else {
    return conn.sendMessage(chatId, {
      text: "✳️ Uso:\n• Responde al usuario: *.transferir <monto>*\n• O menciona al usuario: *.transferir @user <monto>*",
      quoted: msg
    });
  }

  if (!receptorNumero) {
    return conn.sendMessage(chatId, { text: "❌ No se pudo detectar el receptor.", quoted: msg });
  }
  if (receptorNumero === numeroSender) {
    return conn.sendMessage(chatId, { text: "❌ No puedes transferirte a ti mismo.", quoted: msg });
  }

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return conn.sendMessage(chatId, { text: "❌ Ingresa una cantidad válida mayor que 0.", quoted: msg });
  }

  // Verificar receptor
  const receptor = db.usuarios.find(u => u.numero === receptorNumero);
  if (!receptor) {
    return conn.sendMessage(chatId, { text: "❌ El usuario receptor no está registrado.", quoted: msg });
  }

  // Saldo suficiente
  const saldoDisponible = Number(remitente.creditos || 0);
  if (saldoDisponible < cantidad) {
    return conn.sendMessage(chatId, {
      text: `❌ No tienes créditos suficientes. Tu saldo actual es *${saldoDisponible}* 💳`,
      quoted: msg
    });
  }

  // === Ejecutar transferencia ===
  remitente.creditos = saldoDisponible - cantidad;
  receptor.creditos = (receptor.creditos || 0) + cantidad;

  fs.writeFileSync(sukirpgPath, JSON.stringify(db, null, 2));

  // === Factura visual ===
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
    mentions: [`${receptorNumero}@s.whatsapp.net`],
    quoted: msg
  });

  await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
};

handler.command = ["transferir", "tran"];
module.exports = handler;
