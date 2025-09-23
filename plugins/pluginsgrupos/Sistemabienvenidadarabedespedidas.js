const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { getConfig } = requireFromRoot("db");
// Cache global de admins por chat
const adminCache = {};
// ==== HELPERS LID/REAL ====
const DIGITS = (s = "") => String(s || "").replace(/\D/g, "");

/** Si id es @lid y existe .jid (real), usa el real */
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

/** Con metadata y un JID (real o @lid) → { realJid, lidJid, number } */
function resolveRealFromMeta(meta, anyJid) {
  const out = { realJid: null, lidJid: null, number: null };
  const raw  = Array.isArray(meta?.participants) ? meta.participants : [];
  const norm = lidParser(raw);

  if (typeof anyJid === "string" && anyJid.endsWith("@s.whatsapp.net")) {
    out.realJid = anyJid;
    for (let i = 0; i < raw.length; i++) {
      if (norm[i]?.id === out.realJid && typeof raw[i]?.id === "string" && raw[i].id.endsWith("@lid")) {
        out.lidJid = raw[i].id;
        break;
      }
    }
  } else if (typeof anyJid === "string" && anyJid.endsWith("@lid")) {
    out.lidJid = anyJid;
    const idx = raw.findIndex(p => p?.id === anyJid);
    if (idx >= 0) {
      const w = raw[idx];
      if (typeof w?.jid === "string" && w.jid.endsWith("@s.whatsapp.net")) out.realJid = w.jid;
      else if (typeof norm[idx]?.id === "string" && norm[idx].id.endsWith("@s.whatsapp.net")) out.realJid = norm[idx].id;
    }
  }

  out.number = DIGITS(out.realJid || "");
  return out;
}
// ==== FIN HELPERS ====
const handler = async (conn) => {
  conn.ev.on("group-participants.update", async (update) => {
    try {
      const chatId = update.id;
      const isGroup = chatId.endsWith("@g.us");
      if (!isGroup) return;

      if (!adminCache[chatId]) {
        const oldMeta = await conn.groupMetadata(chatId);
        adminCache[chatId] = new Set(
          oldMeta.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id)
        );
      }

      const welcomeActive = await getConfig(chatId, "welcome");
      const byeActive = await getConfig(chatId, "despedidas");
      const antiArabe = await getConfig(chatId, "antiarabe");

      const setwelcomePath = path.resolve("setwelcome.json");
      const personalizados = fs.existsSync(setwelcomePath)
        ? JSON.parse(fs.readFileSync(setwelcomePath, "utf-8"))[chatId] || {}
        : {};

      const bienvenidaPersonalizada = personalizados?.bienvenida;
      const despedidaPersonalizada = personalizados?.despedida;

      const arabes = [
        "20", "212", "213", "216", "218", "222", "224", "230", "234", "235", "237", "238", "249",
        "250", "251", "252", "253", "254", "255", "257", "258", "260", "263", "269", "960", "961",
        "962", "963", "964", "965", "966", "967", "968", "970", "971", "972", "973", "974", "975",
        "976", "980", "981", "992", "994", "995", "998"
      ];

      const metadata = await conn.groupMetadata(chatId);

      // 🔒 INICIO SISTEMA DE PROTECCIÓN Y AVISO DE CAMBIOS DE ADMIN 🔒
      const botId     = conn.user.id.split(':')[0] + '@s.whatsapp.net';
      const configPath = path.resolve('setwelcome.json');
      const data      = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        : {};

      const whiteList = data.lista || [];
      data[chatId] = data[chatId] || {};
      data[chatId].blacklistAdmins = data[chatId].blacklistAdmins || {};
      const blacklist = data[chatId].blacklistAdmins;

      if (update.action === 'demote' && update.participants?.length) {
        const actor  = update.author;
        const target = update.participants[0];

        if (whiteList.includes(actor)) return;

        if (actor && target && actor !== target && actor !== botId) {
          const now = Date.now();
          blacklist[actor] = now + 24 * 60 * 60 * 1000;
          fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
          await conn.groupParticipantsUpdate(chatId, [actor], 'demote').catch(() => {});
          await conn.sendMessage(chatId, {
            text: `
🚨 *VIOLACIÓN DE POLÍTICA DE ADMINISTRACIÓN*

⚠️ El admin @${actor.split('@')[0]} quitó permisos de admin a @${target.split('@')[0]}.

🕒 Su rol ha sido revocado por *24 horas*.

🔰 Para eximir a un admin de este sistema de castigo, usa *\/addlista @usuario*.
🧯 Para restaurar este admin antes de tiempo, usa *\/restpro @${actor.split('@')[0]}*.
            `.trim(),
            mentions: [actor, target]
          });
        }
      }

      if (update.action === 'remove' && update.participants?.length) {
        const actor  = update.author;
        const target = update.participants[0];

        if (!whiteList.includes(actor) && actor && target && actor !== target && actor !== botId) {
          const oldAdmins = adminCache[chatId] || new Set();
          if (oldAdmins.has(target)) {
            const now = Date.now();
            blacklist[actor] = now + 24 * 60 * 60 * 1000;
            fs.writeFileSync(configPath, JSON.stringify(data, null, 2));

            await conn.groupParticipantsUpdate(chatId, [actor], 'demote').catch(() => {});
            await conn.sendMessage(chatId, {
              text: `
🚨 *ADMINISTRADOR EXPULSADO*

❌ El admin @${actor.split('@')[0]} eliminó a @${target.split('@')[0]} del grupo.

⛔ Sólo se castiga cuando la víctima era OTRO ADMIN.

🕒 Su rol ha sido revocado por *24 horas*.

🔰 Exime con: *\/addlista @usuario*.
              `.trim(),
              mentions: [actor, target]
            });
          }
        }
      }

      for (const id of update.participants || []) {
        const pInfo     = metadata.participants.find(p => p.id === id);
        const isNowAdmin = pInfo?.admin === 'admin' || pInfo?.admin === 'superadmin';
        const until      = blacklist[id];

        if (isNowAdmin && until && Date.now() < until) {
          if (whiteList.includes(id)) continue;

          await conn.groupParticipantsUpdate(chatId, [id], 'demote').catch(() => {});
          await conn.sendMessage(chatId, {
            text: `
🚫 @${id.split('@')[0]} está castigado por conducta indebida.

⏳ No podrá ser admin hasta que pasen 24 horas.

🔰 Para eximir a un admin de este castigo, usa *\/addlista @${id.split('@')[0]}*.
            `.trim(),
            mentions: [id]
          });
        }
      }

      if (update.action === "promote" && update.participants?.length) {
        const actor = update.author;
        const target = update.participants[0];
        if (actor && target) {
          const texto = `
╭──『 👑 *NUEVO ADMIN* 』─◆
│ 👤 Usuario: @${target.split("@")[0]}
│ ✅ Ascendido por: @${actor.split("@")[0]}
╰────────────────────◆`.trim();

          await conn.sendMessage(chatId, {
            text: texto,
            mentions: [actor, target]
          });
        }
      }
      // 🔒 FIN SISTEMA DE PROTECCIÓN Y AVISO DE CAMBIOS DE ADMIN 🔒

      for (const participant of update.participants) {
        const { realJid, lidJid, number } = resolveRealFromMeta(metadata, participant);
        const mentionId = realJid || participant;
        const mention = `@${number || participant.split("@")[0]}`;

        // ==== BLOQUE DE BIENVENIDA Y DESPEDIDA (MODIFICADO) ====
if (update.action === "add") {
  if (welcomeActive != 1) continue;

  const isArabic = (antiArabe == 1) && number && arabes.some(cc => number.startsWith(cc));
  if (isArabic) {
    const info = metadata.participants.find(p => p.id === participant);
    const isAdmin = info?.admin === "admin" || info?.admin === "superadmin";
    const isOwner = global.isOwner && (global.isOwner(number) || global.isOwner(mentionId));
    if (!isAdmin && !isOwner) {
      await conn.sendMessage(chatId, {
        text: `🚫 ${mention} tiene un prefijo prohibido y será eliminado.`,
        mentions: [mentionId]
      });
      try { 
        await conn.groupParticipantsUpdate(chatId, [participant], "remove"); 
      } catch {}
      continue;
    }
  }

  // FOTO DE PERFIL O IMAGEN POR DEFECTO
  let perfilURL;
  try {
    perfilURL = await conn.profilePictureUrl(participant, "image");
  } catch {
    perfilURL = "https://cdn.russellxz.click/88034510.jpeg";
  }

  await conn.sendMessage(chatId, {
    video: { url: "https://cdn.russellxz.click/09c22a33.mp4" },
    caption: `👋 ${mention}\n\n${bienvenidaPersonalizada || "¡Bienvenid@ al grupo! 🎉"}`,
    mentions: [mentionId],
    contextInfo: {
      externalAdReply: {
        title: "👥 Nuevo integrante",
        body: bienvenidaPersonalizada || "¡Bienvenid@ a la familia!",
        thumbnailUrl: perfilURL, // 👈 Aquí va la foto del usuario o la de fallback
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  });

} else if (update.action === "remove" && byeActive == 1) {
  // FOTO DE PERFIL O IMAGEN POR DEFECTO
  let perfilURL;
  try {
    perfilURL = await conn.profilePictureUrl(participant, "image");
  } catch {
    perfilURL = "https://cdn.russellxz.click/88034510.jpeg";
  }

  await conn.sendMessage(chatId, {
    video: { url: "https://cdn.russellxz.click/7adfbd24.mp4" },
    caption: `👋 ${mention}\n\n${despedidaPersonalizada || "¡Hasta luego! 😢"}`,
    mentions: [mentionId],
    contextInfo: {
      externalAdReply: {
        title: "👥 Alguien salió",
        body: despedidaPersonalizada || "Le diremos adiós con cariño ✨",
        thumbnailUrl: perfilURL, // 👈 Aquí va la foto del usuario o la de fallback
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  });
}
// ==== FIN BLOQUE BIENVENIDA/DESPEDIDA ====

      const newMeta = await conn.groupMetadata(chatId);
      adminCache[chatId] = new Set(
        newMeta.participants
          .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
          .map(p => p.id)
      );

    } catch (err) {
      console.error("❌ Error en lógica de grupo:", err);
    }
  });
};

handler.run = handler;
module.exports = handler;