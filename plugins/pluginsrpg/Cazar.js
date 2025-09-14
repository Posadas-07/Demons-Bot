const fs = require("fs");
const path = require("path");

// ===== Helper DIGITS =====
const DIGITS = (s = "") => String(s).replace(/\D/g, "");

// ===== Función para resolver número real =====
async function resolveTarget(conn, chatId, anyJid) {
  const number = DIGITS(anyJid);
  let realJid = null;

  try {
    const meta = await conn.groupMetadata(chatId);
    const raw  = Array.isArray(meta?.participants) ? meta.participants : [];

    const lidParser = participants => {
      return participants.map(v => ({
        id: (typeof v?.id === "string" && v.id.endsWith("@lid") && v.jid) ? v.jid : v.id
      }));
    };
    const norm = lidParser(raw);

    if (anyJid.endsWith("@s.whatsapp.net")) realJid = anyJid;
    else if (anyJid.endsWith("@lid")) {
      const idx = raw.findIndex(p => p?.id === anyJid);
      if (idx >= 0) realJid = raw[idx]?.jid || norm[idx]?.id;
    }
    if (!realJid && number) realJid = `${number}@s.whatsapp.net`;
  } catch {
    if (number) realJid = `${number}@s.whatsapp.net`;
  }

  return { realJid, number };
}

// ===== Constantes Cazar =====
const COOLDOWN_MS = 7 * 60 * 1000; // 7 min
const XP_MASCOTA_BASE = 120;
const XP_HAB_BASE = 60;

const CREDITOS_MIN = 150;
const CREDITOS_MAX = 280;
const XP_MIN = 180;
const XP_MAX = 300;

const TOPE_CREDITOS_DIA = 9000;
const TOPE_XP_DIA = 10000;

const TEXTOS_CAZAR = [
  "🏹 {nombre} fue de cacería con *{mascota}* y ganó 💳 {creditos} créditos y ✨ {xp} XP.",
  "🦌 {nombre} cazó presas con *{mascota}* y obtuvo 💳 {creditos} créditos y ✨ {xp} XP.",
  "🐾 {nombre} rastreó huellas junto a *{mascota}* y recibió 💳 {creditos} créditos y ✨ {xp} XP.",
  "🗡️ {nombre} participó en una cacería épica con *{mascota}* y consiguió 💳 {creditos} créditos y ✨ {xp} XP.",
  "🌲 {nombre} se adentró en el bosque con *{mascota}* y ganó 💳 {creditos} créditos y ✨ {xp} XP.",
  "🦅 {nombre} cazó aves raras junto a *{mascota}* y obtuvo 💳 {creditos} créditos y ✨ {xp} XP.",
  "🐗 {nombre} cazó jabalíes con *{mascota}* y recibió 💳 {creditos} créditos y ✨ {xp} XP."
];

function hoyStrLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ===== Comando cazar =====
const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  // Resolver número real y número limpio
  const { realJid, number } = await resolveTarget(conn, chatId, msg.key.participant || msg.key.remoteJid);

  await conn.sendMessage(chatId, { react: { text: "🏹", key: msg.key } });

  const sukirpgPath = path.join(process.cwd(), "sukirpg.json");
  let db = fs.existsSync(sukirpgPath) ? JSON.parse(fs.readFileSync(sukirpgPath)) : {};
  db.usuarios = Array.isArray(db.usuarios) ? db.usuarios : [];

  // Buscar usuario por número limpio
  const usuario = db.usuarios.find(u => u.number === number);
  if (!usuario) {
    return conn.sendMessage(chatId, { text: "❌ No estás registrado. Usa `.rpg nombre apellido edad fechaNacimiento` para registrarte." }, { quoted: msg });
  }

  if (!Array.isArray(usuario.mascotas) || usuario.mascotas.length === 0) {
    return conn.sendMessage(chatId, { text: "🐾 No tienes una mascota aún. Compra una en la tienda para poder usar este comando." }, { quoted: msg });
  }

  const mascota = usuario.mascotas[0];
  mascota.nivel = mascota.nivel || 1;
  mascota.xp = mascota.xp || 0;
  mascota.habilidades = Array.isArray(mascota.habilidades) && mascota.habilidades.length >= 2
    ? mascota.habilidades
    : [
        { nombre: "Habilidad Mascota 1", nivel: 1, xp: 0 },
        { nombre: "Habilidad Mascota 2", nivel: 1, xp: 0 }
      ];
  for (const h of mascota.habilidades) { h.nivel = h.nivel || 1; h.xp = h.xp || 0; }

  const ahora = Date.now();
  if (usuario.ultimoCazar && (ahora - usuario.ultimoCazar) < COOLDOWN_MS) {
    const falta = Math.ceil((COOLDOWN_MS - (ahora - usuario.ultimoCazar)) / 1000);
    const min = Math.floor(falta / 60), seg = falta % 60;
    return conn.sendMessage(chatId, { text: `⏳ Debes esperar *${min}m ${seg}s* para volver a cazar.` }, { quoted: msg });
  }

  const hoy = hoyStrLocal();
  if (!usuario.cazarDiario || usuario.cazarDiario.fecha !== hoy) {
    usuario.cazarDiario = { fecha: hoy, creditos: 0, xp: 0 };
  }
  const restanteCred = Math.max(0, TOPE_CREDITOS_DIA - (usuario.cazarDiario.creditos || 0));
  const restanteXP = Math.max(0, TOPE_XP_DIA - (usuario.cazarDiario.xp || 0));
  if (restanteCred === 0 && restanteXP === 0) {
    return conn.sendMessage(chatId, { text: `🛑 Límite diario de *cazar* alcanzado.\nHoy ya farmeaste *${TOPE_CREDITOS_DIA} créditos* y *${TOPE_XP_DIA} XP* con este comando.` }, { quoted: msg });
  }

  const creditosRand = Math.floor(Math.random() * (CREDITOS_MAX - CREDITOS_MIN + 1)) + CREDITOS_MIN;
  const xpRand = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
  const creditosOtorgados = Math.min(creditosRand, restanteCred);
  const xpOtorgada = Math.min(xpRand, restanteXP);

  usuario.ultimoCazar = ahora;
  usuario.creditos = (usuario.creditos || 0) + creditosOtorgados;

  // Subir nivel mascota
  let subioNivelMascota = false;
  mascota.xp += xpOtorgada;
  let xpNecesariaMascota = XP_MASCOTA_BASE + (mascota.nivel * 25);
  while (mascota.xp >= xpNecesariaMascota) {
    mascota.xp -= xpNecesariaMascota;
    mascota.nivel += 1;
    subioNivelMascota = true;
    xpNecesariaMascota = XP_MASCOTA_BASE + (mascota.nivel * 25);
  }

  // Subir nivel habilidad
  const idxHab = Math.random() < 0.5 ? 0 : 1;
  const hab = mascota.habilidades[idxHab];
  let habilidadSubida = null;
  if (hab.nivel < 100) {
    hab.xp += xpOtorgada;
    let xpNecesariaHab = XP_HAB_BASE + (hab.nivel * 12);
    while (hab.xp >= xpNecesariaHab && hab.nivel < 100) {
      hab.xp -= xpNecesariaHab;
      hab.nivel += 1;
      habilidadSubida = `${hab.nombre} (Nv ${hab.nivel})`;
      xpNecesariaHab = XP_HAB_BASE + (hab.nivel * 12);
    }
  }

  usuario.cazarDiario.creditos += creditosOtorgados;
  usuario.cazarDiario.xp += xpOtorgada;

  fs.writeFileSync(sukirpgPath, JSON.stringify(db, null, 2));

  // Mensaje final
  const base = TEXTOS_CAZAR[Math.floor(Math.random() * TEXTOS_CAZAR.length)]
    .replace("{nombre}", `${usuario.nombre} ${usuario.apellido}`.trim())
    .replace("{mascota}", mascota.nombre || "tu mascota")
    .replace("{creditos}", creditosOtorgados)
    .replace("{xp}", xpOtorgada);

  let mensajeFinal = base;
  if (subioNivelMascota) mensajeFinal += `\n\n🎉 *¡${mascota.nombre || "Tu mascota"} subió a nivel ${mascota.nivel}!*`;
  if (habilidadSubida) mensajeFinal += `\n\n✨ *Habilidad de mascota mejorada:* ${habilidadSubida}`;

  await conn.sendMessage(chatId, { text: mensajeFinal }, { quoted: msg });
  await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
};

handler.command = ["cazar"];
handler.rpg = true;
module.exports = handler;