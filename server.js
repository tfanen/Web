const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// IN-MEMORY HIGH-SPEED CACHE & ATOMIC NON-BLOCKING WRITE QUEUE
let dbCache = null;
let isWriting = false;
let writePending = false;

function loadDbToMemory() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      dbCache = { users: [], categories: [], industries: [], products: [], orders: [], quotes: [], tickers: [], topBarSlides: [], heroCards: [], printsServices: [], chatbotRules: [] };
      return dbCache;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    dbCache = JSON.parse(data);
    if (!dbCache.tickers) dbCache.tickers = [];
    if (!dbCache.topBarSlides) dbCache.topBarSlides = [];
    if (!dbCache.heroCards) dbCache.heroCards = [];
    if (!dbCache.printsServices) dbCache.printsServices = [];
    if (!dbCache.quotes) dbCache.quotes = [];
    if (!dbCache.chatbotRules) dbCache.chatbotRules = [];
    if (!dbCache.settings) dbCache.settings = { includeTax: false };
    return dbCache;
  } catch (err) {
    console.error('Error loading DB to RAM:', err);
    if (!dbCache) {
      dbCache = { users: [], categories: [], industries: [], products: [], orders: [], quotes: [], tickers: [], topBarSlides: [], heroCards: [], printsServices: [], chatbotRules: [] };
    }
    return dbCache;
  }
}

// Initial RAM load on startup
loadDbToMemory();

function readDb() {
  if (!dbCache) {
    return loadDbToMemory();
  }
  return dbCache;
}

function writeDb(data) {
  if (data) {
    dbCache = data;
  }

  if (isWriting) {
    writePending = true;
    return true;
  }

  isWriting = true;
  writePending = false;

  const tempFile = `${DB_FILE}.tmp`;
  const jsonStr = JSON.stringify(dbCache, null, 2);

  fs.promises.writeFile(tempFile, jsonStr, 'utf8')
    .then(() => fs.promises.rename(tempFile, DB_FILE))
    .catch(err => {
      console.error('Async atomic write error:', err);
      return fs.promises.writeFile(DB_FILE, jsonStr, 'utf8');
    })
    .catch(e => console.error('Fallback write error:', e))
    .finally(() => {
      isWriting = false;
      if (writePending) {
        setTimeout(writeDb, 30);
      }
    });

  return true;
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }
  const token = authHeader.replace('Bearer ', '').trim();
  const db = readDb();
  const user = db.users.find(u => u.id === token || u.email === token);
  req.user = user || null;
  next();
}

app.use(authenticate);

// API ROUTES

// CONSOLIDATED INITIALIZATION ENDPOINT (HIGH SPEED SINGLE REQUEST FOR 100+ CLIENTS)
app.get('/api/init-data', (req, res) => {
  const db = readDb();
  res.json({
    success: true,
    data: {
      categories: db.categories || [],
      industries: db.industries || [],
      products: db.products || [],
      tickers: db.tickers || [],
      topBarSlides: db.topBarSlides || [],
      heroCards: db.heroCards || [],
      printsServices: db.printsServices || [],
      chatbotRules: db.chatbotRules || [],
      settings: db.settings || { includeTax: false }
    }
  });
});

// SETTINGS API
app.get('/api/settings', (req, res) => {
  const db = readDb();
  res.json({ success: true, data: db.settings || { includeTax: false } });
});

app.put('/api/settings', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const { includeTax } = req.body;
  const db = readDb();
  if (!db.settings) db.settings = {};
  db.settings.includeTax = includeTax === true || includeTax === 'true';
  writeDb(db);

  res.json({ success: true, message: 'تم تحديث إعدادات الضريبة العامة بنجاح', data: db.settings });
});

// 0. Image Upload Endpoint
app.post('/api/upload', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح لرفع الصور' });
  }

  const { imageBase64, fileName } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'لم يتم إرسال بيانات الصورة' });
  }

  try {
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'صيغة الصورة غير صحيحة' });
    }

    const ext = matches[1].split('/')[1] || 'png';
    const buffer = Buffer.from(matches[2], 'base64');
    const safeFileName = `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFileName);

    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/${safeFileName}`;
    res.json({ success: true, message: 'تم رفع الصورة بنجاح', url: imageUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'فشل في حفظ الصورة على الخادم' });
  }
});

// 1. Categories & Industries
app.get('/api/categories', (req, res) => {
  const db = readDb();
  res.json({ success: true, data: db.categories });
});

app.post('/api/categories', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const { id, name, icon, description, keywords, defaultPrice, defaultUnit } = req.body;
  if (!id || !name) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال معرف القسم واسمه' });
  }

  const db = readDb();
  if (db.categories.some(c => c.id === id)) {
    return res.status(400).json({ success: false, message: 'معرف القسم موجود بالفعل' });
  }

  const newCategory = {
    id,
    name,
    icon: icon || 'fa-folder',
    description: description || '',
    keywords: keywords || '',
    defaultPrice: parseFloat(defaultPrice) || 0,
    defaultUnit: defaultUnit || 'وحدة'
  };

  db.categories.push(newCategory);
  writeDb(db);

  res.json({ success: true, message: 'تم إضافة التصنيف الجديد بنجاح', data: newCategory });
});

app.put('/api/categories/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const catId = req.params.id;
  const { name, icon, description, keywords, defaultPrice, defaultUnit } = req.body;

  const db = readDb();
  const index = db.categories.findIndex(c => c.id === catId);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'القسم غير موجود' });
  }

  db.categories[index] = {
    ...db.categories[index],
    name: name || db.categories[index].name,
    icon: icon || db.categories[index].icon,
    description: description !== undefined ? description : db.categories[index].description,
    keywords: keywords !== undefined ? keywords : db.categories[index].keywords,
    defaultPrice: defaultPrice !== undefined ? parseFloat(defaultPrice) : db.categories[index].defaultPrice,
    defaultUnit: defaultUnit !== undefined ? defaultUnit : db.categories[index].defaultUnit
  };

  writeDb(db);
  res.json({ success: true, message: 'تم تحديث التصنيف بنجاح', data: db.categories[index] });
});

app.delete('/api/categories/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const catId = req.params.id;
  const db = readDb();
  db.categories = db.categories.filter(c => c.id !== catId);
  writeDb(db);

  res.json({ success: true, message: 'تم حذف التصنيف بنجاح' });
});

app.get('/api/industries', (req, res) => {
  const db = readDb();
  res.json({ success: true, data: db.industries });
});

// 2. HERO FEATURED CARDS API
app.get('/api/hero-cards', (req, res) => {
  const db = readDb();
  res.json({ success: true, data: db.heroCards || [] });
});

app.post('/api/hero-cards', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const { badge, title, subtitle, tag, image } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'برجاء إدخال عنوان كارت الهيرو' });
  }

  const db = readDb();
  const newHeroCard = {
    id: 'hc-' + Date.now(),
    badge: badge || 'قسم التابلوهات والديكور',
    title,
    subtitle: subtitle || '',
    tag: tag || 'توصيل لكافة المحافظات',
    image: image || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800'
  };

  if (!db.heroCards) db.heroCards = [];
  db.heroCards.push(newHeroCard);
  writeDb(db);

  res.json({ success: true, message: 'تم إضافة كارت الهيرو المميز بنجاح', data: newHeroCard });
});

app.put('/api/hero-cards/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  const idx = (db.heroCards || []).findIndex(c => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'كارت الهيرو غير موجود' });
  }

  db.heroCards[idx] = { ...db.heroCards[idx], ...req.body };
  writeDb(db);

  res.json({ success: true, message: 'تم تحديث كارت الهيرو بنجاح', data: db.heroCards[idx] });
});

app.delete('/api/hero-cards/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  db.heroCards = (db.heroCards || []).filter(c => c.id !== req.params.id);
  writeDb(db);

  res.json({ success: true, message: 'تم حذف كارت الهيرو بنجاح' });
});

// 3. PRINTS SERVICES API
app.get('/api/prints-services', (req, res) => {
  const db = readDb();
  res.json({ success: true, data: db.printsServices || [] });
});

app.post('/api/prints-services', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const { title, description, image, waText } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'برجاء إدخال اسم خدمة المطبوعات' });
  }

  const db = readDb();
  const newService = {
    id: 'ps-' + Date.now(),
    title,
    description: description || '',
    image: image || 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=600',
    waText: waText || `السلام عليكم، أريد الاستفسار عن ${title}`
  };

  if (!db.printsServices) db.printsServices = [];
  db.printsServices.push(newService);
  writeDb(db);

  res.json({ success: true, message: 'تم إضافة خدمة المطبوعات للسلايدر المنفصل بنجاح', data: newService });
});

app.put('/api/prints-services/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  const idx = (db.printsServices || []).findIndex(s => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'خدمة المطبوعات غير موجودة' });
  }

  db.printsServices[idx] = { ...db.printsServices[idx], ...req.body };
  writeDb(db);

  res.json({ success: true, message: 'تم تحديث خدمة المطبوعات بنجاح', data: db.printsServices[idx] });
});

app.delete('/api/prints-services/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  db.printsServices = (db.printsServices || []).filter(s => s.id !== req.params.id);
  writeDb(db);

  res.json({ success: true, message: 'تم حذف خدمة المطبوعات بنجاح' });
});

// 3.5 CHATBOT AUTO-REPLY RULES API
app.get('/api/chatbot-rules', (req, res) => {
  const db = readDb();
  res.json({ success: true, data: db.chatbotRules || [] });
});

app.post('/api/chatbot-rules', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const { topic, keywords, response, showWaBtn, waBtnText, formatType, introText, bulletItems, outroText } = req.body;
  if (!topic || !response) {
    return res.status(400).json({ success: false, message: 'برجاء إدخال عنوان الموضوع ونص الرد الآلي' });
  }

  const db = readDb();
  const kwList = Array.isArray(keywords)
    ? keywords
    : (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()).filter(Boolean) : []);

  const newRule = {
    id: 'cb-' + Date.now(),
    topic,
    keywords: kwList,
    formatType: formatType || 'fields',
    introText: introText || '',
    bulletItems: Array.isArray(bulletItems) ? bulletItems : [],
    outroText: outroText || '',
    response,
    showWaBtn: showWaBtn === true || showWaBtn === 'true',
    waBtnText: waBtnText || 'التواصل عبر الواتساب'
  };

  if (!db.chatbotRules) db.chatbotRules = [];
  db.chatbotRules.push(newRule);
  writeDb(db);

  res.json({ success: true, message: 'تم إضافة رد البوت الآلي بنجاح', data: newRule });
});

app.put('/api/chatbot-rules/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  const idx = (db.chatbotRules || []).findIndex(r => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'قاعدة الرد الآلي غير موجودة' });
  }

  const { topic, keywords, response, showWaBtn, waBtnText, formatType, introText, bulletItems, outroText } = req.body;
  const kwList = keywords !== undefined
    ? (Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()).filter(Boolean) : []))
    : db.chatbotRules[idx].keywords;

  db.chatbotRules[idx] = {
    ...db.chatbotRules[idx],
    topic: topic || db.chatbotRules[idx].topic,
    keywords: kwList,
    formatType: formatType !== undefined ? formatType : db.chatbotRules[idx].formatType,
    introText: introText !== undefined ? introText : db.chatbotRules[idx].introText,
    bulletItems: bulletItems !== undefined ? (Array.isArray(bulletItems) ? bulletItems : []) : db.chatbotRules[idx].bulletItems,
    outroText: outroText !== undefined ? outroText : db.chatbotRules[idx].outroText,
    response: response || db.chatbotRules[idx].response,
    showWaBtn: showWaBtn !== undefined ? (showWaBtn === true || showWaBtn === 'true') : db.chatbotRules[idx].showWaBtn,
    waBtnText: waBtnText !== undefined ? waBtnText : db.chatbotRules[idx].waBtnText
  };

  writeDb(db);

  res.json({ success: true, message: 'تم تحديث قاعدة الرد الآلي بنجاح', data: db.chatbotRules[idx] });
});

app.delete('/api/chatbot-rules/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  db.chatbotRules = (db.chatbotRules || []).filter(r => r.id !== req.params.id);
  writeDb(db);

  res.json({ success: true, message: 'تم حذف قاعدة الرد الآلي بنجاح' });
});

// 4. Tickers API
app.get('/api/tickers', (req, res) => {
  const db = readDb();
  res.json({ success: true, data: db.tickers || [] });
});

app.post('/api/tickers', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const { text, icon } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: 'برجاء إدخال نص العرض' });
  }

  const db = readDb();
  const newTicker = {
    id: 't-' + Date.now(),
    text,
    icon: icon || 'fa-gift'
  };

  db.tickers.push(newTicker);
  writeDb(db);

  res.json({ success: true, message: 'تم إضافة العرض لشريط العروض بنجاح', data: newTicker });
});

app.put('/api/tickers/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  const idx = db.tickers.findIndex(t => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'العرض غير موجود' });
  }

  db.tickers[idx] = { ...db.tickers[idx], ...req.body };
  writeDb(db);

  res.json({ success: true, message: 'تم تحديث العرض بنجاح', data: db.tickers[idx] });
});

app.delete('/api/tickers/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  db.tickers = db.tickers.filter(t => t.id !== req.params.id);
  writeDb(db);

  res.json({ success: true, message: 'تم حذف العرض من الشريط' });
});

// 5. Top Bar Slides API
app.get('/api/topbar-slides', (req, res) => {
  const db = readDb();
  res.json({ success: true, data: db.topBarSlides || [] });
});

app.post('/api/topbar-slides', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const { title, detail, icon, categoryId } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'برجاء إدخال العنوان' });
  }

  const db = readDb();
  const newSlide = {
    id: 'ts-' + Date.now(),
    title,
    detail: detail || '',
    icon: icon || 'fa-star',
    categoryId: categoryId || 'all'
  };

  db.topBarSlides.push(newSlide);
  writeDb(db);

  res.json({ success: true, message: 'تم إضافة الشريحة للشريط العلوي', data: newSlide });
});

app.put('/api/topbar-slides/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  const idx = db.topBarSlides.findIndex(s => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'الشريحة غير موجودة' });
  }

  db.topBarSlides[idx] = { ...db.topBarSlides[idx], ...req.body };
  writeDb(db);

  res.json({ success: true, message: 'تم تحديث الشريحة بنجاح', data: db.topBarSlides[idx] });
});

app.delete('/api/topbar-slides/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  db.topBarSlides = db.topBarSlides.filter(s => s.id !== req.params.id);
  writeDb(db);

  res.json({ success: true, message: 'تم حذف الشريحة' });
});

// 6. Products
app.get('/api/products', (req, res) => {
  const db = readDb();
  let list = db.products || [];

  const { categoryId, industryId, search } = req.query;

  if (categoryId) {
    list = list.filter(p => p.categoryId === categoryId);
  }

  if (industryId) {
    list = list.filter(p => p.industries && p.industries.includes(industryId));
  }

  if (search) {
    const q = search.toLowerCase().trim();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, data: list });
});

app.get('/api/products/:id', (req, res) => {
  const db = readDb();
  const prod = db.products.find(p => p.id === req.params.id);
  if (!prod) {
    return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
  }
  res.json({ success: true, data: prod });
});

app.post('/api/products', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const { categoryId, name, description, basePrice, priceUnit, calcType, icon, image, industries, options, isBestSeller, discountPercent, discountExpiry } = req.body;
  if (!name || !categoryId || basePrice === undefined) {
    return res.status(400).json({ success: false, message: 'برجاء تعبئة اسم المنتج والقسم والسعر الأساسي' });
  }

  const db = readDb();
  const newProduct = {
    id: 'prod-' + Date.now(),
    categoryId,
    name,
    description: description || '',
    basePrice: parseFloat(basePrice) || 0,
    priceUnit: priceUnit || 'وحدة',
    calcType: calcType || 'quantity',
    icon: icon || 'fa-box',
    image: image || 'https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?w=600&auto=format&fit=crop&q=80',
    isBestSeller: isBestSeller || false,
    discountPercent: parseFloat(discountPercent) || 0,
    discountExpiry: discountExpiry || '',
    industries: industries || [],
    options: options || {}
  };

  db.products.push(newProduct);
  writeDb(db);

  res.json({ success: true, message: 'تم إضافة المنتج بنجاح', data: newProduct });
});

app.put('/api/products/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
  }

  const existing = db.products[index];
  const updated = {
    ...existing,
    ...req.body,
    basePrice: req.body.basePrice !== undefined ? parseFloat(req.body.basePrice) : existing.basePrice,
    discountPercent: req.body.discountPercent !== undefined ? parseFloat(req.body.discountPercent) : existing.discountPercent
  };

  db.products[index] = updated;
  writeDb(db);

  res.json({ success: true, message: 'تم تحديث بيانات المنتج بنجاح', data: updated });
});

app.delete('/api/products/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  const filtered = db.products.filter(p => p.id !== req.params.id);
  db.products = filtered;
  writeDb(db);

  res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
});

// AUTHENTICATION

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase() && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }

  const userClean = { ...user };
  delete userClean.password;

  res.json({
    success: true,
    token: user.id,
    user: userClean,
    message: `مرحباً بك مجدداً، ${user.name}`
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone, company } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'برجاء ملء جميع الحقول المطلوبة' });
  }

  const db = readDb();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل بالفعل' });
  }

  const newUser = {
    id: 'u-' + Date.now(),
    name,
    email,
    password,
    phone: phone || '',
    company: company || '',
    role: 'customer',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);

  const userClean = { ...newUser };
  delete userClean.password;

  res.json({
    success: true,
    token: newUser.id,
    user: userClean,
    message: 'تم إنشاء الحساب بنجاح'
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'غير مسجل الدخول' });
  }
  const userClean = { ...req.user };
  delete userClean.password;
  res.json({ success: true, user: userClean });
});

// ORDERS & INVOICES (WITH OPTIONAL TAX SUPPORT)

app.post('/api/orders', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'يرجى تسجيل الدخول لاتمام الطلب' });
  }

  const { items, notes, shippingFee, governorate } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'سلة التسوق فارغة' });
  }

  const db = readDb();

  let subtotal = 0;
  const processedItems = items.map(item => {
    let itemTotal = 0;
    if (item.width && item.height) {
      const area = parseFloat(item.width) * parseFloat(item.height);
      itemTotal = Math.round(area * item.unitPrice * (item.quantity || 1));
    } else {
      itemTotal = Math.round(item.unitPrice * (item.quantity || 1));
    }
    subtotal += itemTotal;
    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity || 1,
      width: item.width || null,
      height: item.height || null,
      unitPrice: item.unitPrice,
      totalPrice: itemTotal,
      selectedOptions: item.selectedOptions || {}
    };
  });

  const isTaxIncluded = db.settings && db.settings.includeTax === true;
  const taxRate = isTaxIncluded ? 0.14 : 0;
  const taxAmount = isTaxIncluded ? Math.round(subtotal * taxRate) : 0;
  const shipping = shippingFee !== undefined ? parseFloat(shippingFee) : 50;
  const grandTotal = subtotal + taxAmount + shipping;

  const now = new Date();
  const timeStr = String(now.valueOf()).slice(-6);
  const randEntropy = String(Math.floor(100 + Math.random() * 900));
  const orderId = `ORD-${timeStr}-${randEntropy}`;
  const invoiceNum = `INV-2025-${timeStr}${randEntropy}`;

  const newOrder = {
    id: orderId,
    invoiceNumber: invoiceNum,
    userId: req.user.id,
    clientName: req.user.name,
    clientEmail: req.user.email,
    clientPhone: req.user.phone || '',
    clientCompany: req.user.company || '',
    governorate: governorate || 'محافظة الغربية (طنطا والقرى)',
    items: processedItems,
    subtotal,
    taxRate,
    taxAmount,
    shippingFee: shipping,
    grandTotal,
    status: 'processing',
    statusAr: 'قيد التنفيذ والطباعة',
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);
  writeDb(db);

  res.json({
    success: true,
    message: 'تم إرسال طلبك وإنشاء الفاتورة بنجاح!',
    data: newOrder
  });
});

app.get('/api/orders', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'غير مسجل الدخول' });
  }

  const db = readDb();
  let orders = db.orders || [];

  if (req.user.role !== 'admin') {
    orders = orders.filter(o => o.userId === req.user.id);
  }

  res.json({ success: true, data: orders });
});

app.get('/api/orders/:id', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'غير مسجل الدخول' });
  }

  const db = readDb();
  const order = db.orders.find(o => o.id === req.params.id || o.invoiceNumber === req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'الطلب أو الفاتورة غير موجودة' });
  }

  if (req.user.role !== 'admin' && order.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'غير مصرح لمشاهدة هذه الفاتورة' });
  }

  res.json({ success: true, data: order });
});

app.put('/api/orders/:id/status', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const { status, statusAr } = req.body;
  const db = readDb();
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);

  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  }

  const statusMap = {
    'pending': 'قيد المراجعة',
    'processing': 'قيد التنفيذ والطباعة',
    'completed': 'تم الطباعة والتسليم',
    'cancelled': 'ملغى'
  };

  db.orders[orderIndex].status = status || db.orders[orderIndex].status;
  db.orders[orderIndex].statusAr = statusAr || statusMap[status] || db.orders[orderIndex].statusAr;

  writeDb(db);

  res.json({
    success: true,
    message: 'تم تحديث حالة الطلب والفاتورة',
    data: db.orders[orderIndex]
  });
});

// QUOTES API FOR ADMIN
app.get('/api/quotes', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للوصول للطلبات' });
  }

  const db = readDb();
  res.json({ success: true, data: db.quotes || [] });
});

app.delete('/api/quotes/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح للقيام بهذه العملية' });
  }

  const db = readDb();
  db.quotes = (db.quotes || []).filter(q => q.id !== req.params.id);
  writeDb(db);

  res.json({ success: true, message: 'تم حذف طلب عرض السعر' });
});

app.post('/api/quotes', (req, res) => {
  const { name, phone, email, category, details } = req.body;
  if (!name || !phone || !details) {
    return res.status(400).json({ success: false, message: 'برجاء إدخال الاسم ورقم الهاتف وتفاصيل الطلب' });
  }

  const db = readDb();
  const quote = {
    id: 'Q-' + Date.now(),
    name,
    phone,
    email: email || '',
    category: category || 'طلب مخصص',
    details,
    createdAt: new Date().toISOString()
  };

  if (!db.quotes) db.quotes = [];
  db.quotes.push(quote);
  writeDb(db);

  res.json({ success: true, message: 'تم إرسال طلب عرض السعر بنجاح، وسيتواصل معك فريق مطبعة تفنين قريباً!' });
});

// Serve static uploaded images & static web files
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 خادم مطبعة تفنين تعمل بنجاح على: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
