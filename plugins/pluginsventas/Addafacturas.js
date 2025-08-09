// plugins/addfactura.js
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const FormData = require("form-data");
const axios = require("axios");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

function parseCiclo(token) {
  // "1m" | "1h" | "1d" | "30d" etc.
  const m = String(token || "").trim().toLowerCase().match(/^(\d+)([mhd])$/);
  if (!m) return null;
  const valor = parseInt(m[1], 10);
  const uni = m[2];
  const ms = uni === "m" ? valor * 60 * 1000 : uni === "h" ? valor * 60 * 60 * 1000 : valor * 24 * 60 * 60 * 1000;
  return { valor, unidad: uni, ms, texto: `${valor}${uni}` };
}

function limpiarNumero(n) {
  return String(n || "").replace(/\D/g, "");
}

function formatFecha(ts) {
  // Fecha amigable en español
  const d = new Date(ts);
  return d.toLocaleString("es-ES", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

async function subirLogoDesdeCita(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted || !quoted.imageMessage) {
    throw new Error("Debes *responder a una imagen* que será usada como logo.");
  }

  const mediaMessage = quoted.imageMessage;
  const stream = await downloadContentFromMessage(mediaMessage, "image");
  const tmpDir = path.join(__dirname, "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
  const tmpPath = path.join(tmpDir, `${Date.now()}_logo.jpg`);

  const ws = fs.createWriteStream(tmpPath);
  for await (const chunk of stream) ws.write(chunk);
  ws.end();
  await new Promise((r) => ws.on("finish", r));

  // Subir a tu CDN
  const form = new FormData();
  form.append("file", fs.createReadStream(tmpPath));
  const res = await axios.post("https://cdn.russellxz.click/upload.php", form, { headers: form.getHeaders() });
  fs.unlinkSync(tmpPath);

  if (!res.data?.url) throw new Error("No se pudo subir el logo.");
  return res.data.url;
}

async function generarFacturaPNG({ logoUrl, datos }) {
  // Canvas y estilos
  const W = 1100, H = 650;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Fondo
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Banda superior
  ctx.fillStyle = "#111827"; // gris oscuro
  ctx.fillRect(0, 0, W, 120);

  // Logo redondo a la izquierda
  try {
    const logo = await loadImage(logoUrl);
    const size = 90, x = 30, y = 15;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logo, x, y, size, size);
    ctx.restore();
  } catch {
    // Si falla el logo, no rompemos la factura
  }

  // Títulos
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px Sans-Serif";
  ctx.fillText("FACTURA • PAGO EXITOSO", 140, 55);

  ctx.font = "16px Sans-Serif";
  ctx.fillText(`Generada: ${formatFecha(datos.fechaCreacion)}`, 140, 85);

  // Caja de datos
  const boxX = 40, boxY = 150, boxW = W - 80, boxH = 360;
  ctx.fillStyle = "#f3f4f6"; // gris muy claro
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 24px Sans-Serif";
  ctx.fillText("Detalle de la Factura", boxX + 20, boxY + 40);

  ctx.font = "18px Sans-Serif";
  const L = 30;
  let yy = boxY + 80;

  ctx.fillText(`Servicio: ${datos.servicio}`, boxX + 20, yy); yy += L;
  ctx.fillText(`Precio: $ ${datos.precio.toFixed(2)}`, boxX + 20, yy); yy += L;
  ctx.fillText(`Ciclo: cada ${datos.ciclo.texto}`, boxX + 20, yy); yy += L;
  ctx.fillText(`Próximo pago: ${formatFecha(datos.fechaProximoPago)}`, boxX + 20, yy); yy += L;

  yy += 20;
  ctx.font = "bold 20px Sans-Serif";
  ctx.fillText("Cliente", boxX + 20, yy);
  ctx.fillText("Vendedor", boxX + boxW / 2 + 10, yy);
  yy += 30;

  ctx.font = "18px Sans-Serif";
  ctx.fillText(`Nombre: ${datos.cliente.nombre}`, boxX + 20, yy);
  ctx.fillText(`Nombre: ${datos.vendedor.nombre}`, boxX + boxW / 2 + 10, yy);
  yy += L;
  ctx.fillText(`Número: ${datos.cliente.numero}`, boxX + 20, yy);
  ctx.fillText(`Número: ${datos.vendedor.numero}`, boxX + boxW / 2 + 10, yy);

  // Sello "PAGO EXITOSO"
  ctx.save();
  ctx.translate(W - 260, boxY + 120);
  ctx.rotate(-Math.PI / 12);
  ctx.strokeStyle = "#10b981"; // verde
  ctx.lineWidth = 6;
  ctx.strokeRect(-10, -40, 240, 80);

  ctx.fillStyle = "#10b981";
  ctx.font = "bold 28px Sans-Serif";
  ctx.fillText("PAGO EXITOSO", 8, 10);
  ctx.restore();

  // Pie
  ctx.fillStyle = "#6b7280";
  ctx.font = "14px Sans-Serif";
  ctx.fillText("Gracias por su pago. Esta es la confirmación de su ciclo actual.", 40, H - 30);

  return canvas.toBuffer("image/png");
}

const handler = async (msg, { conn, args, command }) => {
  const chatId = msg.key.remoteJid;

  // Reacción inicial
  await conn.sendMessage(chatId, { react: { text: "🧾", key: msg.key } });

  // Autorización (owners o el propio bot)
  const sender = msg.key.participant || msg.key.remoteJid;
  const numero = limpiarNumero(sender);
  const fromMe = msg.key.fromMe;
  const botID = limpiarNumero(conn.user?.id || "");
  if (!global.isOwner(numero) && !fromMe && numero !== botID) {
    await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    return conn.sendMessage(chatId, { text: "🚫 Solo los owners o el mismo bot pueden usar este comando." }, { quoted: msg });
  }

  // Validación de argumentos
  if (args.length < 7) {
    return conn.sendMessage(chatId, {
      text:
`✳️ *Uso correcto:*
.${command} <numCliente> <numVendedor> <servicio> <precio> <nombreCliente> <nombreVendedor> <ciclo>

📌 Ejemplo:
.${command} 50784747474 52184848485 netflix 2.99 raul felipe 1d

➕ Notas:
• Los *nombres* sin espacios (usa guiones si hace falta: juan_perez)
• Ciclo: 1m = 1 minuto, 1h = 1 hora, 1d = 1 día (también 30d, 12h, etc.)
• *Responde a una imagen* para usarla como logo de la factura.`,
    }, { quoted: msg });
  }

  // Parseo
  const numCliente = limpiarNumero(args[0]);
  const numVendedor = limpiarNumero(args[1]);
  const servicio = String(args[2]).trim();
  const precio = parseFloat(args[3]);
  const nombreCliente = String(args[4]).replace(/_/g, " ").trim();
  const nombreVendedor = String(args[5]).replace(/_/g, " ").trim();
  const cicloParsed = parseCiclo(args[6]);

  if (!numCliente || !numVendedor || !servicio || isNaN(precio) || !cicloParsed) {
    return conn.sendMessage(chatId, {
      text: "❌ Parámetros inválidos. Revisa el formato y vuelve a intentarlo.",
    }, { quoted: msg });
  }

  // Subir logo (desde cita)
  let logoUrl;
  try {
    logoUrl = await subirLogoDesdeCita(msg);
  } catch (e) {
    await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    return conn.sendMessage(chatId, { text: `❌ ${e.message}` }, { quoted: msg });
  }

  // Preparar registro e imagen
  const fechaCreacion = Date.now();
  const fechaProximoPago = fechaCreacion + cicloParsed.ms;

  const facturaData = {
    id: `FAC-${Date.now()}`,
    servicio,
    precio: Number(precio),
    ciclo: cicloParsed,
    fechaCreacion,
    fechaProximoPago,
    estado: "pagado",
    cliente: { numero: numCliente, nombre: nombreCliente },
    vendedor: { numero: numVendedor, nombre: nombreVendedor },
    logoUrl,
    historial: [
      { fecha: fechaCreacion, evento: "pago", detalle: "Pago inicial registrado (PAGO EXITOSO)" }
    ]
  };

  let buffer;
  try {
    buffer = await generarFacturaPNG({ logoUrl, datos: facturaData });
  } catch (e) {
    await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    return conn.sendMessage(chatId, { text: `❌ Error al generar la factura: ${e.message}` }, { quoted: msg });
  }

  // Guardar facturas.json
  const facturasPath = path.join(process.cwd(), "facturas.json");
  let file = fs.existsSync(facturasPath) ? JSON.parse(fs.readFileSync(facturasPath)) : { facturas: [] };
  if (!Array.isArray(file.facturas)) file.facturas = [];
  file.facturas.push(facturaData);
  fs.writeFileSync(facturasPath, JSON.stringify(file, null, 2));

  // Caption
  const caption =
`🧾 *Factura generada (PAGO EXITOSO)*
📄 ID: ${facturaData.id}
🛠 Servicio: ${servicio}
💵 Precio: $ ${precio.toFixed(2)}
🔁 Ciclo: cada ${cicloParsed.texto}
🗓 Creada: ${formatFecha(fechaCreacion)}
⏭ Próximo pago: ${formatFecha(fechaProximoPago)}

👤 Cliente: ${nombreCliente} (+${numCliente})
🏪 Vendedor: ${nombreVendedor} (+${numVendedor})`;

  // Enviar al chat actual (citando), y también al cliente y vendedor
  await conn.sendMessage(chatId, { image: buffer, caption }, { quoted: msg });

  try {
    await conn.sendMessage(`${numCliente}@s.whatsapp.net`, { image: buffer, caption });
  } catch {}
  try {
    await conn.sendMessage(`${numVendedor}@s.whatsapp.net`, { image: buffer, caption });
  } catch {}

  await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
};

handler.command = ["addfactura"];
module.exports = handler;
