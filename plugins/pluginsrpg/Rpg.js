const fs = require("fs");
const path = require("path");

// Helper para obtener solo los dígitos del usuario
function getNumero(id) {
  return id.replace(/[^0-9]/g, "");
}

// Ruta absoluta de la base de datos
const sukirpgPath = path.resolve(__dirname, "../sukirpg.json");

// Leer la base de datos desde disco
function leerDB() {
  if (!fs.existsSync(sukirpgPath)) return { usuarios: [], mascotas: [] };
  return JSON.parse(fs.readFileSync(sukirpgPath, "utf-8"));
}

// Guardar la base de datos en disco
function guardarDB(db) {
  fs.writeFileSync(sukirpgPath, JSON.stringify(db, null, 2));
}

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const numero = getNumero(msg.key.participant || msg.key.remoteJid);

  await conn.sendMessage(chatId, { react: { text: "📥", key: msg.key } });

  if (args.length < 4) {
    return conn.sendMessage(chatId, {
      text: `✳️ *Uso correcto:*\n.rpg Nombre Apellido Edad FechaNacimiento\n\n📌 Ejemplo:\n.rpg Cholo xyz 17 09/09/1998`
    }, { quoted: msg });
  }

  const [nombre, apellido, edad, fechaNacimiento] = args;

  // Leer DB siempre desde disco antes de cualquier operación
  let db = leerDB();

  // Inicializar arrays si no existen
  if (!db.usuarios) db.usuarios = [];
  if (!db.mascotas) db.mascotas = [];

  // Verificar si ya está registrado
  if (db.usuarios.find(u => u.numero === numero)) {
    return conn.sendMessage(chatId, {
      text: "⚠️ Ya estás registrado en el RPG. Usa `.nivel` para ver tus datos.",
      quoted: msg
    });
  }

  // Pasos de registro
  const steps = [
    "🧠 Procesando tu registro...",
    "🔍 Buscando tus habilidades...",
    "📜 Verificando tu fecha de nacimiento...",
    "🎒 Preparando tu cartera inicial...",
    "🐾 Asignando compañero mascota...",
    "💳 Generando tus créditos de bienvenida...",
    "✅ Registro casi completo...",
    "🎉 ¡Bienvenido al mundo RPG de *La Suki Bot*!"
  ];

  let { key } = await conn.sendMessage(chatId, { text: steps[0] }, { quoted: msg });
  for (let i = 1; i < steps.length; i++) {
    await new Promise(r => setTimeout(r, 1050));
    await conn.sendMessage(chatId, {
      text: steps[i],
      edit: key
    }, { quoted: msg });
  }

  // Asignar habilidades
  const habilidadesDisponibles = [
    "🔥 Fuego Interior", "⚡ Descarga Rápida", "🧊 Hielo Mental", "🌪️ Golpe de Viento",
    "💥 Explosión Controlada", "🧠 Concentración", "🌀 Vórtice Arcano", "👊 Impacto Bestial"
  ];
  const habilidad1 = habilidadesDisponibles[Math.floor(Math.random() * habilidadesDisponibles.length)];
  let habilidad2;
  do {
    habilidad2 = habilidadesDisponibles[Math.floor(Math.random() * habilidadesDisponibles.length)];
  } while (habilidad2 === habilidad1);

  // Mascota inicial
  let mascotasUsuario = [];
  let mascotaNombre = "❌ No hay mascotas en la tienda para asignar.";
  if (db.mascotas.length > 0) {
    const mascotaRandom = db.mascotas[Math.floor(Math.random() * db.mascotas.length)];
    const mascotaFormateada = {
      nombre: mascotaRandom.nombre,
      imagen: mascotaRandom.imagen,
      precio: mascotaRandom.precio,
      nivel: 1,
      habilidades: mascotaRandom.habilidades.map(h => ({ ...h }))
    };
    mascotasUsuario.push(mascotaFormateada);
    mascotaNombre = `🐾 *Mascota inicial:* ${mascotaFormateada.nombre}`;
  }

  // Crear usuario
  const usuario = {
    numero,
    nombre,
    apellido,
    edad,
    fechaNacimiento,
    nivel: 1,
    creditos: Math.floor(Math.random() * 1000) + 1,
    guardado: 0,
    habilidades: [
      { nombre: habilidad1, nivel: 1 },
      { nombre: habilidad2, nivel: 1 }
    ],
    mascotas: mascotasUsuario
  };

  db.usuarios.push(usuario);
  guardarDB(db); // Guardar inmediatamente después de registrar

  // Texto final
  const texto = `🎉 *¡Bienvenido al RPG de La Suki Bot!*\n\n` +
                `👤 *Nombre:* ${nombre} ${apellido}\n` +
                `📅 *Edad:* ${edad} años\n` +
                `🎂 *Fecha de Nacimiento:* ${fechaNacimiento}\n` +
                `💳 *Créditos recibidos:* ${usuario.creditos}\n` +
                `📦 *Saldo guardado:* ${usuario.guardado}\n` +
                `📈 *Nivel inicial:* ${usuario.nivel}\n\n` +
                `🌀 *Tus habilidades iniciales:*\n` +
                `1. ${habilidad1} (Nivel 1)\n` +
                `2. ${habilidad2} (Nivel 1)\n\n` +
                `${mascotaNombre}\n\n` +
                `✨ Usa:\n` +
                `- *.nivelmascota* Mira los comandos y sube de nivel tu mascota\n` +
                `- *.nivel* Mira los comandos para subir de nivel\n` +
                `- *.saldo* Para ver tu saldo disponible\n\n` +
                `¡Empieza tu aventura ahora! 🚀`;

  await conn.sendMessage(chatId, {
    image: { url: "https://cdn.russellxz.click/3f6baa71.jpeg" },
    caption: texto
  }, { quoted: msg });

  await conn.sendMessage(chatId, {
    react: { text: "🎮", key: msg.key }
  });
};

handler.command = ["rpg"];
module.exports = handler;