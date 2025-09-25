// index.js
const {
  default: makeWASocket,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  proto
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const path = require("path");
const pino = require("pino");
const chalk = require("chalk");
const figlet = require("figlet");
const readline = require("readline");

// 🎨 Banner
console.log(chalk.cyan(figlet.textSync("Killua Bot", { font: "Standard" })));
console.log(chalk.green("\n✅ Iniciando conexión...\n"));
console.log(chalk.green("  [Hola] ") + chalk.white("🔑 Ingresar Tu Numero (Ej: +50489513153)\n"));

// 📞 Entrada de usuario
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// ⚡ Prefijos soportados
const PREFIXES = [".", "!", "#", "/"];

// 📂 Cargar plugins
const plugins = {};
function loadPlugins() {
  const dir = path.join(__dirname, "plugins");
  fs.readdirSync(dir).forEach((file) => {
    if (file.endsWith(".js")) {
      const plugin = require(path.join(dir, file));
      plugins[file] = plugin;
    }
  });
  console.log(chalk.green(`\n✅ Plugins cargados: ${Object.keys(plugins).length}\n`));
}

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState("./sessions");

  let phoneNumber = "";
  if (!fs.existsSync("./sessions/creds.json")) {
    phoneNumber = await question(chalk.magenta("📞 Ingresa tu número: "));
    rl.close();
    phoneNumber = phoneNumber.replace(/\D/g, "");
    if (!phoneNumber) {
      console.log(chalk.red("\n❌ Número inválido."));
      process.exit(1);
    }
  }

  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false, // 🚫 QR no, usamos código
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  });

  // 🔑 Generar código si no hay sesión
  if (!fs.existsSync("./sessions/creds.json")) {
    const code = await sock.requestPairingCode(phoneNumber);
    console.log(chalk.green(`\n✅ Tu código de vinculación es: `) + chalk.cyanBright(code));
    console.log(chalk.yellow("👉 Abre WhatsApp > Dispositivos vinculados > Vincular con código e ingrésalo.\n"));
  }

  sock.ev.on("creds.update", saveCreds);

  // 🔥 Cargar plugins
  loadPlugins();

  // 📩 Escuchar mensajes
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const chatId = msg.key.remoteJid;
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      "";

    const prefix = PREFIXES.find((p) => body.startsWith(p));
    if (!prefix) return;

    const args = body.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    for (const file in plugins) {
      const plugin = plugins[file];
      if (plugin.command && plugin.command.includes(command)) {
        try {
          await plugin(msg, { conn: sock, args, command, text: args.join(" ") });
        } catch (e) {
          console.error(e);
          await sock.sendMessage(chatId, { text: "❌ Error ejecutando el comando." }, { quoted: msg });
        }
        break;
      }
    }
  });
})();