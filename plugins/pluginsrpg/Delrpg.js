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

// ===== Pending deletion tracker =====
const pendingDelete = {};

// ===== Comando delrpg =====
module.exports = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  // Resolver número real
  const { realJid, number } = await resolveTarget(conn, chatId, msg.key.participant || msg.key.remoteJid);

  const sukirpgPath = path.join(process.cwd(), "sukirpg.json");
  if (!fs.existsSync(sukirpgPath)) {
    return conn.sendMessage(chatId, { text: "❌ La base de datos RPG aún no existe." }, { quoted: msg });
  }

  let db = JSON.parse(fs.readFileSync(sukirpgPath));
  db.usuarios = db.usuarios || [];
  db.personajes = db.personajes || [];
  db.banco = db.banco || null;

  // Buscar usuario por número limpio
  const usuario = db.usuarios.find(u => u.number === number);
  if (!usuario) {
    return conn.sendMessage(chatId, {
      text: "❌ No estás registrado en el RPG. Usa `.rpg` para registrarte.",
    }, { quoted: msg });
  }

  // Verificar deuda activa en el banco
  const tieneDeudaActiva = Array.isArray(db?.banco?.prestamos) && db.banco.prestamos.some(p => {
    if (String(p.numero) !== number || p.estado !== "activo") return false;
    const prestadoBase = Number(p.cantidadSolicitada ?? p.cantidad ?? 0);
    const totalAPagar = Number.isFinite(p.totalAPagar) ? Number(p.totalAPagar) : Math.ceil(prestadoBase * 1.20);
    const pagado = Number(p.pagado || 0);
    const pendiente = Number.isFinite(p.pendiente) ? Number(p.pendiente) : Math.max(totalAPagar - pagado, 0);
    return pendiente > 0;
  });

  if (tieneDeudaActiva) {
    return conn.sendMessage(chatId, {
      text: "🏦 No puedes eliminar tu RPG porque tienes una *deuda activa* en el banco.\nPágala con *.pagarall* o espera a que el sistema la liquide.",
    }, { quoted: msg });
  }

  // Confirmación de eliminación
  const confirmMsg = await conn.sendMessage(chatId, {
    text: `⚠️ ¿Estás segur@ que deseas eliminar tu cuenta RPG?\n\n📝 *Responde este mensaje escribiendo:*\n*si quiero*`,
  }, { quoted: msg });

  const requestId = confirmMsg.key.id;
  pendingDelete[requestId] = {
    number,    // número limpio
    realJid,   // JID real
    chatId,
    autor: msg.key.participant || msg.key.remoteJid,
    timer: setTimeout(() => {
      delete pendingDelete[requestId];
      conn.sendMessage(chatId, {
        text: "⏳ La solicitud de eliminación RPG ha expirado por inactividad.",
      }, { quoted: confirmMsg });
    }, 2 * 60 * 1000) // 2 minutos
  };

  // Listener único para confirmar eliminación
  if (!conn._delrpgListener) {
    conn._delrpgListener = true;
    conn.ev.on("messages.upsert", async ev => {
      for (const m of ev.messages) {
        if (!m.message || m.key.fromMe) continue;

        const context = m.message?.extendedTextMessage?.contextInfo;
        const citado = context?.stanzaId;
        const texto = (
          m.message?.conversation?.toLowerCase() ||
          m.message?.extendedTextMessage?.text?.toLowerCase() ||
          ""
        ).trim();

        const job = pendingDelete[citado];
        if (!job || texto !== "si quiero") continue;

        const quienContesta = m.key.participant || m.key.remoteJid;
        if (quienContesta !== job.autor) {
          await conn.sendMessage(job.chatId, {
            text: "🚫 Solo quien inició la solicitud puede confirmarla.",
          }, { quoted: m });
          continue;
        }

        // Releer DB
        let db = JSON.parse(fs.readFileSync(sukirpgPath));
        db.usuarios = db.usuarios || [];
        db.personajes = db.personajes || [];
        db.banco = db.banco || null;

        // Verificar deuda activa de nuevo por seguridad
        const deudaActivaAhora = Array.isArray(db?.banco?.prestamos) && db.banco.prestamos.some(p => {
          if (String(p.numero) !== job.number || p.estado !== "activo") return false;
          const prestadoBase = Number(p.cantidadSolicitada ?? p.cantidad ?? 0);
          const totalAPagar = Number.isFinite(p.totalAPagar) ? Number(p.totalAPagar) : Math.ceil(prestadoBase * 1.20);
          const pagado = Number(p.pagado || 0);
          const pendiente = Number.isFinite(p.pendiente) ? Number(p.pendiente) : Math.max(totalAPagar - pagado, 0);
          return pendiente > 0;
        });

        if (deudaActivaAhora) {
          clearTimeout(job.timer);
          delete pendingDelete[citado];
          await conn.sendMessage(job.chatId, {
            text: "🏦 No puedes eliminar tu RPG porque ahora tienes una *deuda activa* en el banco.\nPágala con *.pagarall* o espera a que el sistema la liquide.",
          }, { quoted: m });
          continue;
        }

        // Buscar usuario por número
        const idx = db.usuarios.findIndex(u => u.number === job.number);
        if (idx === -1) {
          await conn.sendMessage(job.chatId, {
            text: "❌ No se encontró tu perfil RPG.",
          }, { quoted: m });
          delete pendingDelete[citado];
          continue;
        }

        const user = db.usuarios[idx];

        // Devolver personajes a la tienda
        if (user.personajes?.length) {
          for (const personaje of user.personajes) {
            db.personajes.push({
              nombre: personaje.nombre,
              imagen: personaje.imagen,
              precio: personaje.precio,
              nivel: personaje.nivel,
              habilidades: personaje.habilidades
            });
          }
        }

        // Eliminar usuario
        db.usuarios.splice(idx, 1);
        clearTimeout(job.timer);
        delete pendingDelete[citado];

        fs.writeFileSync(sukirpgPath, JSON.stringify(db, null, 2));

        await conn.sendMessage(job.chatId, {
          text: `✅ Tu cuenta RPG ha sido eliminada con éxito.\n\n🛒 Tus personajes fueron devueltos a la tienda.`,
        }, { quoted: m });

        await conn.sendMessage(job.chatId, {
          react: { text: "🗑️", key: m.key }
        });
      }
    });
  }
};

module.exports.command = ["delrpg"];