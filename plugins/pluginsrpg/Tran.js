// plugins/transferir.js
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const MAX_POR_TRANSFERENCIA = 50000;
const MAX_POR_PAREJA_VENTANA = 50000;
const VENTANA_MS = 48 * 60 * 60 * 1000; // 48 horas

function msAFormato(ms) {
  if (ms <= 0) return "0s";
  const s = Math.ceil(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const partes = [];
  if (d) partes.push(`${d}d`);
  if (h) partes.push(`${h}h`);
  if (m) partes.push(`${m}m`);
  if (sec && !d && !h) partes.push(`${sec}s`);
  return partes.join(" ");
}

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const numeroSender = (sender || "").replace(/\D/g, "");

  await conn.sendMessage(chatId, { react: { text: "💸", key: msg.key } });

  const sukirpgPath = path.join(process.cwd(), "sukirpg.json");
  const db = fs.existsSync(sukirpgPath) ? JSON.parse(fs.readFileSync(sukirpgPath)) : {};
  db.usuarios = Array.isArray(db.usuarios) ? db.usuarios : [];

  const remitente = db.usuarios.find(u => u.numero === numeroSender);
  if (!remitente) {
    return conn.sendMessage(chatId, { text: "❌ No estás registrado en el RPG.", quoted: msg });
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

  // Límite por transferencia
  if (cantidad > MAX_POR_TRANSFERENCIA) {
    return conn.sendMessage(chatId, {
      text: `🚫 El máximo por transferencia es *${MAX_POR_TRANSFERENCIA}* créditos.`,
      quoted: msg
    });
  }

  // Verificar receptor
  const receptor = db.usuarios.find(u => u.numero === receptorNumero);
  if (!receptor) {
    return conn.sendMessage(chatId, { text: "❌ El usuario receptor no está registrado.", quoted: msg });
  }

  // Saldo suficiente (solo saldo "afuera", no guardado)
  const saldoDisponible = Number(remitente.creditos || 0);
  if (saldoDisponible < cantidad) {
    return conn.sendMessage(chatId, {
      text: `❌ No tienes créditos suficientes. Tu saldo actual es *${saldoDisponible}* 💳`,
      quoted: msg
    });
  }

  // === Control de ventana 48h por pareja emisor->receptor ===
  remitente.transferencias = remitente.transferencias || {};
  // Estructura: transferencias[receptorNumero] = { desde: timestamp, total: number }
  let pair = remitente.transferencias[receptorNumero];

  const ahora = Date.now();
  if (!pair || (ahora - (pair.desde || 0)) >= VENTANA_MS) {
    // iniciar nueva ventana
    pair = { desde: ahora, total: 0 };
  }

  // ¿Excede el cupo de la ventana?
  const restanteVentana = Math.max(0, MAX_POR_PAREJA_VENTANA - Number(pair.total || 0));
  if (restanteVentana <= 0) {
    const espera = (pair.desde + VENTANA_MS) - ahora;
    return conn.sendMessage(chatId, {
      text: `⏳ Ya alcanzaste el tope de *${MAX_POR_PAREJA_VENTANA}* créditos para transferir a @${receptorNumero}.\nVuelve a intentarlo en *${msAFormato(espera)}*.`,
      mentions: [`${receptorNumero}@s.whatsapp.net`],
      quoted: msg
    });
  }
  if (cantidad > restanteVentana) {
    const espera = (pair.desde + VENTANA_MS) - ahora;
    return conn.sendMessage(chatId, {
      text:
        `⚠️ A @${receptorNumero} solo puedes enviar *${restanteVentana}* créditos más dentro de esta ventana de 48h.\n` +
        `• Espera *${msAFormato(espera)}* o intenta por un monto menor.`,
      mentions: [`${receptorNumero}@s.whatsapp.net`],
      quoted: msg
    });
  }

  // === Ejecutar transferencia ===
  remitente.creditos = saldoDisponible - cantidad;
  receptor.creditos = (receptor.creditos || 0) + cantidad;

  // Actualizar ventana
  pair.total = Number(pair.total || 0) + cantidad;
  remitente.transferencias[receptorNumero] = pair;

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
    caption:
      `✅ La transferencia fue exitosa.\n` +
      `💸 *${remitente.nombre}* → *${receptor.nombre}*\n` +
      `⏳ Ventana con @${receptorNumero}: ` +
      `${pair.total}/${MAX_POR_PAREJA_VENTANA} en 48h.`,
    mentions: [`${receptorNumero}@s.whatsapp.net`],
    quoted: msg
  });

  await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
};

handler.command = ["transferir", "tran"];
module.exports = handler;
