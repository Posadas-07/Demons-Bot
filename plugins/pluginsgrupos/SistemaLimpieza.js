const fs = require("fs");
const path = require("path");
const os = require("os");
const chalk = require("chalk");
const { readdirSync, statSync, lstatSync, unlinkSync, rmdirSync } = require("fs");
const { getAntideleteDB, saveAntideleteDB } = requireFromRoot("db");

// --- Config ---
const RETENTION_MS = 1 * 60 * 1000;     // borrar archivos con >= 1 minuto
const RUN_EVERY_MS = 15 * 60 * 1000;    // correr cada 15 minutos
const SKIP_DIRS = new Set(["node_modules", ".git"]);

// Raíces desde donde buscar carpetas "tmp"
const ROOTS = [
  path.resolve("."),           // proyecto
  path.resolve("./plugins"),   // todos los plugins
  path.resolve("./tmp"),       // tmp local (si existe)
  os.tmpdir(),                 // tmp del sistema
];

// ------------ Finder: listar todas las carpetas llamadas "tmp" ------------
function findTmpDirs(startDir) {
  const found = new Set();
  const stack = [startDir];

  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue; // permisos o inexistente
    }

    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (!ent.isDirectory()) continue;

      const base = path.basename(full);
      if (SKIP_DIRS.has(base)) continue;

      if (base === "tmp") {
        found.add(full);
      }
      // seguir buscando en subcarpetas
      stack.push(full);
    }
  }
  return Array.from(found);
}

// ------------ Cleaner: borrar archivos viejos dentro de una tmp (recursivo) ------------
function cleanTmpDir(dir, retentionMs) {
  let deleted = 0;
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const ent of entries) {
      const full = path.join(current, ent.name);
      let st;
      try {
        st = lstatSync(full); // no seguir symlinks
      } catch {
        continue;
      }

      if (st.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!st.isFile()) continue;

      const age = Date.now() - st.mtimeMs;
      if (age >= retentionMs) {
        try {
          unlinkSync(full);
          deleted++;
        } catch (e) {
          console.error(`❌ Error borrando ${full}:`, e.message || e);
        }
      }
    }

    // intentar borrar carpetas vacías (menos la raíz "dir")
    try {
      if (current !== dir) {
        const left = readdirSync(current);
        if (left.length === 0) rmdirSync(current);
      }
    } catch {}
  }

  return deleted;
}

// ------------ Limpieza integrada: escanea roots y limpia todas las tmp ------------
function limpiarCarpetaTmp() {
  const tmpDirs = new Set();

  for (const root of ROOTS) {
    try {
      if (fs.existsSync(root)) {
        for (const d of findTmpDirs(root)) tmpDirs.add(d);
      }
    } catch {}
  }

  let totalDeleted = 0;
  for (const tmpPath of tmpDirs) {
    try {
      totalDeleted += cleanTmpDir(tmpPath, RETENTION_MS);
    } catch {}
  }
  return totalDeleted;
}

// ------------ Mantener tu limpieza de antidelete.db ------------
function limpiarAntideleteDB() {
  try {
    const _ = getAntideleteDB(); // carga actual (no necesitamos leer contenido)
    const vacio = { g: {}, p: {} };
    saveAntideleteDB(vacio);
    return true;
  } catch (e) {
    console.error("❌ Error limpiando antidelete.db:", e);
    return false;
  }
}

// ------------ Scheduler seguro (evita duplicados y solapes) ------------
function run() {
  if (global.__TMP_CLEANER_INTERVAL__) {
    // ya hay un intervalo activo, no duplicar
    return;
  }

  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const count = limpiarCarpetaTmp();
      console.log(chalk.cyanBright(`🧼 TMP: ${count} archivo(s) eliminados.`));
      if (limpiarAntideleteDB()) {
        console.log(chalk.greenBright("✅ antidelete.db limpiado."));
      }
    } catch (e) {
      console.error("❌ Error en limpieza programada:", e?.message || e);
    } finally {
      running = false;
    }
  };

  // intervalo cada 15 minutos
  global.__TMP_CLEANER_INTERVAL__ = setInterval(tick, RUN_EVERY_MS);

  // pasada inicial (inmediata)
  tick();
}

module.exports = { run };
