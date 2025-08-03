const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const { readdirSync } = require("fs");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const figlet = require("figlet");
const readline = require("readline");
const pino = require("pino");
const { setConfig, getConfig } = require("./db");
// 🌐 Prefijos personalizados desde prefijos.json o por defecto
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
let defaultPrefixes = [".", "#"];
const prefixPath = "./prefijos.json";
global.requireFromRoot = (mod) => require(path.join(__dirname, mod));
if (fs.existsSync(prefixPath)) {
  try {
    const contenido = fs.readFileSync(prefixPath, "utf-8").trim();
    const parsed = JSON.parse(contenido);
    if (Array.isArray(parsed)) {
      defaultPrefixes = parsed;
    } else if (typeof parsed === "string") {
      defaultPrefixes = [parsed];
    }
  } catch {}
}
global.prefixes = defaultPrefixes;

// 🧑‍💼 Owners desde owner.json
const ownerPath = "./owner.json";
if (!fs.existsSync(ownerPath)) fs.writeFileSync(ownerPath, JSON.stringify([["15167096032"]], null, 2));
global.owner = JSON.parse(fs.readFileSync(ownerPath));

// 📂 Cargar plugins
const loadPluginsRecursively = (dir) => {
  if (!fs.existsSync(dir)) return;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      loadPluginsRecursively(fullPath); // Recurse en subcarpetas
    } else if (item.isFile() && item.name.endsWith(".js")) {
      try {
        const plugin = require(path.resolve(fullPath));
        global.plugins.push(plugin);
        console.log(chalk.green(`✅ Plugin cargado: ${fullPath}`));
      } catch (err) {
        console.log(chalk.red(`❌ Error al cargar ${fullPath}: ${err}`));
      }
    }
  }
};

// 👉 Cargar todos los .js dentro de ./plugins y subcarpetas
global.plugins = [];
loadPluginsRecursively("./plugins");
// 🎯 Función global para verificar si es owner
global.isOwner = function (jid) {
  const num = jid.replace(/[^0-9]/g, "");
  return global.owner.some(([id]) => id === num);
};

// 🎨 Banner y opciones
console.log(chalk.cyan(figlet.textSync("Suki 3.0 Bot", { font: "Standard" })));
console.log(chalk.green("\n✅ Iniciando conexión...\n"));
console.log(chalk.green("  [Hola] ") + chalk.white("🔑 Ingresar Tu Numero(Ej: 54911XXXXXX)\n"));

// 📞 Entrada de usuario
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let method = "1";
let phoneNumber = "";

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState("./sessions");

  if (!fs.existsSync("./sessions/creds.json")) {
    method = await question(chalk.magenta("📞(VAMOS AYA😎): "));
    phoneNumber = method.replace(/\D/g, "");
    if (!phoneNumber) {
      console.log(chalk.red("\n❌ Número inválido."));
      process.exit(1);
    }
    method = "2";
  }

  async function startBot() {
    try {
      const { version } = await fetchLatestBaileysVersion();
      const sock = makeWASocket({ 
        version,
        logger: pino({ level: "silent" }),
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: method === "1" ? ["AzuraBot", "Safari", "1.0.0"] : ["Ubuntu", "Chrome", "20.0.04"],
        printQRInTerminal: method === "1",
      });
// 🧠 Ejecutar plugins con eventos especiales como bienvenida
for (const plugin of global.plugins) {
  if (typeof plugin.run === "function") {
    try {
      plugin.run(sock); // ahora sí existe sock
      console.log(chalk.magenta("🧠 Plugin con eventos conectado"));
    } catch (e) {
      console.error(chalk.red("❌ Error al ejecutar evento del plugin:"), e);
    }
  }
}
      
      if (!fs.existsSync("./sessions/creds.json") && method === "2") {
        setTimeout(async () => {
          const code = await sock.requestPairingCode(phoneNumber);
          console.log(chalk.magenta("🔑 Código de vinculación: ") + chalk.yellow(code.match(/.{1,4}/g).join("-")));
        }, 2000);
      }
//bienvenidad sistema


      
      // 💬 Manejo de mensajes
sock.ev.on("messages.upsert", async ({ messages }) => {
  const m = messages[0];
  if (!m || !m.message) return;
  global.mActual = m; // 👈 Para debug si quieres luego ver mActual en consola
  const chatId = m.key.remoteJid;
  const sender = m.key.participant || m.key.remoteJid;
  const fromMe = m.key.fromMe || sender === sock.user.id;
  const isGroup = chatId.endsWith("@g.us");

  const messageContent =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    "";

  console.log(chalk.yellow(`\n📩 Nuevo mensaje recibido`));
  console.log(chalk.green(`📨 De: ${fromMe ? "[Tú]" : "[Usuario]"} ${chalk.bold(sender)}`));
  console.log(chalk.cyan(`💬 Tipo: ${Object.keys(m.message)[0]}`));
  console.log(chalk.cyan(`💬 Texto: ${chalk.bold(messageContent || "📂 (Multimedia)")}`));

//fin de la logica modo admins         
// ——— Presentación automática (solo una vez por grupo) ———
  if (isGroup) {
    const welcomePath = path.resolve("setwelcome.json");
    // Asegurarnos de que existe y cargar
    if (!fs.existsSync(welcomePath)) fs.writeFileSync(welcomePath, "{}");
    const welcomeData = JSON.parse(fs.readFileSync(welcomePath, "utf-8"));

    welcomeData[chatId] = welcomeData[chatId] || {};
    if (!welcomeData[chatId].presentationSent) {
      // Enviar vídeo de presentación
      await sock.sendMessage(chatId, {
        video: { url: "https://cdn.russellxz.click/bc06f25b.mp4" },
        caption: `
🎉 ¡Hola a todos! 🎉

👋 Soy *La Suki Bot*, un bot programado 🤖.  
📸 A veces reacciono o envío multimedia porque así me diseñaron.  

⚠️ *Lo que diga no debe ser tomado en serio.* 😉

📌 Usa el comando *.menu* o *.menugrupo* para ver cómo usarme y programar cosas.  
Soy un bot *sencillo y fácil de usar*, ¡gracias por tenerme en el grupo! 💖  
        `.trim()
      });
      // Marcar como enviado y guardar
      welcomeData[chatId].presentationSent = true;
      fs.writeFileSync(welcomePath, JSON.stringify(welcomeData, null, 2));
    }
  }
  //fin de la logica
  
// === INICIO LÓGICA CHATGPT POR GRUPO CON activos.db ===
try {
  const { getConfig } = requireFromRoot("db");
  const isGroup = m.key.remoteJid.endsWith("@g.us");
  const chatId = m.key.remoteJid;
  const fromMe = m.key.fromMe;

  const chatgptActivo = await getConfig(chatId, "chatgpt");

  const messageText = m.message?.conversation ||
                      m.message?.extendedTextMessage?.text ||
                      m.message?.imageMessage?.caption ||
                      m.message?.videoMessage?.caption || "";

  if (isGroup && chatgptActivo == 1 && !fromMe && messageText.length > 0) {
    const encodedText = encodeURIComponent(messageText);
    const sessionID = "1727468410446638";
    const apiUrl = `https://api.neoxr.eu/api/gpt4-session?q=${encodedText}&session=${sessionID}&apikey=russellxz`;

    const axios = require("axios");
    const res = await axios.get(apiUrl);
    const respuesta = res.data?.data?.message;

    if (respuesta) {
      await sock.sendMessage(chatId, {
        text: respuesta
      }, { quoted: m });
    }
  }
} catch (e) {
  console.error("❌ Error en lógica ChatGPT por grupo:", e);
}
// === FIN LÓGICA CHATGPT POR GRUPO CON activos.db ===
// === LÓGICA DE RESPUESTA AUTOMÁTICA CON PALABRA CLAVE (adaptada) ===
try {
  const guarPath = path.resolve('./guar.json');
  if (fs.existsSync(guarPath)) {
    const guarData = JSON.parse(fs.readFileSync(guarPath, 'utf-8'));
    const cleanText = messageContent
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w]/g, '');

    for (const key of Object.keys(guarData)) {
      const cleanKey = key
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w]/g, '');

      if (cleanText === cleanKey && guarData[key]?.length) {
        const item = guarData[key][Math.floor(Math.random() * guarData[key].length)];
        const buffer = Buffer.from(item.media, "base64");
        const extension = item.ext || item.mime?.split("/")[1] || "bin";
        const mime = item.mime || "";

        const options = { quoted: m };
        let payload = {};

        if (["jpg", "jpeg", "png"].includes(extension)) {
          payload.image = buffer;
        } else if (["mp4", "mkv", "webm"].includes(extension)) {
          payload.video = buffer;
        } else if (["mp3", "ogg", "opus"].includes(extension)) {
          payload.audio = buffer;
          payload.mimetype = mime || "audio/mpeg";
          payload.ptt = false;
        } else if (["webp"].includes(extension)) {
          payload.sticker = buffer;
        } else {
          payload.document = buffer;
          payload.mimetype = mime || "application/octet-stream";
          payload.fileName = `archivo.${extension}`;
        }

        await sock.sendMessage(chatId, payload, options);
        return;
      }
    }
  }
} catch (e) {
  console.error("❌ Error en lógica de palabra clave:", e);
}
// === FIN DE LÓGICA ===  
  
// === ⛔ INICIO LÓGICA ANTIS STICKERS (bloqueo tras 3 strikes en 15s) ===
try {
  const chatId = m.key.remoteJid;
  const fromMe = m.key.fromMe;
  const isGroup = chatId.endsWith("@g.us");
  const stickerMsg = m.message?.stickerMessage || m.message?.ephemeralMessage?.message?.stickerMessage;

  if (isGroup && !fromMe && stickerMsg) {
    const { getConfig } = requireFromRoot("db");
    const antisActivo = await getConfig(chatId, "antis");

    if (antisActivo == 1) {
      const user = m.key.participant || m.key.remoteJid;
      const now = Date.now();

      if (!global.antisSpam) global.antisSpam = {};
      if (!global.antisSpam[chatId]) global.antisSpam[chatId] = {};
      if (!global.antisBlackList) global.antisBlackList = {};

      const userData = global.antisSpam[chatId][user] || {
        count: 0,
        last: now,
        warned: false,
        strikes: 0
      };

      const timePassed = now - userData.last;

      if (timePassed > 15000) {
        userData.count = 1;
        userData.last = now;
        userData.warned = false;
        userData.strikes = 0;

        if (global.antisBlackList[chatId]?.includes(user)) {
          global.antisBlackList[chatId] = global.antisBlackList[chatId].filter(u => u !== user);
        }
      } else {
        userData.count++;
        userData.last = now;
      }

      global.antisSpam[chatId][user] = userData;

      if (userData.count === 5) {
        await sock.sendMessage(chatId, {
          text: `⚠️ @${user.split("@")[0]} has enviado *5 stickers*. Espera *15 segundos* o si envías *3 más*, serás eliminado.`,
          mentions: [user]
        });
        userData.warned = true;
        userData.strikes = 0;
      }

      if (userData.count > 5 && timePassed < 15000) {
        if (!global.antisBlackList[chatId]) global.antisBlackList[chatId] = [];
        if (!global.antisBlackList[chatId].includes(user)) {
          global.antisBlackList[chatId].push(user);
        }

        await sock.sendMessage(chatId, {
          delete: {
            remoteJid: chatId,
            fromMe: false,
            id: m.key.id,
            participant: user
          }
        });

        userData.strikes++;

        if (userData.strikes >= 3) {
          await sock.sendMessage(chatId, {
            text: `❌ @${user.split("@")[0]} fue eliminado por ignorar advertencias y abusar de stickers.`,
            mentions: [user]
          });
          await sock.groupParticipantsUpdate(chatId, [user], "remove");
          delete global.antisSpam[chatId][user];
        }
      }

      global.antisSpam[chatId][user] = userData;
    }
  }
} catch (e) {
  console.error("❌ Error en lógica antis stickers:", e);
}
// === ✅ FIN LÓGICA ANTIS STICKERS ===

  
  // === ✅ INICIO CONTEO DE MENSAJES EN setwelcome.json ===
try {
  const fs = require("fs");
  const path = require("path");

  const welcomePath = path.resolve("setwelcome.json");
  if (!fs.existsSync(welcomePath)) {
    fs.writeFileSync(welcomePath, JSON.stringify({}, null, 2));
  }

  const welcomeData = JSON.parse(fs.readFileSync(welcomePath, "utf-8"));

  const chatId = m.key.remoteJid;
  const senderId = m.key.participant || m.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const fromMe = m.key.fromMe;
  const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

  if (isGroup) {
    welcomeData[chatId] = welcomeData[chatId] || {};
    welcomeData[chatId].chatCount = welcomeData[chatId].chatCount || {};

    const quien = fromMe ? botNumber : senderId;
    welcomeData[chatId].chatCount[quien] = (welcomeData[chatId].chatCount[quien] || 0) + 1;

    fs.writeFileSync(welcomePath, JSON.stringify(welcomeData, null, 2));
  }
} catch (e) {
  console.error("❌ Error en conteo de mensajes en setwelcome.json:", e);
}
// === ✅ FIN CONTEO DE MENSAJES EN setwelcome.json ===
  
// === ⛔ INICIO GUARDADO ANTIDELETE (con activos.db y antidelete.db) ===
try {
  const isGroup = chatId.endsWith("@g.us");

  const { getConfig, getAntideleteDB, saveAntideleteDB } = requireFromRoot("db");
  const antideleteGroupActive = isGroup ? await getConfig(chatId, "antidelete") == 1 : false;
  const antideletePrivActive = !isGroup ? await getConfig("global", "antideletepri") == 1 : false;

  if (antideleteGroupActive || antideletePrivActive) {
    const idMsg = m.key.id;
    const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const senderId = m.key.participant || (m.key.fromMe ? botNumber : m.key.remoteJid);
    const type = Object.keys(m.message || {})[0];
    const content = m.message[type];

    // ❌ No guardar si es view once
    if (type === "viewOnceMessageV2") return;

    // ❌ No guardar si supera 10MB
    if (
      ["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"].includes(type) &&
      content.fileLength > 10 * 1024 * 1024
    ) return;

    // Objeto base
    const guardado = {
      chatId,
      sender: senderId,
      type,
      timestamp: Date.now()
    };

    // Función para guardar multimedia en base64
    const saveBase64 = async (mediaType, data) => {
      const stream = await downloadContentFromMessage(data, mediaType);
      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      guardado.media = buffer.toString("base64");
      guardado.mimetype = data.mimetype;
    };

    // ✅ CORREGIDO: Usamos await para asegurarnos que se termine de guardar
    if (["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"].includes(type)) {
      const mediaType = type.replace("Message", "");
      await saveBase64(mediaType, content); // 👈 ESTE await es clave
    }

    // Texto
    if (type === "conversation" || type === "extendedTextMessage") {
      guardado.text = m.message.conversation || m.message.extendedTextMessage?.text || "";
    }

    // Guardar en antidelete.db
    const db = getAntideleteDB();
    const scope = isGroup ? "g" : "p";
    db[scope][idMsg] = guardado;
    saveAntideleteDB(db);
  }
} catch (e) {
  console.error("❌ Error en lógica ANTIDELETE:", e);
}
// === ✅ FIN GUARDADO ANTIDELETE ===
// === INICIO DETECCIÓN DE MENSAJE ELIMINADO ===
if (m.message?.protocolMessage?.type === 0) {
  try {
    const deletedId = m.message.protocolMessage.key.id;
    const whoDeleted = m.message.protocolMessage.key.participant || m.key.participant || m.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const senderNumber = (whoDeleted || '').replace(/[^0-9]/g, '');
    const mentionTag = [`${senderNumber}@s.whatsapp.net`];

    const antideleteEnabled = isGroup
  ? (await getConfig(chatId, "antidelete")) === "1"
  : (await getConfig("global", "antideletepri")) === "1";

    if (!antideleteEnabled) return;

    const fs = require("fs");
    const dbPath = "./antidelete.db";

    if (!fs.existsSync(dbPath)) return;

    const db = JSON.parse(fs.readFileSync(dbPath));
    const tipo = isGroup ? "g" : "p";
    const data = db[tipo] || {};
    const deletedData = data[deletedId];
    if (!deletedData) return;

    const senderClean = (deletedData.sender || '').replace(/[^0-9]/g, '');
    if (senderClean !== senderNumber) return;

    if (isGroup) {
      try {
        const meta = await sock.groupMetadata(chatId);
        const isAdmin = meta.participants.find(p => p.id === `${senderNumber}@s.whatsapp.net`)?.admin;
        if (isAdmin) return;
      } catch (e) {
        console.error("❌ Error leyendo metadata:", e);
        return;
      }
    }

    const type = deletedData.type;
    const mimetype = deletedData.mimetype || 'application/octet-stream';
    const buffer = deletedData.media ? Buffer.from(deletedData.media, "base64") : null;

    if (buffer) {
      const sendOpts = {
        [type.replace("Message", "")]: buffer,
        mimetype,
        quoted: m
      };

      if (type === "stickerMessage") {
        const sent = await sock.sendMessage(chatId, sendOpts);
        await sock.sendMessage(chatId, {
          text: `📌 El sticker fue eliminado por @${senderNumber}`,
          mentions: mentionTag,
          quoted: sent
        });
      } else if (type === "audioMessage") {
        const sent = await sock.sendMessage(chatId, sendOpts);
        await sock.sendMessage(chatId, {
          text: `🎧 El audio fue eliminado por @${senderNumber}`,
          mentions: mentionTag,
          quoted: sent
        });
      } else {
        sendOpts.caption = `📦 Mensaje eliminado por @${senderNumber}`;
        sendOpts.mentions = mentionTag;
        await sock.sendMessage(chatId, sendOpts, { quoted: m });
      }

    } else if (deletedData.text) {
      await sock.sendMessage(chatId, {
        text: `📝 *Mensaje eliminado:* ${deletedData.text}\n👤 *Usuario:* @${senderNumber}`,
        mentions: mentionTag
      }, { quoted: m });
    }

  } catch (err) {
    console.error("❌ Error en lógica antidelete:", err);
  }
}
// === FIN DETECCIÓN DE MENSAJE ELIMINADO ===

  
// 🔗 LÓGICA ANTILINK desde activos.db
try {
  
  const antilinkState = await getConfig(chatId, "antilink");

if (isGroup && parseInt(antilinkState) === 1 && messageContent.includes("https://chat.whatsapp.com/")) {
    

    const senderNum = sender.replace(/[^0-9]/g, "");
    const isOwnerHere = isOwner(senderNum);
    let isAdmin = false;

    try {
      const meta = await sock.groupMetadata(chatId);
      const participant = meta.participants.find(p => p.id === sender);
      isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
    } catch (e) {
      console.error("[ANTILINK] ❌ Error leyendo metadata:", e);
    }

    if (fromMe || isOwnerHere || isAdmin) {
      console.log("[ANTILINK] ⚠️ Usuario tiene permisos, se omite.");
      return;
    }

    // Eliminar el mensaje con link
    await sock.sendMessage(chatId, { delete: m.key });
    console.log("[ANTILINK] 🧹 Mensaje eliminado por contener link de WhatsApp.");

    // ⚠️ Cargar advertencias
    const fs = require("fs");
    const advPath = "./advertencias.json";
    if (!fs.existsSync(advPath)) fs.writeFileSync(advPath, JSON.stringify({}));

    const advertencias = JSON.parse(fs.readFileSync(advPath));
    advertencias[chatId] = advertencias[chatId] || {};
    advertencias[chatId][senderNum] = advertencias[chatId][senderNum] || 0;
    advertencias[chatId][senderNum]++;

    const advertenciasTotales = advertencias[chatId][senderNum];
    fs.writeFileSync(advPath, JSON.stringify(advertencias, null, 2));

    if (advertenciasTotales >= 3) {
      // Expulsar
      await sock.sendMessage(chatId, {
        text: `❌ @${senderNum} fue eliminado por enviar enlaces prohibidos (3/3).`,
        mentions: [sender]
      });
      try {
        await sock.groupParticipantsUpdate(chatId, [sender], "remove");
      } catch (e) {
        console.error("❌ Error al expulsar:", e);
      }
      advertencias[chatId][senderNum] = 0;
      fs.writeFileSync(advPath, JSON.stringify(advertencias, null, 2));
    } else {
      // Aviso con advertencia
      await sock.sendMessage(chatId, {
        text: `⚠️ @${senderNum}, enviar enlaces de WhatsApp no está permitido aquí.\nAdvertencia: ${advertenciasTotales}/3.`,
        mentions: [sender]
      });
    }
  }
} catch (e) {
  console.error("❌ Error final en lógica antilink:", e);
}
// === FIN LÓGICA ANTILINK ===
// === LÓGICA LINKALL DESDE activos.db ===
try {
  const estadoLinkAll = await getConfig(chatId, "linkall");
  

  if (isGroup && estadoLinkAll == 1) {
    const texto = messageContent.toLowerCase();

    // Detectar cualquier link que NO sea grupo de WhatsApp
    const contieneLink = /(https?:\/\/[^\s]+)/gi.test(texto);
    const esWhatsApp = texto.includes("https://chat.whatsapp.com");

    if (contieneLink && !esWhatsApp) {
      const senderNum = sender.replace(/[^0-9]/g, "");
      const isOwnerHere = isOwner(senderNum);
      let isAdmin = false;

      try {
        const meta = await sock.groupMetadata(chatId);
        const participant = meta.participants.find(p => p.id === sender);
        isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
      } catch (e) {
        console.error("[LINKALL] ❌ Error leyendo metadata:", e);
      }

      if (fromMe || isOwnerHere || isAdmin) {
        
        return;
      }

      // Eliminar mensaje
      await sock.sendMessage(chatId, { delete: m.key });
      console.log("[LINKALL] 🔥 Mensaje eliminado por link no permitido.");

      // Advertencias
      const fs = require("fs");
      const advPath = "./advertencias.json";
      if (!fs.existsSync(advPath)) fs.writeFileSync(advPath, JSON.stringify({}));

      const advertencias = JSON.parse(fs.readFileSync(advPath));
      advertencias[chatId] = advertencias[chatId] || {};
      advertencias[chatId][senderNum] = advertencias[chatId][senderNum] || 0;
      advertencias[chatId][senderNum]++;

      const advertenciasTotales = advertencias[chatId][senderNum];
      fs.writeFileSync(advPath, JSON.stringify(advertencias, null, 2));

      if (advertenciasTotales >= 10) {
        await sock.sendMessage(chatId, {
          text: `❌ @${senderNum} fue eliminado por enviar enlaces prohibidos (10/10).`,
          mentions: [sender]
        });
        try {
          await sock.groupParticipantsUpdate(chatId, [sender], "remove");
        } catch (e) {
          console.error("[LINKALL] ❌ Error al expulsar:", e);
        }
        advertencias[chatId][senderNum] = 0;
        fs.writeFileSync(advPath, JSON.stringify(advertencias, null, 2));
      } else {
        await sock.sendMessage(chatId, {
          text: `⚠️ @${senderNum}, no se permiten enlaces externos.\nAdvertencia: ${advertenciasTotales}/10.`,
          mentions: [sender]
        });
      }
    }
  }
} catch (e) {
  console.error("❌ Error en lógica LINKALL:", e);
}
// === FIN DE LINKALL ===

// === INICIO BLOQUEO DE MENSAJES DE USUARIOS MUTEADOS ===
try {
  const fs = require("fs");
  const path = require("path");
  const chatId = m.key.remoteJid;
  const senderId = m.key.participant || m.key.remoteJid;
  const senderNum = senderId.replace(/[^0-9]/g, "");
  const isGroup = chatId.endsWith("@g.us");
  const isBot = senderId === sock.user.id;
  const isOwner = global.isOwner(senderId);

  if (isGroup && !isOwner) {
    const welcomePath = path.resolve("setwelcome.json");
    const welcomeData = fs.existsSync(welcomePath)
      ? JSON.parse(fs.readFileSync(welcomePath, "utf-8"))
      : {};

    const mutedList = welcomeData[chatId]?.muted || [];

    if (mutedList.includes(senderId)) {
      global._muteCounter = global._muteCounter || {};
      const key = `${chatId}:${senderId}`;
      global._muteCounter[key] = (global._muteCounter[key] || 0) + 1;

      const count = global._muteCounter[key];

      if (count === 8) {
        await sock.sendMessage(chatId, {
          text: `⚠️ @${senderNum}, estás *muteado*. Si sigues enviando mensajes podrías ser eliminado.`,
          mentions: [senderId]
        });
      }

      if (count === 13) {
        await sock.sendMessage(chatId, {
          text: `⛔ @${senderNum}, estás al *límite*. Un mensaje más y serás eliminado.`,
          mentions: [senderId]
        });
      }

      if (count >= 15) {
        const metadata = await sock.groupMetadata(chatId);
        const isAdmin = metadata.participants.find(p => p.id === senderId)?.admin;

        if (!isAdmin) {
          await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
          await sock.sendMessage(chatId, {
            text: `❌ @${senderNum} fue eliminado por ignorar el mute.`,
            mentions: [senderId]
          });
          delete global._muteCounter[key];
        } else {
          await sock.sendMessage(chatId, {
            text: `🔇 @${senderNum} está muteado pero no puede ser eliminado por ser admin.`,
            mentions: [senderId]
          });
        }
      }

      await sock.sendMessage(chatId, {
        delete: {
          remoteJid: chatId,
          fromMe: false,
          id: m.key.id,
          participant: senderId
        }
      });

      return;
    }
  }
} catch (err) {
  console.error("❌ Error en lógica de muteo:", err);
}
// === FIN BLOQUEO DE MENSAJES DE USUARIOS MUTEADOS ===
// === INICIO BLOQUEO DE COMANDOS A USUARIOS BANEADOS ===
try {
  const fs = require("fs");
  const path = require("path");

  const welcomePath = path.resolve("./setwelcome.json");
  const welcomeData = fs.existsSync(welcomePath) ? JSON.parse(fs.readFileSync(welcomePath)) : {};

  const chatId = m.key.remoteJid;
  const senderId = m.key.participant || m.key.remoteJid;
  const senderNum = senderId.replace(/[^0-9]/g, "");
  const isFromMe = m.key.fromMe;
  const isOwner = global.isOwner(senderId);

  const messageText =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    "";

  // ✅ Verifica si el mensaje comienza con algún prefijo válido
  const prefixUsed = global.prefixes.find((p) => messageText?.startsWith(p));
  if (!prefixUsed) return;

  const chatBanList = welcomeData[chatId]?.banned || [];

  if (chatBanList.includes(senderId) && !isOwner && !isFromMe) {
    const frases = [
      "🚫 @usuario estás baneado por pendejo. ¡Abusaste demasiado del bot!",
      "❌ Lo siento @usuario, pero tú ya no puedes usarme. Aprende a comportarte.",
      "🔒 No tienes permiso @usuario. Fuiste baneado por molestar mucho.",
      "👎 ¡Bloqueado! @usuario abusaste del sistema y ahora no puedes usarme.",
      "😤 Quisiste usarme pero estás baneado, @usuario. Vuelve en otra vida."
    ];

    const texto = frases[Math.floor(Math.random() * frases.length)].replace("@usuario", `@${senderNum}`);

    await sock.sendMessage(chatId, {
      text: texto,
      mentions: [senderId]
    }, { quoted: m });

    return; // ❌ Evita que el comando continúe
  }
} catch (e) {
  console.error("❌ Error procesando bloqueo de usuarios baneados:", e);
}
// === FIN BLOQUEO DE COMANDOS A USUARIOS BANEADOS ===
// === ⛔ INICIO FILTRO DE MENSAJES EN PRIVADO POR LISTA (con detección real de bot y owner) ===
try {
  const chatId = m.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");

  // Solo se restringe en privado
  if (!isGroup) {
    const fs = require("fs");
    const path = require("path");

    const senderId = m.key.participant || m.key.remoteJid;
    const senderNum = senderId.replace(/[^0-9]/g, "");
    const fromMe = m.key.fromMe;
    const botNumber = sock.user.id.split(":")[0]; // Solo número
    const isOwner = global.owner.some(([id]) => id === senderNum);
    const isBot = fromMe || senderNum === botNumber;

    if (!isOwner && !isBot) {
      const welcomePath = path.resolve("setwelcome.json");
      const welcomeData = fs.existsSync(welcomePath)
        ? JSON.parse(fs.readFileSync(welcomePath, "utf-8"))
        : {};

      const lista = welcomeData.lista || [];

      if (!lista.includes(senderId)) {
        console.log(`⛔ PRIVADO BLOQUEADO — ${senderNum} no está en la lista`);
        return; // ← Bloquear respuesta del bot
      }
    }
  }
} catch (e) {
  console.error("❌ Error en lógica de control privado:", e);
}
// === ✅ FIN FILTRO DE MENSAJES EN PRIVADO POR LISTA ===
// === 🔐 INICIO MODO PRIVADO GLOBAL ===
try {
  const chatId = m.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";

  const senderId = isGroup
    ? m.key.participant
    : m.key.fromMe
      ? botJid
      : chatId;

  const senderNum = senderId.replace(/[^0-9]/g, "");
  const isBot = senderId === botJid;
  const isOwner = global.owner.some(([id]) => id === senderNum);

  const { getConfig } = requireFromRoot("db");
  const modoPrivado = await getConfig("global", "modoprivado");

  if (parseInt(modoPrivado) === 1) {
    const fs = require("fs");
    const path = require("path");
    const welcomePath = path.resolve("setwelcome.json");
    const welcomeData = fs.existsSync(welcomePath)
      ? JSON.parse(fs.readFileSync(welcomePath, "utf-8"))
      : {};
    const whitelist = welcomeData.lista || [];
    const jid = `${senderNum}@s.whatsapp.net`;
    const permitido = isOwner || isBot || whitelist.includes(jid);

    if (!permitido) return;
  }
} catch (e) {
  console.error("❌ Error en lógica de modo privado:", e);
}
// === 🔐 FIN MODO PRIVADO GLOBAL ===


  
// === ✅ INICIO LÓGICA DE APAGADO POR GRUPO (solo responde al dueño) ===
try {
  const { getConfig } = requireFromRoot("db");
  const fs = require("fs");

  const chatId = m.key.remoteJid;
  const senderId = m.key.participant || m.key.remoteJid;
  const senderNum = senderId.replace(/[^0-9]/g, "");
  const isGroup = chatId.endsWith("@g.us");
  const isOwner = global.owner.some(([id]) => id === senderNum);

  if (isGroup) {
    const apagado = await getConfig(chatId, "apagado");

    if (apagado == 1 && !isOwner) {
      return; // 👈 Si está apagado y no es owner, ignorar mensaje
    }
  }
} catch (e) {
  console.error("❌ Error en lógica de apagado por grupo:", e);
}
// === ✅ FIN LÓGICA DE APAGADO POR GRUPO ===  
// === INICIO BLOQUEO DE COMANDOS RESTRINGIDOS POR GRUPO ===
try {
  const fs = require("fs");
  const path = require("path");

  const chatId = m.key.remoteJid;
  const senderId = m.key.participant || m.key.remoteJid;
  const senderNum = senderId.replace(/[^0-9]/g, "");
  const isOwner = global.isOwner(senderId);
  const isBot = senderId === sock.user.id;
  const isFromMe = m.key.fromMe;

  const messageText =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    "";

  const prefixUsed = global.prefixes.find(p => messageText.startsWith(p));
  if (!prefixUsed) return;

  const command = messageText.slice(prefixUsed.length).trim().split(" ")[0].toLowerCase();

  const welcomePath = path.resolve("setwelcome.json");
  const welcomeData = fs.existsSync(welcomePath)
    ? JSON.parse(fs.readFileSync(welcomePath, "utf-8"))
    : {};

  const restringidos = welcomeData[chatId]?.restringidos || [];

  if (restringidos.includes(command)) {
    if (!isOwner && !isFromMe && !isBot) {
      global.reintentosRestrict = global.reintentosRestrict || {};
      const key = `${chatId}:${senderId}:${command}`;
      global.reintentosRestrict[key] = (global.reintentosRestrict[key] || 0) + 1;

      const intentos = global.reintentosRestrict[key];

      if (intentos <= 2) {
        await sock.sendMessage(chatId, {
          text: `🚫 *Este comando está restringido en este grupo.*\nSolo el *dueño del bot* y el *bot* pueden usarlo.`,
          quoted: m
        });
      }

      if (intentos === 3) {
        await sock.sendMessage(chatId, {
          text: `⚠️ @${senderNum} *este es tu intento 3* usando un comando restringido.\n💥 Si lo haces *una vez más*, serás *ignorado para este comando*.`,
          mentions: [senderId],
          quoted: m
        });
      }

      if (intentos >= 4) {
        console.log(`🔇 Ignorando a ${senderId} para el comando restringido: ${command}`);
        return;
      }

      return; // ← cortar ejecución del comando
    }
  }
} catch (e) {
  console.error("❌ Error en lógica de comandos restringidos:", e);
}
// === FIN BLOQUEO DE COMANDOS RESTRINGIDOS POR GRUPO ===
  
  // 🔐 VERIFICACIÓN MODOADMINS desde activos.db
if (isGroup) {
  try {
    const estadoModoAdmins = getConfig(chatId, "modoadmins");

    if (estadoModoAdmins == 1) {
      const metadata = await sock.groupMetadata(chatId);
      const senderNum = sender.replace(/[^0-9]/g, "");
      const isOwner = global.owner.some(([id]) => id === senderNum);
      const participant = metadata.participants.find(p => p.id === sender);
      const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";

      if (!isAdmin && !isOwner && !fromMe) {
        // Si está activado y el que habla no es admin, owner ni el bot → ignorar
        return;
      }
    }
  } catch (e) {
    console.error("❌ Error verificando modoAdmins:", e);
    return;
  }
}

  
  // 🧩 Detectar prefijo
  const prefixUsed = global.prefixes.find(p => messageContent.startsWith(p));
  if (!prefixUsed) return;
  
  const command = messageContent.slice(prefixUsed.length).trim().split(" ")[0].toLowerCase();
  const rawArgs = messageContent.trim().slice(prefixUsed.length + command.length).trim();
  const args = rawArgs.length ? rawArgs.split(/\s+/) : [];        
  // 🔁 Ejecutar comando desde plugins
  for (const plugin of global.plugins) {
    const isClassic = typeof plugin === "function";
    const isCompatible = plugin.command?.includes?.(command);

    try {
      if (isClassic && plugin.command?.includes?.(command)) {
        await plugin(m, { conn: sock, text: rawArgs, args, command }); // ← CAMBIO aquí
        break;
      }

      if (!isClassic && isCompatible) {
        await plugin.run({ msg: m, conn: sock, args, command });
        break;
      }
    } catch (e) {
      console.error(chalk.red(`❌ Error ejecutando ${command}:`), e);
    }
  }
});

sock.ev.on("connection.update", async ({ connection }) => {
  if (connection === "open") {
    console.log(chalk.green("✅ Conectado correctamente a WhatsApp."));

    // ✔️ Si fue reiniciado con .carga, avisar
    const restarterFile = "./lastRestarter.json";
    if (fs.existsSync(restarterFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(restarterFile, "utf-8"));
        if (data.chatId) {
          await sock.sendMessage(data.chatId, {
            text: "✅ *Suki Bot 3.0 está en línea nuevamente* 🚀"
          });
          console.log(chalk.yellow("📢 Aviso enviado al grupo del reinicio."));
          fs.unlinkSync(restarterFile); // 🧹 Eliminar archivo tras el aviso
        }
      } catch (error) {
        console.error("❌ Error leyendo lastRestarter.json:", error);
      }
    }

  } else if (connection === "close") {
    console.log(chalk.red("❌ Conexión cerrada. Reintentando en 5 segundos..."));
    setTimeout(startBot, 5000);
  }
});

      sock.ev.on("creds.update", saveCreds);

      process.on("uncaughtException", (err) => {
        console.error(chalk.red("⚠️ Error no capturado:"), err);
      });

      process.on("unhandledRejection", (reason, promise) => {
        console.error(chalk.red("🚨 Promesa sin manejar:"), promise, "Razón:", reason);
      });

    } catch (e) {
      console.error(chalk.red("❌ Error en conexión:"), e);
      setTimeout(startBot, 5000);
    }
  }

  startBot();
})();
