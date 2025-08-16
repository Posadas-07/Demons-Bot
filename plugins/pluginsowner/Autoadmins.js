// plugins/autoadmins.js
const fs = require("fs");
const path = require("path");

// === Helpers LID/REAL ===
const DIGITS = (s = "") => String(s || "").replace(/\D/g, "");

// Quita el sufijo de dispositivo (":xx") y deja sólo el base JID
const baseJid = (jid = "") => {
  if (typeof jid !== "string") return "";
  const left = jid.split(":")[0];                   // "1234" o "1234@s.whatsapp.net"
  return left.includes("@") ? left : `${left}@s.whatsapp.net`;
};
// Devuelve sólo el número del base JID (sin sufijo :xx)
const baseNumber = (jid = "") => DIGITS(baseJid(jid));

// Normaliza: si id es @lid y hay .jid (real), usa el real
function lidParser(participants = []) {
  try {
    return participants.map(v => ({
      id: (typeof v?.id === "string" && v.id.endsWith("@lid") && v.jid)
        ? v.jid
        : v.id,
      admin: v?.admin ?? null,
      raw: v
    }));
  } catch {
    return participants || [];
  }
}

/** Busca por número (del base JID) en la lista cruda/normalizada */
function findByNumber(participants = [], number = "") {
  const raw = participants || [];
  const norm = lidParser(raw);
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i], n = norm[i];
    const candidates = [r?.id, r?.jid, n?.id].filter(Boolean);
    // comparamos contra el número del baseJid, ignorando :xx
    const hit = candidates.some(x => baseNumber(x) === number);
    if (hit) {
      const realJid =
        candidates.find(x => baseJid(x).endsWith("@s.whatsapp.net")) ||
        null;
      const lidJid =
        (typeof r?.id === "string" && r.id.endsWith("@lid")) ? r.id : null;
      const isAdmin =
        (r?.admin === "admin" || r?.admin === "superadmin" ||
         n?.admin === "admin" || n?.admin === "superadmin");
      return { raw: r, norm: n, realJid: realJid && baseJid(realJid), lidJid, isAdmin };
    }
  }
  return { raw: null, norm: null, realJid: null, lidJid: null, isAdmin: false };
}

const handler = async (msg, { conn }) => {
  const chatId   = msg.key.remoteJid;
  const isGroup  = chatId.endsWith("@g.us");
  const senderId = msg.key.participant || msg.key.remoteJid;
  const senderNo = baseNumber(senderId);

  // Reacciona rápido (ignora errores)
  try { await conn.sendMessage(chatId, { react: { text: "⚙️", key: msg.key } }); } catch {}

  if (!isGroup) {
    return conn.sendMessage(chatId, { text: "❌ Este comando solo se puede usar en grupos." }, { quoted: msg });
  }

  // Verificación de owner por número
  const isOwner =
    (Array.isArray(global.owner) && global.owner.some(([id]) => id === senderNo)) ||
    (typeof global.isOwner === "function" && (global.isOwner(senderNo) || global.isOwner(senderId)));

  if (!isOwner) {
    return conn.sendMessage(chatId, { text: "⛔ Solo el *dueño del bot* puede usar este comando." }, { quoted: msg });
  }

  // Metadata
  let meta;
  try {
    meta = await conn.groupMetadata(chatId);
  } catch (e) {
    console.error("[autoadmins] metadata error:", e);
    return conn.sendMessage(chatId, { text: "❌ No pude leer la información del grupo." }, { quoted: msg });
  }
  const participants = Array.isArray(meta?.participants) ? meta.participants : [];

  // Identificar BOT y OWNER por número (robusto en LID y no-LID)
  const botNo = baseNumber(conn?.user?.id || conn?.user?.jid || "");
  const botInfo   = findByNumber(participants, botNo);
  const ownerInfo = findByNumber(participants, senderNo);

  // Bot debe ser admin para promover
  if (!botInfo.isAdmin) {
    // Extra: intenta detectar por JID base, por si el número no encontró
    const maybeBot = participants.find(p => baseNumber(p?.id) === botNo || baseNumber(p?.jid) === botNo);
    const maybeIsAdmin = !!(maybeBot && (maybeBot.admin === "admin" || maybeBot.admin === "superadmin"));
    if (!maybeIsAdmin) {
      return conn.sendMessage(chatId, { text: "⚠️ *El bot no tiene permisos de administrador en este grupo.*" }, { quoted: msg });
    }
  }

  // Si el owner ya es admin, avisar
  if (ownerInfo.isAdmin) {
    return conn.sendMessage(chatId, { text: "✅ *Ya eres administrador del grupo.*" }, { quoted: msg });
  }

  // Elegir el JID correcto para promover:
  // - En LID: usar el id crudo (raw.id) que aparece en la metadata (suele ser @lid)
  // - Si no hay raw, usar el real si lo tenemos, o construir por número
  const targetForUpdate =
    (ownerInfo.raw?.id) ||
    ownerInfo.realJid ||
    (senderNo ? `${senderNo}@s.whatsapp.net` : baseJid(senderId));

  // Para mencionar, preferimos el real (clickable) si existe
  const mentionId = ownerInfo.realJid || targetForUpdate;

  try {
    await conn.groupParticipantsUpdate(chatId, [targetForUpdate], "promote");
    try { await conn.sendMessage(chatId, { react: { text: "👑", key: msg.key } }); } catch {}
    await conn.sendMessage(
      chatId,
      {
        text: `👑 *Has reclamado tu trono, mi dueño, mi rey.*\nAhora eres *administrador* del grupo.`,
        mentions: [mentionId]
      },
      { quoted: msg }
    );
  } catch (e) {
    console.error("❌ Error al promover al owner:", e);
    await conn.sendMessage(chatId, { text: "❌ No se pudo otorgar admin. Verifica si el bot tiene permisos suficientes." }, { quoted: msg });
  }
};

handler.command = ["autoadmins", "reclaim"];
module.exports = handler;
