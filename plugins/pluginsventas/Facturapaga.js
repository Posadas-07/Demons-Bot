// plugins/facturapaga.js
// Uso: .facturapaga <numeroCliente> <servicio>
// Alias: .facpaga
// Reinicia el ciclo creando una NUEVA factura PAGADA (mismo estilo que addfactura)
// reutilizando precio, ciclo, nombres, números y logo de la última factura del cliente/servicio.

const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

function limpiarNumero(n) {
  return String(n || "").replace(/\D/g, "");
}

function formatFecha(ts) {
  const d = new Date(ts);
  try {
    return d.toLocaleString("es-ES", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return new Date(ts).toLocaleString();
  }
}

async function generarFacturaPagaPNG({ logoUrl, datos }) {
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
    // Si falla el logo, seguimos sin romper
  }

  // Título
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px Sans-Serif";
  ctx.fillText("FACTURA • PAGO EXITOSO", 140, 55);

  ctx.font = "16px Sans-Serif";
  ctx.fillText(`Generada: ${formatFecha(datos.fechaCreacion)}`, 140, 85);

  // Caja de datos
  const boxX = 40, boxY = 150, boxW = W - 80, boxH = 360;
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 24px Sans-Serif";
  ctx.fillText("Detalle de la Factura", boxX + 20, boxY + 40);

  ctx.font = "18px Sans-Serif";
  const L = 30;
  let yy = boxY + 80;

  ctx.fillText(`Servicio: ${datos.servicio}`, boxX + 20, yy); yy += L;
  ctx.fillText(`Precio: $ ${Number(datos.precio).toFixed(2)}`, boxX + 20, yy); yy += L;
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
  await conn.sendMessage(chatId, { react: { text: "💳", key: msg.key } });

  // Auth: owners o el propio bot
  const sender = msg.key.participant || msg.key.remoteJid;
  const numero = limpiarNumero(sender);
  const fromMe = msg.key.fromMe;
  const botID = limpiarNumero(conn.user?.id || "");
  if (!global.isOwner(numero) && !fromMe && numero !== botID) {
    await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    return conn.sendMessage(chatId, { text: "🚫 Solo los owners o el mismo bot pueden usar este comando." }, { quoted: msg });
  }

  // Validación de argumentos
  if (args.length < 2) {
    return conn.sendMessage(chatId, {
      text:
`✳️ *Uso correcto:*
.${command} <numeroCliente> <servicio>

📌 Ejemplo:
.${command} 52163xxxxxxxx netflix`,
    }, { quoted: msg });
  }

  const numeroCliente = limpiarNumero(args[0]);
  const servicio = String(args.slice(1).join(" ")).toLowerCase().trim();
  if (!numeroCliente || !servicio) {
    return conn.sendMessage(chatId, { text: "❌ Parámetros inválidos.", quoted: msg });
  }

  // Leer facturas.json
  const filePath = path.join(process.cwd(), "facturas.json");
  if (!fs.existsSync(filePath)) {
    return conn.sendMessage(chatId, { text: "📂 Aún no existe *facturas.json*.", quoted: msg });
  }

  let db;
  try {
    db = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error("[facturapaga] Error leyendo facturas.json:", e);
    return conn.sendMessage(chatId, { text: "❌ Error leyendo *facturas.json*.", quoted: msg });
  }
  db.facturas = Array.isArray(db.facturas) ? db.facturas : [];

  // Buscar la MÁS RECIENTE del cliente/servicio
  const candidatas = db.facturas
    .filter(f =>
      limpiarNumero(f?.cliente?.numero) === numeroCliente &&
      String(f?.servicio || "").toLowerCase().trim() === servicio
    );

  if (candidatas.length === 0) {
    return conn.sendMessage(chatId, {
      text: `🔎 No hay facturas para:\n• Cliente: *${numeroCliente}*\n• Servicio: *${servicio}*`,
      quoted: msg
    });
  }

  const base = candidatas
    .slice()
    .sort((a, b) => Number(b.fechaCreacion || 0) - Number(a.fechaCreacion || 0))[0];

  // Armar nueva factura PAGADA con el MISMO esquema de la factura base
  const ahora = Date.now();
  const ciclo = base?.ciclo || { valor: 1, unidad: "d", ms: 24 * 60 * 60 * 1000, texto: "1d" };
  const nuevo = {
    id: `FAC-${Date.now()}`,
    servicio: base.servicio,
    precio: Number(base.precio || 0),
    ciclo,
    fechaCreacion: ahora,
    fechaProximoPago: ahora + Number(ciclo.ms || 0),
    estado: "pagado",
    cliente: { numero: limpiarNumero(base?.cliente?.numero), nombre: base?.cliente?.nombre || "-" },
    vendedor: { numero: limpiarNumero(base?.vendedor?.numero), nombre: base?.vendedor?.nombre || "-" },
    logoUrl: base?.logoUrl || "",
    historial: [
      { fecha: ahora, evento: "pago", detalle: "Pago registrado (PAGO EXITOSO)" }
    ]
  };

  // Generar imagen
  let buffer;
  try {
    buffer = await generarFacturaPagaPNG({ logoUrl: nuevo.logoUrl, datos: nuevo });
  } catch (e) {
    console.error("[facturapaga] Error generando PNG:", e);
    await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } });
    return conn.sendMessage(chatId, { text: `❌ Error al generar la factura: ${e.message}` }, { quoted: msg });
  }

  // Guardar nueva factura
  try {
    db.facturas.push(nuevo);
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("[facturapaga] Error guardando facturas.json:", e);
    return conn.sendMessage(chatId, { text: "❌ Error guardando *facturas.json*.", quoted: msg });
  }

  // Caption al estilo addfactura
  const caption =
`🧾 *Factura generada (PAGO EXITOSO)*
📄 ID: ${nuevo.id}
🛠 Servicio: ${nuevo.servicio}
💵 Precio: $ ${Number(nuevo.precio).toFixed(2)}
🔁 Ciclo: cada ${nuevo.ciclo.texto}
🗓 Creada: ${formatFecha(nuevo.fechaCreacion)}
⏭ Próximo pago: ${formatFecha(nuevo.fechaProximoPago)}

👤 Cliente: ${nuevo.cliente.nombre} (+${nuevo.cliente.numero})
🏪 Vendedor: ${nuevo.vendedor.nombre} (+${nuevo.vendedor.numero})`;

  // Enviar al chat actual (citando), y también al cliente y vendedor
  await conn.sendMessage(chatId, { image: buffer, caption }, { quoted: msg });

  const cliJid = `${nuevo.cliente.numero}@s.whatsapp.net`;
  const venJid = `${nuevo.vendedor.numero}@s.whatsapp.net`;
  try { await conn.sendMessage(cliJid, { image: buffer, caption }); } catch (e) {}
  try { await conn.sendMessage(venJid, { image: buffer, caption }); } catch (e) {}

  await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
};

handler.command = ["facturapaga", "facpaga"];
module.exports = handler;
