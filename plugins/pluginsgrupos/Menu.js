const fs = require("fs");
const path = require("path");

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  const pref = (Array.isArray(global.prefixes) && global.prefixes[0]) || ".";

  try { await conn.sendMessage2(chatId, { react: { text: "✨", key: msg.key } }, msg); } catch {}

  try {
    const filePath = path.resolve("./setmenu.json");
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const texto  = typeof data?.texto === "string" ? data.texto : "";
      const imagen = typeof data?.imagen === "string" && data.imagen.length ? data.imagen : null;

      if (texto.trim().length || imagen) {
        if (imagen) {
          const buffer = Buffer.from(imagen, "base64");
          await conn.sendMessage2(chatId, {
            image: buffer,
            caption: texto && texto.length ? texto : undefined
          }, msg);
          return;
        } else {
          await conn.sendMessage2(chatId, { text: texto }, msg);
          return;
        }
      }
    }
  } catch (e) {
    console.error("[menu] Error leyendo setmenu.json:", e);
  }

  const caption = `DE҈M҉O҉N҉S҉ NO҉V҉A҉ CR҉O҉N҉H҉O҉S҉

┏━°⌜ 赤い糸 ⌟°━┓
꧁༺Gᴇɴᴇʀᴀʟ༻꧂
𒈒 Prefijo Actual: 『 ${pref} 』
𒈒 Usa en cada comando
┗━°⌜ 赤い糸 ⌟°━┛


┏━°⌜ 赤い糸 ⌟°━┓
꧁༺Iɴꜰᴏʀᴍᴀᴄɪᴏ́ɴ༻꧂
𒈒 *${pref}ping*
𒈒 *${pref}speedtest*
𒈒 *${pref}creador*
𒈒 *${pref}info*
┗━°⌜ 赤い糸 ⌟°━┛


┏━°⌜ 赤い糸 ⌟°━┓
꧁༺Mᴇɴᴜꜱ Dɪꜱᴘᴏɴɪʙʟᴇꜱ༻꧂
𒈒 *${pref}menugrupo*
𒈒 *${pref}menuaudio*
𒈒 *${pref}menurpg*
𒈒 *${pref}menuowner*
𒈒 *${pref}menufree*
┗━°⌜ 赤い糸 ⌟°━┛


┏━°⌜ 赤い糸 ⌟°━┓
꧁༺Pᴀʀᴀ Vᴇɴᴛᴀꜱ༻꧂
𒈒 *${pref}setstock / stock*
𒈒 *${pref}setnetflix / netflix*
𒈒 *${pref}setpago / pago*
𒈒 *${pref}setcombos / combos*
𒈒 *${pref}setpeliculas / peliculas*
𒈒 *${pref}settramites / tramites*
𒈒 *${pref}setcanvas / canvas*
𒈒 *${pref}setreglas / reglas*
𒈒 *${pref}sorteo*
𒈒 *${pref}setsoporte / soporte*
𒈒 *${pref}setpromo / promo*
𒈒 *${pref}addfactura*
𒈒 *${pref}delfactura*
𒈒 *${pref}facpaga*
𒈒 *${pref}verfac*
┗━°⌜ 赤い糸 ⌟°━┛


┏━°⌜ 赤い糸 ⌟°━┓
꧁༺IA - CʜᴀᴛBᴏᴛ༻꧂
𒈒 *${pref}gemini*
𒈒 *${pref}chatgpt*
𒈒 *${pref}dalle*
𒈒 *${pref}visión*
𒈒 *${pref}visión2*
𒈒 *${pref}chat on/off*
𒈒 *${pref}luminai*
┗━°⌜ 赤い糸 ⌟°━┛


┏━°⌜ 赤い糸 ⌟°━┓
꧁༺Dᴇꜱᴄᴀʀɢᴀ༻꧂
𒈒 *${pref}play / play1 / play2 / play3*
𒈒 *${pref}ytmp3 / ytmp4 / ytmp3doc / ytmp4doc*
𒈒 *${pref}tiktok / fb / ig / spotify*
𒈒 *${pref}kiss / topkiss*
𒈒 *${pref}slap / topslap*
𒈒 *${pref}mediafire / apk*
┗━°⌜ 赤い糸 ⌟°━┛


┏━°⌜ 赤い糸 ⌟°━┓
꧁༺Bᴜꜱᴄᴀᴅᴏʀᴇꜱ༻꧂
𒈒 *${pref}pixai*
𒈒 *${pref}tiktoksearch*
𒈒 *${pref}yts*
𒈒 *${pref}tiktokstalk*
┗━°⌜ 赤い糸 ⌟°━┛


┏━°⌜ 赤い糸 ⌟°━┓
꧁༺Cᴏɴᴠᴇʀᴛɪᴅᴏʀᴇꜱ༻꧂
𒈒 *${pref}tomp3*
𒈒 *${pref}toaudio*
𒈒 *${pref}hd*
𒈒 *${pref}tts*
𒈒 *${pref}tovideo / toimg*
𒈒 *${pref}gifvideo / ff / ff2*
┗━°⌜ 赤い糸 ⌟°━┛


┏━°⌜ 赤い糸 ⌟°━┓
꧁༺Sᴛɪᴄᴋᴇʀꜱ༻꧂
𒈒 *${pref}s / qc / qc2 / texto*
𒈒 *${pref}mixemoji / aniemoji*
𒈒 *${pref}addco / delco*
┗━°⌜ 赤い糸 ⌟°━┛


┏━°⌜ 赤い糸 ⌟°━┓
꧁༺Hᴇʀʀᴀᴍɪᴇɴᴛᴀꜱ༻꧂
𒈒 *${pref}ver / perfil / get / xxx*
𒈒 *${pref}tourl / whatmusic*
┗━°⌜ 赤い糸 ⌟°━┛


┏━°⌜ 赤い糸 ⌟°━┓
꧁༺Mɪɴɪ Jᴜᴇɢᴏꜱ༻꧂ 
𒈒 *${pref}verdad / reto*
𒈒 *${pref}personalidad*
𒈒 *${pref}parejas / ship*
𒈒 *${pref}kiss / topkiss*
𒈒 *${pref}slap / topslap*
𒈒 *${pref}menurpg*
𒈒 *${pref}puta @usuario*
𒈒 *${pref}puto @usuario*
𒈒 *${pref}peruano @usuario*
𒈒 *${pref}peruana @usuario*
𒈒 *${pref}negro @usuario*
𒈒 *${pref}negra @usuario*
𒈒 *${pref}manca @usuario*
𒈒 *${pref}manco @usuario*
𒈒 *${pref}fea @usuario*
𒈒 *${pref}feo @usuario*
𒈒 *${pref}enano @usuario*
𒈒 *${pref}enana @usuario*
𒈒 *${pref}cachudo @usuario*
𒈒 *${pref}cachuda @usuario*
𒈒 *${pref}pajero @usuario*
𒈒 *${pref}pajera @usuario*
𒈒 *${pref}rata @usuario*
𒈒 *${pref}adoptado @usuario*
𒈒 *${pref}adoptada @usuario*
┗━°⌜ 赤い糸 ⌟°━┛
`.trim();

  await conn.sendMessage2(chatId, {
    image: { url: "https://cdn.russellxz.click/978d6be2.jpeg" },
    gifPlayback: true,
    caption
  }, msg);
};

handler.command = ["menu"];
handler.help = ["menu"];
handler.tags = ["menu"];

module.exports = handler;
