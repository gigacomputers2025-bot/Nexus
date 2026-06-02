import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import https from 'https';
import AdmZip from 'adm-zip';
import { createServer as createViteServer } from 'vite';
import { Product, Client, Sale, Provider, Purchase, PaymentMethod, CompanyConfig, Expense, CashRegister } from './src/types';

// Let's establish our local database file (.db)
const DB_FILE = path.join(process.cwd(), 'database.db');
const SEC_DB_FILE = path.join(process.cwd(), 'database.json');
const WEB_MAIN_DIR = path.join(process.cwd(), 'Web-main', 'Web-main');

// Interface for database structure
interface DatabaseSchema {
  products: Product[];
  clients: Client[];
  providers: Provider[];
  sales: Sale[];
  purchases: Purchase[];
  paymentMethods: PaymentMethod[];
  companyConfig: CompanyConfig | null;
  stockWarningEnabled: boolean;
  expenses: Expense[];
  cashRegister: CashRegister | null;
}

const INITIAL_DB: DatabaseSchema = {
  products: [
    { id: '1', code: '1001', name: 'Coca Cola 500ml', price: 2.50, cost: 1.50, stock: 50, category: 'Bebidas' },
    { id: '2', code: '1002', name: 'Agua Mineral 1L', price: 1.80, cost: 1.00, stock: 40, category: 'Bebidas' },
    { id: '3', code: '2001', name: 'Galletas Oreo', price: 1.20, cost: 0.70, stock: 35, category: 'Snacks' },
    { id: '4', code: '2002', name: 'Papas Fritas Lays Clásicas', price: 2.20, cost: 1.30, stock: 25, category: 'Snacks' },
    { id: '5', code: '2003', name: 'Chocolate Snickers', price: 2.00, cost: 1.10, stock: 30, category: 'Snacks' },
    { id: '6', code: '3001', name: 'Detergente Ala 1kg', price: 5.50, cost: 3.50, stock: 15, category: 'Limpieza' },
    { id: '7', code: '3002', name: 'Jabón Rexona', price: 1.50, cost: 0.90, stock: 20, category: 'Limpieza' },
    { id: '8', code: '4001', name: 'Arroz Premium 1kg', price: 3.80, cost: 2.50, stock: 60, category: 'Abarrotes' },
    { id: '9', code: '4002', name: 'Fideos Don Vittorio 500g', price: 2.40, cost: 1.50, stock: 45, category: 'Abarrotes' }
  ],
  clients: [
    { id: 'c1', document: '99999999', name: 'Cliente General', phone: '-', email: 'general@nexuspos.com' },
    { id: 'c2', document: '12345678', name: 'Juan Pérez', phone: '987654321', email: 'juan.perez@email.com' },
    { id: 'c3', document: '20456789123', name: 'Empresa Servis S.A.C.', phone: '014455667', email: 'contacto@servis.com' }
  ],
  providers: [
    { id: 'p1', ruc: '20112233445', name: 'Distribuidora Bebidas S.A.', phone: '944888333', email: 'ventas@distbebidas.com' },
    { id: 'p2', ruc: '20556677889', name: 'Snacks del Valle', phone: '955111222', email: 'pedidos@valleysnacks.com' },
    { id: 'p3', ruc: '20998877665', name: 'Arrocería del Norte', phone: '966222888', email: 'arroz@elnorte.com' }
  ],
  sales: [],
  purchases: [],
  paymentMethods: [
    { id: 'pm1', name: 'Efectivo', requiresCash: true, adjustment: 0 },
    { id: 'pm2', name: 'Tarjeta', requiresCash: false, adjustment: 0 },
    { id: 'pm3', name: 'Transferencia', requiresCash: false, adjustment: 0 }
  ],
  companyConfig: null,
  stockWarningEnabled: true,
  expenses: [],
  cashRegister: null
};

// Helper functions to read and write database.db safely
function readDB(): DatabaseSchema {
  try {
    // If the new DB_FILE doesn't exist, check if an old database.json exists to migrate
    if (!fs.existsSync(DB_FILE)) {
      if (fs.existsSync(SEC_DB_FILE)) {
        console.log(`[INFO] Migrando datos desde database.json a database.db...`);
        try {
          const content = fs.readFileSync(SEC_DB_FILE, 'utf-8');
          fs.writeFileSync(DB_FILE, content, 'utf-8');
          // Optionally delete the old one or keep as backup
          fs.renameSync(SEC_DB_FILE, SEC_DB_FILE + '.backup');
          console.log(`[INFO] Migración completada. database.json respaldado a database.json.backup`);
        } catch (migrationError) {
          console.error('[ERROR] Error durante la migración de datos:', migrationError);
        }
      } else {
        fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
        return INITIAL_DB;
      }
    }
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DatabaseSchema;
    // Ensure all fields exist (migration for old databases)
    if (!data.paymentMethods) data.paymentMethods = INITIAL_DB.paymentMethods;
    if (!data.purchases) data.purchases = [];
    if (!data.expenses) data.expenses = [];
    if (!data.cashRegister) data.cashRegister = null;
    if (!data.companyConfig) data.companyConfig = null;
    if (data.stockWarningEnabled === undefined) data.stockWarningEnabled = true;
    return data;
  } catch (error) {
    console.error('Error reading database file, returning initial schema:', error);
    return INITIAL_DB;
  }
}

let lastPOSWrite = Date.now();

// Auto-sync a GitHub
let pendingSync = false;
let syncing = false;
let lastSyncTime: string | null = null;
let lastSyncError: string | null = null;
const NEXUS_REPO_URL = 'https://github.com/gigacomputers2025-bot/Nexus.git';

function writeDB(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    lastPOSWrite = Date.now();
    pendingSync = true;
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
}

// Interface for Web-main product format
interface WebProduct {
  name: string;
  category: string;
  price: number;
  desc?: string;
  image?: string;
  id: string;
  oferta?: boolean;
  nuevo?: boolean;
}

async function importCompanyConfig(silent = false): Promise<boolean> {
  const WEB_URL = 'http://localhost:3000/api/config';
  try {
    const res = await fetch(WEB_URL);
    if (!res.ok) {
      if (!silent) console.log(`[CONFIG] Web-main no disponible (HTTP ${res.status})`);
      return false;
    }
    const config: CompanyConfig = await res.json();
    if (!config || !config.companyName) {
      if (!silent) console.log('[CONFIG] Web-main no tiene configuración de empresa');
      return false;
    }
    const db = readDB();
    db.companyConfig = config;
    writeDB(db);
    if (!silent) console.log(`[CONFIG] Configuración de empresa importada: ${config.companyName}`);
    return true;
  } catch (err: any) {
    if (!silent) console.warn(`[CONFIG] No se pudo conectar con Web-main (${err?.message || err})`);
    return false;
  }
}

async function importFromWeb(silent = false): Promise<{ imported: number; updated: number }> {
  const WEB_URL = 'http://localhost:3000/api/products';
  try {
    const res = await fetch(WEB_URL);
    if (!res.ok) {
      if (!silent) console.log(`[IMPORT] Web-main no disponible (HTTP ${res.status})`);
      return { imported: 0, updated: 0 };
    }
    const webProducts: WebProduct[] = await res.json();
    if (!Array.isArray(webProducts) || webProducts.length === 0) {
      if (!silent) console.log('[IMPORT] Web-main no tiene productos para importar');
      return { imported: 0, updated: 0 };
    }

    const db = readDB();
    let imported = 0;
    let updated = 0;

    for (const wp of webProducts) {
      const existingIndex = db.products.findIndex(
        p => (p.source !== 'local' || !p.source) && p.name.toLowerCase().trim() === wp.name.toLowerCase().trim()
      );

      if (existingIndex !== -1) {
        db.products[existingIndex] = {
          ...db.products[existingIndex],
          source: 'web',
          code: wp.id,
          price: Number(wp.price) || 0,
          cost: 0,
          category: wp.category || 'Varios'
        };
        updated++;
      } else {
        const newProduct: Product = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
          code: wp.id,
          name: wp.name,
          price: Number(wp.price) || 0,
          cost: 0,
          stock: 0,
          category: wp.category || 'Varios',
          source: 'web'
        };
        db.products.push(newProduct);
        imported++;
      }
    }

    writeDB(db);
    if (!silent) {
      console.log(`[IMPORT] Importación completada: ${imported} nuevos, ${updated} actualizados`);
    }
    return { imported, updated };
  } catch (err: any) {
    if (!silent) {
      console.warn(`[IMPORT] No se pudo conectar con Web-main (${err?.message || err})`);
    }
    return { imported: 0, updated: 0 };
  }
}

async function startServer() {
  // Initialize and migrate database on start
  const initialData = readDB();
  console.log(`[DATABASE] Base de datos persistente inicializada con ${initialData.products.length} productos.`);

  // Auto-importar artículos y configuración desde Web-main al iniciar
  importCompanyConfig(true).then(result => {
    if (result) console.log('[IMPORT] Configuración de empresa importada al inicio');
  });
  importFromWeb(true).then(result => {
    if (result.imported > 0 || result.updated > 0) {
      console.log(`[IMPORT] Auto-importación al inicio: ${result.imported} nuevos, ${result.updated} actualizados`);
    }
  });

  const app = express();
  app.use(express.json());

  // API Endpoints for POS Module
  
  // PRODUCTS
  app.get('/api/products', (req, res) => {
    const db = readDB();
    res.json(db.products);
  });

  app.post('/api/products', (req, res) => {
    const db = readDB();
    const newProduct: Product = {
      id: Date.now().toString(),
      code: req.body.code || '',
      name: req.body.name || '',
      price: Number(req.body.price) || 0,
      cost: Number(req.body.cost) || 0,
      stock: Number(req.body.stock) || 0,
      category: req.body.category || 'Varios',
      source: 'local',
      desc: req.body.desc || '',
      image: req.body.image || '',
      oferta: req.body.oferta === true,
      nuevo: req.body.nuevo === true,
    };
    db.products.push(newProduct);
    writeDB(db);
    res.status(201).json(newProduct);
  });

  app.put('/api/products/:id', (req, res) => {
    const db = readDB();
    const index = db.products.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
      db.products[index] = {
        ...db.products[index],
        code: req.body.code !== undefined ? req.body.code : db.products[index].code,
        name: req.body.name !== undefined ? req.body.name : db.products[index].name,
        price: req.body.price !== undefined ? Number(req.body.price) : db.products[index].price,
        cost: req.body.cost !== undefined ? Number(req.body.cost) : db.products[index].cost,
        stock: req.body.stock !== undefined ? Number(req.body.stock) : db.products[index].stock,
        category: req.body.category !== undefined ? req.body.category : db.products[index].category,
        desc: req.body.desc !== undefined ? req.body.desc : db.products[index].desc,
        image: req.body.image !== undefined ? req.body.image : db.products[index].image,
        oferta: req.body.oferta !== undefined ? req.body.oferta === true : db.products[index].oferta,
        nuevo: req.body.nuevo !== undefined ? req.body.nuevo === true : db.products[index].nuevo,
      };
      writeDB(db);
      res.json(db.products[index]);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    const db = readDB();
    const originalLength = db.products.length;
    db.products = db.products.filter(p => p.id !== req.params.id);
    if (db.products.length < originalLength) {
      writeDB(db);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  });

  // Stock warning setting
  app.get('/api/stock-warning', (req, res) => {
    const db = readDB();
    res.json({ enabled: db.stockWarningEnabled });
  });

  app.post('/api/stock-warning', (req, res) => {
    const db = readDB();
    db.stockWarningEnabled = req.body.enabled === true;
    writeDB(db);
    res.json({ enabled: db.stockWarningEnabled });
  });

  // Company config
  app.get('/api/company-config', (req, res) => {
    const db = readDB();
    res.json(db.companyConfig || {});
  });

  app.put('/api/company-config', (req, res) => {
    try {
      const db = readDB();
      db.companyConfig = { ...(db.companyConfig || {}), ...req.body };
      writeDB(db);
      res.json(db.companyConfig);
    } catch { res.status(500).json({ error: 'Error al guardar configuración' }); }
  });

  // Importar configuración de empresa desde Web-main
  app.post('/api/import-company-config', async (req, res) => {
    const result = await importCompanyConfig(false);
    if (result) {
      res.json({ success: true, message: 'Configuración de empresa importada correctamente' });
    } else {
      res.json({ success: false, message: 'No se pudo importar la configuración. Verifique que Web-main esté corriendo en localhost:3000.' });
    }
  });

  // Cash Register
  app.get('/api/cash-register', (req, res) => {
    const db = readDB();
    res.json(db.cashRegister || { cash: 0, bank: 0 });
  });

  app.put('/api/cash-register', (req, res) => {
    const db = readDB();
    db.cashRegister = {
      cash: Number(req.body.cash) || 0,
      bank: Number(req.body.bank) || 0
    };
    writeDB(db);
    res.json(db.cashRegister);
  });

  // Importar artículos desde Web-main (TechStore)
  app.post('/api/import-from-web', async (req, res) => {
    const result = await importFromWeb(false);
    if (result.imported === 0 && result.updated === 0) {
      res.json({ success: true, imported: 0, updated: 0, message: 'No se encontraron productos nuevos en Web-main. Verifique que el servidor esté corriendo en localhost:3000.' });
    } else {
      res.json({ success: true, ...result, message: `Importación completada: ${result.imported} nuevos, ${result.updated} actualizados` });
    }
  });

  // ========== WEB-MAIN MERGED ROUTES ==========

  // Serve Web-main static files under /web/
  app.use('/web', express.static(WEB_MAIN_DIR));
  // Catch-all for Web-main SPA routes
  app.get('/web/*', (req, res) => {
    res.sendFile(path.join(WEB_MAIN_DIR, 'index.html'));
  });

  // API de Web-main: leer data.json
  app.get('/api/web-data', (req, res) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(WEB_MAIN_DIR, 'data.json'), 'utf8'));
      res.json(data);
    } catch { res.json({ products: [], clients: [], repairs: [], services: [], config: {}, categories: [] }); }
  });

  // API de Web-main: guardar data.json
  app.post('/api/web-save', (req, res) => {
    try {
      fs.writeFileSync(path.join(WEB_MAIN_DIR, 'data.json'), JSON.stringify(req.body, null, 2));
      lastPOSWrite = Date.now();
      pendingSync = true;
      // Regenerar catalog.csv
      try {
        const data = req.body;
        const products = data.products || [];
        const brand = (data.config && data.config.companyName) || 'GIGA Computers';
        const BASE_URL = 'https://gigacomputers.com.ar';
        const csvEsc = (v: any) => {
          if (v == null) return '';
          const s = String(v);
          if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) return '"' + s.replace(/"/g, '""') + '"';
          return s;
        };
        const header = 'id,title,description,availability,condition,price,link,image_link,brand,inventory,quantity_to_sell_on_facebook';
        const rows = products.map((p: any) => [
          csvEsc(p.id || ''),
          csvEsc((p.name || '').trim()),
          csvEsc((p.desc || p.name || '').trim()),
          'in stock', 'new',
          (p.price != null ? Number(p.price).toFixed(2) : '0.00') + ' ARS',
          csvEsc(BASE_URL + '/index.html?id=' + encodeURIComponent(p.id || '')),
          csvEsc(p.image ? (p.image.startsWith('http') ? p.image : BASE_URL + '/' + p.image.replace(/^\//, '')) : ''),
          csvEsc(brand), '99', '99'
        ].join(','));
        const csvContent = '\uFEFF' + header + '\n' + rows.join('\n');
        fs.writeFileSync(path.join(WEB_MAIN_DIR, 'catalog.csv'), csvContent, 'utf8');
      } catch {}
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  // Detectar actualizaciones externas (SGTaller) — solo si el archivo es JSON v\u00e1lido (escritura completa)
  app.get('/api/check-sgtaller-update', (req, res) => {
    try {
      const files = [
        DB_FILE,
        path.join(WEB_MAIN_DIR, 'data.json'),
        SEC_DB_FILE,
      ];
      const updated = files.some(f => {
        try {
          if (fs.statSync(f).mtimeMs <= lastPOSWrite) return false;
          const content = fs.readFileSync(f, 'utf8');
          JSON.parse(content);
          return true;
        } catch { return false; }
      });
      res.json({ updated });
    } catch { res.json({ updated: false }); }
  });

  // Estado del auto-sync a Nexus
  app.get('/api/auto-sync-status', (req, res) => {
    res.json({ pending: pendingSync, syncing, lastSync: lastSyncTime, error: lastSyncError });
  });

  // Auto-sync a Nexus (GitHub)
  async function doAutoSync() {
    if (syncing || !pendingSync) return;
    syncing = true;
    pendingSync = false;
    try {
      const db = readDB();
      if (!db.companyConfig?.gitToken) {
        lastSyncError = 'Token de GitHub no configurado';
        syncing = false;
        return;
      }
      const token = db.companyConfig.gitToken;
      // Verificar si hay cambios para commitear
      execSync('git add -A', { cwd: process.cwd() });
      try {
        execSync('git diff --cached --quiet', { cwd: process.cwd() });
        syncing = false;
        return;
      } catch {}
      // Configurar git
      execSync('git config user.name "Nexus AutoSync"', { cwd: process.cwd() });
      execSync('git config user.email "autosync@nexuspos.local"', { cwd: process.cwd() });
      // URL autenticada con token
      const authedUrl = `https://${token}@github.com/gigacomputers2025-bot/Nexus.git`;
      // Agregar remote si no existe
      try {
        execSync('git remote get-url origin', { cwd: process.cwd() });
      } catch {
        execSync(`git remote add origin ${authedUrl}`, { cwd: process.cwd() });
      }
      // Actualizar remote URL con token
      execSync(`git remote set-url origin ${authedUrl}`, { cwd: process.cwd() });
      // Reemplazar commit anterior si es AutoSync
      try {
        const lastMsg = execSync('git log -1 --format=%s', { cwd: process.cwd() }).toString().trim();
        if (lastMsg.startsWith('AutoSync ')) {
          execSync('git reset --soft HEAD~1', { cwd: process.cwd() });
        }
      } catch {}
      const now = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
      execSync(`git commit -m "AutoSync ${now}"`, { cwd: process.cwd() });
      // Intentar push; si falla con 404, crear repo primero
      try {
        execSync('git push -u origin master --force', { cwd: process.cwd(), stdio: 'pipe' });
      } catch (pushErr: any) {
        const errMsg = String(pushErr.stderr || '') + String(pushErr.message || '');
        if (errMsg.includes('Repository not found') || errMsg.includes('not found') || errMsg.includes('404')) {
          await new Promise<void>((resolve, reject) => {
            const postData = JSON.stringify({ name: 'Nexus', private: false, auto_init: false });
            const req = https.request({
              hostname: 'api.github.com',
              path: '/user/repos',
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'NexusPOS',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
              },
            }, (resp: any) => {
              let body = '';
              resp.on('data', (chunk: string) => body += chunk);
              resp.on('end', () => resolve());
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
          });
          execSync('git push -u origin master --force', { cwd: process.cwd(), stdio: 'pipe' });
        } else {
          throw pushErr;
        }
      }
      lastSyncTime = now;
      lastSyncError = null;
    } catch (e: any) {
      lastSyncError = String(Buffer.isBuffer(e.stderr) ? e.stderr.toString() : (e.stderr || e.message || e));
      pendingSync = true;
      console.error('[AutoSync] Error:', lastSyncError);
    }
    syncing = false;
  }

  // Sync completo a GitHub (Web-main)
  app.post('/api/web-sync-full', (req, res) => {
    try {
      const repoUrl = "https://github.com/gigacomputers2025-bot/Web.git";
      if (!fs.existsSync(path.join(WEB_MAIN_DIR, '.git'))) {
        execSync('git init', { cwd: WEB_MAIN_DIR });
        try { execSync(`git remote add origin ${repoUrl}`, { cwd: WEB_MAIN_DIR }); } catch {}
      }
      execSync('git config user.name "TechStore Admin"', { cwd: WEB_MAIN_DIR });
      execSync('git config user.email "admin@techstore.local"', { cwd: WEB_MAIN_DIR });
      try { execSync('git branch -M main', { cwd: WEB_MAIN_DIR }); } catch {}
      execSync('git add .', { cwd: WEB_MAIN_DIR });
      try { execSync('git commit -m "Sync from unified POS"', { cwd: WEB_MAIN_DIR }); } catch {}
      try { execSync('git branch -M main', { cwd: WEB_MAIN_DIR }); } catch {}
      execSync('git push -u origin main --force', { cwd: WEB_MAIN_DIR });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  // Generate catalog.csv for WhatsApp
  app.post('/api/generate-catalog-csv', (req, res) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(WEB_MAIN_DIR, 'data.json'), 'utf8'));
      const products = data.products || [];
      const brand = (data.config && data.config.companyName) || 'GIGA Computers';
      const BASE_URL = 'https://gigacomputers.com.ar';
      const csvEsc = (v: any) => {
        if (v == null) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      const header = 'id,title,description,availability,condition,price,link,image_link,brand,inventory,quantity_to_sell_on_facebook';
      const rows = products.map((p: any) => [
        csvEsc(p.id || ''),
        csvEsc((p.name || '').trim()),
        csvEsc((p.desc || p.name || '').trim()),
        'in stock', 'new',
        (p.price != null ? Number(p.price).toFixed(2) : '0.00') + ' ARS',
        csvEsc(BASE_URL + '/index.html?id=' + encodeURIComponent(p.id || '')),
        csvEsc(p.image ? (p.image.startsWith('http') ? p.image : BASE_URL + '/' + p.image.replace(/^\//, '')) : ''),
        csvEsc(brand), '99', '99'
      ].join(','));
      const csvContent = '\uFEFF' + header + '\n' + rows.join('\n');
      fs.writeFileSync(path.join(WEB_MAIN_DIR, 'catalog.csv'), csvContent, 'utf8');
      res.json({ success: true, count: products.length });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ========== END WEB-MAIN ROUTES ==========

  // CLIENTS
  app.get('/api/clients', (req, res) => {
    const db = readDB();
    res.json(db.clients);
  });

  app.post('/api/clients', (req, res) => {
    const db = readDB();
    const newClient: Client = {
      id: Date.now().toString(),
      document: req.body.document || '',
      name: req.body.name || '',
      phone: req.body.phone || '-',
      email: req.body.email || '-'
    };
    db.clients.push(newClient);
    writeDB(db);
    res.status(201).json(newClient);
  });

  app.put('/api/clients/:id', (req, res) => {
    const db = readDB();
    const index = db.clients.findIndex(c => c.id === req.params.id);
    if (index !== -1) {
      db.clients[index] = {
        ...db.clients[index],
        document: req.body.document !== undefined ? req.body.document : db.clients[index].document,
        name: req.body.name !== undefined ? req.body.name : db.clients[index].name,
        phone: req.body.phone !== undefined ? req.body.phone : db.clients[index].phone,
        email: req.body.email !== undefined ? req.body.email : db.clients[index].email
      };
      writeDB(db);
      res.json(db.clients[index]);
    } else {
      res.status(404).json({ error: 'Client not found' });
    }
  });

  app.delete('/api/clients/:id', (req, res) => {
    const db = readDB();
    db.clients = db.clients.filter(c => c.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
  });

  // Importar clientes desde Web-main
  app.post('/api/import-web-clients', (req, res) => {
    try {
      const webData = JSON.parse(fs.readFileSync(path.join(WEB_MAIN_DIR, 'data.json'), 'utf8'));
      const webClients = webData.clients || [];
      const db = readDB();
      let imported = 0;
      for (const wc of webClients) {
        const name = wc.name || '';
        const phone = wc.phone || '';
        if (!name || !phone) continue;
        const exists = db.clients.some((c: Client) =>
          c.name.toLowerCase() === name.toLowerCase() && c.phone === phone
        );
        if (exists) continue;
        db.clients.push({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          document: phone.replace(/[^0-9]/g, '').slice(0, 11) || '00000000',
          name,
          phone,
          email: wc.email || '-'
        });
        imported++;
      }
      if (imported > 0) writeDB(db);
      res.json({ imported, total: webClients.length });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // PROVIDERS
  app.get('/api/providers', (req, res) => {
    const db = readDB();
    res.json(db.providers);
  });

  app.post('/api/providers', (req, res) => {
    const db = readDB();
    const newProvider: Provider = {
      id: Date.now().toString(),
      ruc: req.body.ruc || '',
      name: req.body.name || '',
      phone: req.body.phone || '-',
      email: req.body.email || '-'
    };
    db.providers.push(newProvider);
    writeDB(db);
    res.status(201).json(newProvider);
  });

  // PAYMENT METHODS
  app.get('/api/payment-methods', (req, res) => {
    const db = readDB();
    res.json(db.paymentMethods);
  });

  app.post('/api/payment-methods', (req, res) => {
    const db = readDB();
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      name: req.body.name || '',
      requiresCash: req.body.requiresCash === true,
      icon: req.body.icon || '',
      adjustment: req.body.adjustment !== undefined ? Number(req.body.adjustment) : 0
    };
    db.paymentMethods.push(newMethod);
    writeDB(db);
    res.status(201).json(newMethod);
  });

  app.put('/api/payment-methods/:id', (req, res) => {
    const db = readDB();
    const index = db.paymentMethods.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
      db.paymentMethods[index] = {
        ...db.paymentMethods[index],
        name: req.body.name !== undefined ? req.body.name : db.paymentMethods[index].name,
        requiresCash: req.body.requiresCash !== undefined ? req.body.requiresCash === true : db.paymentMethods[index].requiresCash,
        icon: req.body.icon !== undefined ? req.body.icon : db.paymentMethods[index].icon,
        adjustment: req.body.adjustment !== undefined ? Number(req.body.adjustment) : db.paymentMethods[index].adjustment
      };
      writeDB(db);
      res.json(db.paymentMethods[index]);
    } else {
      res.status(404).json({ error: 'Payment method not found' });
    }
  });

  app.delete('/api/payment-methods/:id', (req, res) => {
    const db = readDB();
    const originalLength = db.paymentMethods.length;
    db.paymentMethods = db.paymentMethods.filter(p => p.id !== req.params.id);
    if (db.paymentMethods.length < originalLength) {
      writeDB(db);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Payment method not found' });
    }
  });

  // SALES (including stock reduction)
  app.get('/api/sales', (req, res) => {
    const db = readDB();
    res.json(db.sales);
  });

  // Export sales to CSV — formato: CODIGO TICKET | FECHA Y HORA | CLIENTE | Producto | Importe | metodo de Pago
  app.get('/api/sales/export', (req, res) => {
    const db = readDB();
    const sales = db.sales;

    const esc = (v: any) => {
      const s = String(v ?? '');
      if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const header = 'CODIGO TICKET;FECHA Y HORA;CLIENTE;Producto;Importe;metodo de Pago';
    const rows = sales.flatMap(s =>
      s.items.map(item => [
        esc(s.id),
        esc(new Date(s.date).toLocaleString()),
        esc(s.clientName || 'Cliente General'),
        esc(item.productName),
        (item.price * item.quantity).toFixed(2),
        esc(s.paymentMethod)
      ].join(';'))
    );

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=historial-ventas-${dateStr}.csv`);
    res.send(csv);
  });

  app.delete('/api/sales/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const index = db.sales.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    db.sales.splice(index, 1);
    writeDB(db);
    res.json({ success: true });
  });

  app.post('/api/sales', (req, res) => {
    const db = readDB();
    const { items, total, paymentMethod, clientId, clientName, cashReceived, change } = req.body;
    
    // Decrement product stock
    items.forEach((item: any) => {
      const product = db.products.find(p => p.id === item.productId);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
      }
    });

    const newSale: Sale = {
      id: 'VEN-' + Date.now().toString().slice(-6),
      date: new Date().toISOString(),
      items,
      total: Number(total) || 0,
      paymentMethod: paymentMethod || 'Efectivo',
      clientId,
      clientName: clientName || 'Cliente General',
      cashReceived: Number(cashReceived) || total,
      change: Number(change) || 0
    };

    db.sales.push(newSale);
    writeDB(db);
    res.status(201).json(newSale);
  });

  // PURCHASES (stock increment)
  app.get('/api/purchases', (req, res) => {
    const db = readDB();
    res.json(db.purchases);
  });

  app.post('/api/purchases', (req, res) => {
    const db = readDB();
    const { providerId, providerName, items, total } = req.body;

    // Increment stock
    items.forEach((item: any) => {
      const product = db.products.find(p => p.id === item.productId);
      if (product) {
        product.stock += item.quantity;
      }
    });

    const newPurchase: Purchase = {
      id: 'COM-' + Date.now().toString().slice(-6),
      date: new Date().toISOString(),
      providerId,
      providerName,
      items,
      total: Number(total) || 0
    };

    db.purchases.push(newPurchase);
    writeDB(db);
    res.status(201).json(newPurchase);
  });

  // EXPENSES (egresos)
  app.get('/api/expenses', (req, res) => {
    const db = readDB();
    res.json(db.expenses || []);
  });

  app.post('/api/expenses', (req, res) => {
    const db = readDB();
    const newExpense: Expense = {
      id: 'EGR-' + Date.now().toString().slice(-6),
      date: req.body.date || new Date().toISOString(),
      type: req.body.type || 'efectivo',
      description: req.body.description || '',
      amount: Number(req.body.amount) || 0
    };
    db.expenses.push(newExpense);
    writeDB(db);
    res.status(201).json(newExpense);
  });

  app.delete('/api/expenses/:id', (req, res) => {
    const db = readDB();
    const originalLength = db.expenses.length;
    db.expenses = db.expenses.filter(e => e.id !== req.params.id);
    if (db.expenses.length < originalLength) {
      writeDB(db);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Egreso no encontrado' });
    }
  });

  // API Route to Zip and Download the Full App
  app.get('/api/download-app', (req, res) => {
    try {
      const zip = new AdmZip();

      // Add files from the root directory
      const rootFiles = [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        'server.ts',
        'database.db',
        'start-nexus-pos.bat',
        '.env.example'
      ];

      rootFiles.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          zip.addLocalFile(filePath);
        }
      });

      // Add the dist folder recursively if it exists
      const distFolder = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distFolder)) {
        zip.addLocalFolder(distFolder, 'dist');
      }

      // Add the src folder recursively
      const srcFolder = path.join(process.cwd(), 'src');
      if (fs.existsSync(srcFolder)) {
        zip.addLocalFolder(srcFolder, 'src');
      }

      // Add the assets folder recursively if it exists and has content
      const assetsFolder = path.join(process.cwd(), 'assets');
      if (fs.existsSync(assetsFolder)) {
        zip.addLocalFolder(assetsFolder, 'assets');
      }

      const zipBuffer = zip.toBuffer();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=nexus-pos-completo.zip');
      res.setHeader('Content-Length', zipBuffer.length);
      res.end(zipBuffer);
    } catch (error: any) {
      console.error('Error generating ZIP:', error);
      res.status(500).json({ error: 'Hubo un error al generar el archivo de descarga: ' + error.message });
    }
  });

  // Backup database
  app.get('/api/backup', (req, res) => {
    try {
      const data = readDB();
      const backupContent = JSON.stringify(data, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=nexus-pos-backup-' + new Date().toISOString().slice(0, 10) + '.json');
      res.send(backupContent);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al generar backup: ' + (error.message || error) });
    }
  });

  // Restore database from backup
  app.post('/api/restore', (req, res) => {
    try {
      const backupData = req.body;
      if (!backupData || !backupData.products || !backupData.clients) {
        return res.status(400).json({ error: 'El archivo de backup no es válido' });
      }
      writeDB(backupData as DatabaseSchema);
      res.json({ success: true, message: 'Backup restaurado correctamente. Recargando datos...' });
    } catch (error: any) {
      res.status(500).json({ error: 'Error al restaurar backup: ' + (error.message || error) });
    }
  });

  // Clean data restart API for convenience
  app.post('/api/reset', (req, res) => {
    writeDB(INITIAL_DB);
    res.json({ success: true, message: 'Database reset to initial template state.' });
  });

  // Vite preview integration
  if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_HMR !== 'true') {
    // If not HMR disabled, can mount Vite
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Otherwise serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn(`[WARN] dist folder not found at ${distPath}. Serving API routes only.`);
    }
  }

  // PORT fallback to 3000 inside AI Studio development environment, but 3010 as user's request
  // Let us check if we are in AI Studio (which runs development code inside containers requiring 3000)
  // Or if we run via command-line where process.env.PORT can override it
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || process.env.DISABLE_HMR === 'true';
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : (isDevelopment ? 3000 : 3010);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`  Nexus POS Terminal Server successfully`);
    console.log(`  Listening on http://localhost:${PORT}`);
    console.log(`  AutoSync a GitHub cada 30s`);
    console.log(`=========================================`);
    setInterval(doAutoSync, 30000);
    setTimeout(doAutoSync, 5000);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[FATAL] Puerto ${PORT} ya esta en uso.`);
    } else {
      console.error('[FATAL] Error al iniciar servidor:', err);
    }
    process.exit(1);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
