/* ==========================================================================
   مطبعة تفنين - طنطا (TAFNEEN PRESS - TANTA) - MAIN JAVASCRIPT
   ========================================================================== */

let state = {
    categories: [],
    industries: [],
    products: [],
    tickers: [],
    topBarSlides: [],
    heroCards: [],
    printsServices: [],
    quotes: [],
    currentTopSlideIndex: 0,
    topSlideTimer: null,
    currentHeroCardIndex: 0,
    heroCardTimer: null,
    currentUser: null,
    cart: [],
    settings: { includeTax: false },
    selectedCategory: 'bestsellers',
    activeProductForCalc: null,
    calcConfig: {
        method: 'online',
        pieces: 1,
        previewMode: '3d',
        arScale: 75,
        arOffset: 0,
        vrColor: '#C5D3D2',
        vrFurniture: 'sofa',
        vrFurnitureImg: 'https://cdn.saferart.com/wp-content/uploads/2022/03/sofa12.png',
        sizeLabel: 'S',
        dimensions: '30×40 سم',
        sizeMultiplier: 1.0,
        type: 'تابلوه ببرواز',
        typePrice: 456,
        model: 'بدون إطار داخلي أبيض',
        modelExtra: 0,
        color: 'خشبي فاتح',
        price: 456
    },
    calcOptions: {},
    activeDetailTab: 'desc',
    selectedCardType: {
        name: 'كرت شخصى وجه واحد UV',
        pricePer1000: 130,
        icon: 'fa-sun',
        badge: 'UV وجه واحد',
        desc: 'كوشيه 350g + ورنيش UV زاهي وجه واحد'
    },
    cardQty: 1000,
    selectedDecorCategory: 'all',
    selectedPrintsCategory: 'all',
    currentActiveTab: 'home'
};

// SMART CHATBOT ENGINE STATE
let chatbotState = {
    isOpen: false,
    userName: '',
    userPhone: '',
    userProduct: '',
    step: 'greeting'
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    loadLocalCart();
    checkAuthState();
    await fetchInitialData();
    setupOutsideClickListeners();
    startTopBarCarousel();
    startHeroCardsCarousel();
    initChatbot();
});

function loadLocalCart() {
    try {
        const saved = localStorage.getItem('tfnen_cart');
        if (saved) {
            state.cart = JSON.parse(saved);
            updateCartBadge();
        }
    } catch (e) {
        state.cart = [];
    }
}

function saveLocalCart() {
    localStorage.setItem('tfnen_cart', JSON.stringify(state.cart));
    updateCartBadge();
}

function updateCartBadge() {
    const totalCount = state.cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalPrice = state.cart.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = totalCount;

    const totalHeaderEl = document.getElementById('cart-total-header');
    if (totalHeaderEl) totalHeaderEl.textContent = `${totalPrice} ج.م`;
}

function checkAuthState() {
    const userStr = localStorage.getItem('tfnen_user');
    const token = localStorage.getItem('tfnen_token');
    if (userStr && token) {
        try {
            state.currentUser = JSON.parse(userStr);
            renderAuthHeader();
        } catch (e) {
            state.currentUser = null;
        }
    } else {
        renderAuthHeader();
    }
}

function renderAuthHeader() {
    const container = document.getElementById('auth-buttons-container');
    const adminLinkFooter = document.getElementById('admin-link-footer');
    if (!container) return;

    if (state.currentUser) {
        const isAdmin = state.currentUser.role === 'admin';
        if (adminLinkFooter) adminLinkFooter.style.display = 'inline-block';

        container.innerHTML = `
            <div class="user-dropdown" style="display:flex; align-items:center; gap:8px;">
                <button class="btn-top-auth" onclick="openMyOrdersModal()"><i class="fa-solid fa-receipt"></i> فواتيري وطلباتي</button>
                ${isAdmin ? '<button class="btn-top-auth outline" onclick="openAdminPanel()"><i class="fa-solid fa-user-gear"></i> لوحة التحكم</button>' : ''}
                <span style="color:#FFF; font-weight:700;">أهلاً، ${state.currentUser.name}</span>
                <button class="btn-top-auth" onclick="logout()" title="تسجيل الخروج" style="color:#EF4444;"><i class="fa-solid fa-right-from-bracket"></i></button>
            </div>
        `;
    } else {
        if (adminLinkFooter) adminLinkFooter.style.display = 'none';
        container.innerHTML = `
            <button class="btn-top-auth" onclick="openAuthModal('login')"><i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول</button>
            <button class="btn-top-auth outline" onclick="openAuthModal('register')"><i class="fa-solid fa-user-plus"></i> حساب جديد</button>
        `;
    }
}

// AUTHENTICATION MODAL AND LOGIN/REGISTER HANDLERS
function openAuthModal(tab = 'login') {
    switchAuthTab(tab);
    openModal('auth-modal');
}

function switchAuthTab(tab) {
    const loginBtn = document.getElementById('tab-login-btn');
    const regBtn = document.getElementById('tab-register-btn');
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');

    if (tab === 'login') {
        if (loginBtn) loginBtn.classList.add('active');
        if (regBtn) regBtn.classList.remove('active');
        if (loginForm) loginForm.style.display = 'block';
        if (regForm) regForm.style.display = 'none';
    } else {
        if (regBtn) regBtn.classList.add('active');
        if (loginBtn) loginBtn.classList.remove('active');
        if (regForm) regForm.style.display = 'block';
        if (loginForm) loginForm.style.display = 'none';
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        }).then(r => r.json());

        if (res.success && res.user && res.token) {
            state.currentUser = res.user;
            localStorage.setItem('tfnen_user', JSON.stringify(res.user));
            localStorage.setItem('tfnen_token', res.token);

            renderAuthHeader();
            closeModal('auth-modal');
            alert(res.message || `مرحباً بك مجدداً، ${res.user.name}`);
        } else {
            alert(res.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('حدث خطأ أثناء تسجيل الدخول');
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const company = document.getElementById('reg-company').value;
    const password = document.getElementById('reg-password').value;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, company, password })
        }).then(r => r.json());

        if (res.success && res.user && res.token) {
            state.currentUser = res.user;
            localStorage.setItem('tfnen_user', JSON.stringify(res.user));
            localStorage.setItem('tfnen_token', res.token);

            renderAuthHeader();
            closeModal('auth-modal');
            alert(res.message || 'تم إنشاء الحساب بنجاح');
        } else {
            alert(res.message || 'فشل في إنشاء الحساب');
        }
    } catch (err) {
        console.error('Register error:', err);
        alert('حدث خطأ أثناء إنشاء الحساب');
    }
}

function logout() {
    state.currentUser = null;
    localStorage.removeItem('tfnen_user');
    localStorage.removeItem('tfnen_token');
    renderAuthHeader();
    alert('تم تسجيل الخروج بنجاح');
}

// FETCH ALL INITIAL DATA FROM SERVER WITH FALLBACK
async function fetchInitialData() {
    try {
        let loaded = false;
        try {
            const initRes = await fetch('/api/init-data').then(r => r.json());
            if (initRes && initRes.success && initRes.data) {
                state.categories = initRes.data.categories || [];
                state.industries = initRes.data.industries || [];
                state.products = initRes.data.products || [];
                state.tickers = initRes.data.tickers || [];
                state.topBarSlides = initRes.data.topBarSlides || [];
                state.heroCards = initRes.data.heroCards || [];
                state.printsServices = initRes.data.printsServices || [];
                state.chatbotRules = initRes.data.chatbotRules || [];
                state.settings = initRes.data.settings || { includeTax: false };
                loaded = true;
            }
        } catch (e) {
            console.warn('init-data endpoint fallback:', e);
        }

        if (!loaded || !state.products || state.products.length === 0) {
            const [catRes, indRes, prodRes, tickRes, slidesRes, heroRes, printsRes, cbRes, setRes] = await Promise.all([
                fetch('/api/categories').then(r => r.json()).catch(() => ({ success: false })),
                fetch('/api/industries').then(r => r.json()).catch(() => ({ success: false })),
                fetch('/api/products').then(r => r.json()).catch(() => ({ success: false })),
                fetch('/api/tickers').then(r => r.json()).catch(() => ({ success: false })),
                fetch('/api/topbar-slides').then(r => r.json()).catch(() => ({ success: false })),
                fetch('/api/hero-cards').then(r => r.json()).catch(() => ({ success: false })),
                fetch('/api/prints-services').then(r => r.json()).catch(() => ({ success: false })),
                fetch('/api/chatbot-rules').then(r => r.json()).catch(() => ({ success: false })),
                fetch('/api/settings').then(r => r.json()).catch(() => ({ success: false }))
            ]);

            if (catRes && catRes.success) state.categories = catRes.data || [];
            if (indRes && indRes.success) state.industries = indRes.data || [];
            if (prodRes && prodRes.success) state.products = prodRes.data || [];
            if (tickRes && tickRes.success) state.tickers = tickRes.data || [];
            if (slidesRes && slidesRes.success) state.topBarSlides = slidesRes.data || [];
            if (heroRes && heroRes.success) state.heroCards = heroRes.data || [];
            if (printsRes && printsRes.success) state.printsServices = printsRes.data || [];
            if (cbRes && cbRes.success) state.chatbotRules = cbRes.data || [];
            if (setRes && setRes.success) state.settings = setRes.data || { includeTax: false };
        }

        renderCategories();
        filterByCategory('bestsellers');
        renderHomeBestSellers();
        renderDecorPage('all');
        renderPrintsPage('all');
        renderCardsPage();
        renderDynamicCategoryTabs();
        renderTickers();
        renderTopBarSlideCurrent();
        renderHeroShowcaseCards();
        startHeroCardsCarousel();
        renderPrintsServicesSlider();

        const path = window.location.pathname.replace('/', '').trim();
        if (['decor', 'prints', 'cards', 'quote', 'home', 'admin'].includes(path)) {
            switchTab(path);
        } else {
            switchTab('home');
        }

        window.addEventListener('popstate', () => {
            const p = window.location.pathname.replace('/', '').trim();
            if (['decor', 'prints', 'cards', 'quote', 'home', 'admin'].includes(p)) {
                switchTab(p);
            } else {
                switchTab('home');
            }
        });
    } catch (err) {
        console.error('Error in fetchInitialData:', err);
    }
}

// RENDER DYNAMIC HERO CARDS CAROUSEL WITH 10-SECOND AUTOMATED TIMER
function renderHeroShowcaseCards() {
    const container = document.getElementById('hero-card-preview-container');
    if (!container) return;

    let list = state.heroCards;
    if (!list || list.length === 0) {
        list = [{
            id: 'hc-1',
            badge: 'قسم التابلوهات والورق 3D والديكور',
            title: 'شراء أونلاين وتوصيل لجميع المحافظات',
            subtitle: 'حول صورك الشخصية لتابلوه جاهز للتعليق',
            tag: 'توصيل لكافة المحافظات',
            image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80'
        }];
    }

    const index = state.currentHeroCardIndex % list.length;
    const currentCard = list[index];

    let dotsHtml = '';
    if (list.length > 1) {
        dotsHtml = `
            <div style="position:absolute; bottom:12px; left:16px; display:flex; gap:6px; z-index:10;">
                ${list.map((_, i) => `<span onclick="setHeroCardIndex(${i})" style="width:${i === index ? '22px' : '8px'}; height:8px; border-radius:10px; background:${i === index ? '#F59E0B' : 'rgba(255,255,255,0.4)'}; cursor:pointer; transition:all 0.3s ease;"></span>`).join('')}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="preview-badge"><i class="fa-solid fa-star"></i> ${currentCard.badge}</div>
        <img src="${currentCard.image}" alt="${currentCard.title}">
        <div class="preview-footer">
            <div>
                <strong>${currentCard.title}</strong>
                <small>${currentCard.subtitle || ''}</small>
            </div>
            <span class="highlight-tag">${currentCard.tag || 'توصيل لكافة المحافظات'}</span>
        </div>
        ${dotsHtml}
    `;
    container.style.opacity = '1';
}

function startHeroCardsCarousel() {
    if (state.heroCardTimer) clearInterval(state.heroCardTimer);
    state.heroCardTimer = setInterval(() => {
        nextHeroCard();
    }, 10000); // 10 seconds rotation
}

function nextHeroCard() {
    let list = state.heroCards || [];
    if (list.length <= 1) return;
    state.currentHeroCardIndex = (state.currentHeroCardIndex + 1) % list.length;
    renderHeroShowcaseCards();
}

function setHeroCardIndex(idx) {
    state.currentHeroCardIndex = idx;
    renderHeroShowcaseCards();
    startHeroCardsCarousel();
}

// RENDER ALL PRINTING & SIGNAGE SERVICES IN THE HORIZONTAL CAROUSEL SLIDER
function renderPrintsServicesSlider() {
    const wrapper = document.getElementById('prints-slider-wrapper');
    if (!wrapper) return;

    const decorCats = [
        'wall-panels', 'wallpaper', 'wall-decor',
        'canvas-abstract', 'canvas-islamic', 'canvas-sets',
        'canvas-nature', 'canvas-coffee', 'canvas-custom',
        'canvas-kids', 'canvas-cars-pop', 'canvas-classic'
    ];
    const nonDecorProds = state.products.filter(p => !decorCats.includes(p.categoryId));

    let combinedList = [...state.printsServices];

    nonDecorProds.forEach(p => {
        if (!combinedList.some(s => s.title === p.name)) {
            combinedList.push({
                id: p.id,
                title: p.name,
                description: p.description,
                image: p.image,
                waText: `السلام عليكم مطبعة تفنين، أريد الاستفسار وطلب سعر لخدمة / منتج: ${p.name}`
            });
        }
    });

    if (combinedList.length === 0) {
        wrapper.innerHTML = `<p style="padding:20px; color:#64748B;">جاري تحميل معرض المطبوعات والواجهات...</p>`;
        return;
    }

    wrapper.innerHTML = combinedList.map(srv => {
        const encodedMsg = encodeURIComponent(srv.waText || `السلام عليكم، أريد الاستفسار وطلب سعر لخدمة: ${srv.title}`);
        const waUrl = `https://wa.me/201505028565?text=${encodedMsg}`;

        return `
            <div class="prints-slide-card">
                <div class="prints-slide-img">
                    <img src="${srv.image}" alt="${srv.title}" onerror="this.src='https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=600'">
                </div>
                <div class="prints-slide-body">
                    <h4>${srv.title}</h4>
                    <p>${srv.description}</p>
                    <a href="${waUrl}" target="_blank" class="btn btn-sm" style="background:#25D366; color:#FFF; font-weight:700;">
                        <i class="fa-brands fa-whatsapp"></i> تواصل للطلب
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

function scrollPrintsSlider(dir) {
    const wrapper = document.getElementById('prints-slider-wrapper');
    if (!wrapper) return;
    const amount = dir === 'left' ? -300 : 300;
    wrapper.scrollBy({ left: amount, behavior: 'smooth' });
}

// RENDER MOVING TICKER
function renderTickers() {
    const marqueeContainer = document.getElementById('ticker-marquee-box');
    if (!marqueeContainer) return;

    if (!state.tickers || state.tickers.length === 0) {
        marqueeContainer.innerHTML = `
            <span class="ticker-item"><i class="fa-solid fa-gift gold-text"></i> مرحباً بكم في مطبعة تفنين طنطا - TAFNEEN PRESS!</span>
        `;
        return;
    }

    const listHtml = state.tickers.map(t => `
        <span class="ticker-item"><i class="fa-solid ${t.icon || 'fa-gift'} gold-text"></i> ${t.text}</span>
    `).join('');

    marqueeContainer.innerHTML = listHtml + listHtml;
}

// TOP BAR 10-SECOND AUTOMATED CAROUSEL
function renderTopBarSlideCurrent() {
    const slideBox = document.getElementById('top-bar-slide-box');
    if (!slideBox) return;

    if (!state.topBarSlides || state.topBarSlides.length === 0) {
        slideBox.innerHTML = `
            <a href="tel:01060046150" class="top-info-item"><i class="fa-solid fa-phone"></i> 01060046150 - 01275270599</a>
            <a href="https://wa.me/201505028565" target="_blank" class="top-info-item whatsapp-item"><i class="fa-brands fa-whatsapp"></i> 01505028565</a>
            <a href="https://maps.app.goo.gl/zHpVyeUfwHZKwDwE7" target="_blank" class="top-info-item address-item"><i class="fa-solid fa-location-dot"></i> طنطا: شارع عادل الهرميل خلف مستشفى دار القمة</a>
        `;
        return;
    }

    const currentSlide = state.topBarSlides[state.currentTopSlideIndex % state.topBarSlides.length];

    slideBox.style.opacity = '0';
    setTimeout(() => {
        slideBox.innerHTML = `
            <div style="display:inline-flex; align-items:center; gap:10px;" class="top-slide-animated">
                <span class="top-info-item" style="color:#C084FC; font-weight:800;">
                    <i class="fa-solid ${currentSlide.icon || 'fa-star'}"></i> ${currentSlide.title}:
                </span>
                <span style="color:#CBD5E1; font-weight:600;">${currentSlide.detail}</span>
                ${currentSlide.categoryId && currentSlide.categoryId !== 'location' ? `
                    <button class="btn btn-outline btn-sm" onclick="filterByCategory('${currentSlide.categoryId}')" style="padding:2px 10px; font-size:0.75rem; border-color:#A855F7; color:#C084FC; margin-right:8px;">تصفح القسم <i class="fa-solid fa-arrow-left"></i></button>
                ` : ''}
            </div>
        `;
        slideBox.style.opacity = '1';
    }, 250);
}

function startTopBarCarousel() {
    if (state.topSlideTimer) clearInterval(state.topSlideTimer);
    state.topSlideTimer = setInterval(() => {
        nextTopBarSlide();
    }, 10000);
}

function nextTopBarSlide() {
    if (!state.topBarSlides || state.topBarSlides.length === 0) return;
    state.currentTopSlideIndex = (state.currentTopSlideIndex + 1) % state.topBarSlides.length;
    renderTopBarSlideCurrent();
}

function prevTopBarSlide() {
    if (!state.topBarSlides || state.topBarSlides.length === 0) return;
    state.currentTopSlideIndex = (state.currentTopSlideIndex - 1 + state.topBarSlides.length) % state.topBarSlides.length;
    renderTopBarSlideCurrent();
}

// RENDER CATEGORIES
function renderCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    grid.innerHTML = state.categories.map(cat => `
        <div class="category-card" onclick="filterByCategory('${cat.id}')">
            <div class="category-icon">
                <i class="fa-solid ${cat.icon || 'fa-box'}"></i>
            </div>
            <h3>${cat.name}</h3>
            <p>${cat.description}</p>
            <div class="category-action">
                <span>تصفح المنتجات والخدمات</span>
                <i class="fa-solid fa-arrow-left"></i>
            </div>
        </div>
    `).join('');
}

// SMART RENDER DYNAMIC CATEGORY FILTER TABS FOR DECOR & BEST SELLERS
function renderDynamicCategoryTabs() {
    const container = document.getElementById('dynamic-category-tabs');
    if (!container) return;

    const decorCategories = state.categories.filter(c => [
        'wall-panels', 'wallpaper', 'wall-decor',
        'canvas-abstract', 'canvas-islamic', 'canvas-sets',
        'canvas-nature', 'canvas-coffee', 'canvas-custom',
        'canvas-kids', 'canvas-cars-pop', 'canvas-classic'
    ].includes(c.id));

    let html = `
        <button class="filter-tab ${state.selectedCategory === 'bestsellers' ? 'active' : ''}" onclick="filterByCategory('bestsellers', this)" style="background:linear-gradient(135deg, #F59E0B, #D97706); color:#FFF; font-weight:800; border:none;">
            <i class="fa-solid fa-fire"></i> الأكثر طلباً والمميزة
        </button>
        <button class="filter-tab ${state.selectedCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all', this)">كل المنتجات</button>
    `;

    html += decorCategories.map(cat => `
        <button class="filter-tab ${state.selectedCategory === cat.id ? 'active' : ''}" onclick="filterByCategory('${cat.id}', this)">${cat.name}</button>
    `).join('');

    container.innerHTML = html;
}

function filterByCategory(catId, btnEl) {
    state.selectedCategory = catId;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const decorCatIds = [
        'wall-panels', 'wallpaper', 'wall-decor',
        'canvas-abstract', 'canvas-islamic', 'canvas-sets',
        'canvas-nature', 'canvas-coffee', 'canvas-custom',
        'canvas-kids', 'canvas-cars-pop', 'canvas-classic'
    ];

    const isDecorCat = decorCatIds.includes(catId);
    const isCardsCat = catId === 'business-cards';

    if (isDecorCat) {
        switchTab('decor');
        filterDecorPage(catId);
    } else if (isCardsCat) {
        switchTab('cards');
    } else if (catId === 'bestsellers') {
        switchTab('home');
        renderHomeBestSellers();
    } else {
        switchTab('prints');
        filterPrintsPage(catId);
    }
}

function filterProducts(catId, btnEl) {
    filterByCategory(catId, btnEl);
}

// RENDER PRODUCTS GRID UTILITY
function renderProducts(list) {
    const grid = document.getElementById('decor-products-grid') ||
                 document.getElementById('prints-products-grid') ||
                 document.getElementById('home-bestsellers-grid') ||
                 document.getElementById('cards-products-grid');
    if (!grid) return;

    let displayList = list || state.products;

    if (!displayList || displayList.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px; color:#64748B;">
            <i class="fa-solid fa-box-open" style="font-size:3rem; margin-bottom:15px; color:#CBD5E1;"></i>
            <h3>لم يتم العثور على منتجات مطابقة</h3>
        </div>`;
        return;
    }

    grid.innerHTML = displayList.map(prod => buildProductCardHtml(prod)).join('');
}

function buildProductCardHtml(prod) {
    const cat = state.categories.find(c => c.id === prod.categoryId);
    const catName = cat ? cat.name : 'مطبعة تفنين';

    let displayPrice = prod.basePrice;
    if (prod.includeTax) {
        displayPrice = Math.round(prod.basePrice * 1.14);
    }

    let priceHtml = '';
    const hasDiscount = prod.discountPercent && prod.discountPercent > 0;
    if (hasDiscount) {
        const discountedPrice = Math.round(displayPrice * (1 - prod.discountPercent / 100));
        priceHtml = `
            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                <div>
                    <span style="text-decoration:line-through; color:#94A3B8; font-size:0.85rem; margin-left:6px;">${displayPrice} ج.م</span>
                    <span class="price-amount" style="color:#059669;">${discountedPrice} ج.م</span>
                </div>
                ${prod.includeTax ? `<span style="font-size:0.68rem; color:#7C3AED; font-weight:700;">(شامل الضريبة)</span>` : ''}
                ${prod.discountExpiry ? `<span style="font-size:0.7rem; color:#D97706; margin-top:2px;"><i class="fa-solid fa-clock"></i> ينتهي الخصم: ${prod.discountExpiry}</span>` : ''}
            </div>
        `;
    } else {
        priceHtml = `
            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                <span class="price-amount">${displayPrice} ج.م</span>
                ${prod.includeTax ? `<span style="font-size:0.68rem; color:#7C3AED; font-weight:700;">(شامل الضريبة)</span>` : ''}
            </div>
        `;
    }

    return `
        <div class="product-card">
            <div class="product-img-wrapper">
                ${prod.isBestSeller ? `<span style="position:absolute; top:12px; left:12px; background:linear-gradient(135deg,#F59E0B,#D97706); color:#FFF; font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:20px; z-index:2; box-shadow:0 4px 10px rgba(0,0,0,0.2);"><i class="fa-solid fa-fire"></i> الأكثر طلباً</span>` : ''}
                ${hasDiscount ? `<span style="position:absolute; top:12px; right:12px; background:linear-gradient(135deg,#EF4444,#DC2626); color:#FFF; font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:20px; z-index:2; box-shadow:0 4px 10px rgba(0,0,0,0.2);"><i class="fa-solid fa-tags"></i> خصم ${prod.discountPercent}%</span>` : ''}
                <span class="product-cat-badge">${catName}</span>
                <img src="${prod.image}" alt="${prod.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?w=600&auto=format&fit=crop&q=80'">
            </div>
            <div class="product-body">
                <h3>${prod.name}</h3>
                <p>${prod.description}</p>
                <div class="product-price-row">
                    <span class="price-unit">تبدأ من / ${prod.priceUnit}</span>
                    ${priceHtml}
                </div>
                <button class="btn btn-primary btn-block" onclick="openProductModal('${prod.id}')">
                    <i class="fa-solid fa-cart-plus"></i> تخصيص وشراء أونلاين
                </button>
            </div>
        </div>
    `;
}

// LIVE SEARCH AUTOCOMPLETE
function handleSearchLiveInput(e) {
    const input = document.getElementById('global-search');
    const liveBox = document.getElementById('search-live-results');
    if (!input || !liveBox) return;

    const q = input.value.trim().toLowerCase();
    if (!q) {
        liveBox.classList.remove('open');
        liveBox.innerHTML = '';
        return;
    }

    const matched = state.products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );

    if (matched.length === 0) {
        liveBox.innerHTML = `<div style="padding:12px; text-align:center; color:#64748B; font-size:0.85rem;">لا توجد نتائج مطابقة لـ "${q}"</div>`;
    } else {
        liveBox.innerHTML = matched.slice(0, 5).map(prod => `
            <div class="live-search-item" onclick="openProductModalFromSearch('${prod.id}')">
                <img src="${prod.image}" alt="${prod.name}" onerror="this.src='https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?w=100'">
                <div class="live-search-info">
                    <h5>${prod.name}</h5>
                    <span>${prod.basePrice} ج.م / ${prod.priceUnit}</span>
                </div>
                <i class="fa-solid fa-chevron-left" style="font-size:0.8rem; color:#94A3B8;"></i>
            </div>
        `).join('');
    }

    liveBox.classList.add('open');

    if (e.key === 'Enter') {
        executeSearch();
        liveBox.classList.remove('open');
    }
}

function openProductModalFromSearch(prodId) {
    const liveBox = document.getElementById('search-live-results');
    if (liveBox) liveBox.classList.remove('open');
    openProductModal(prodId);
}

function setupOutsideClickListeners() {
    document.addEventListener('click', (e) => {
        const liveBox = document.getElementById('search-live-results');
        const searchWrapper = document.querySelector('.header-search-wrapper');
        if (liveBox && searchWrapper && !searchWrapper.contains(e.target)) {
            liveBox.classList.remove('open');
        }
    });
}

function executeSearch() {
    const input = document.getElementById('global-search');
    if (!input) return;
    const q = input.value.trim().toLowerCase();
    if (!q) {
        renderProducts(state.products);
        return;
    }

    const filtered = state.products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
    renderProducts(filtered);

    const sec = document.getElementById('products-section');
    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
}

// ADVANCED PRODUCT MODAL CONFIGURATOR / SHOWCASE
function openProductModal(prodId) {
    const prod = state.products.find(p => p.id === prodId);
    if (!prod) return;

    state.activeProductForCalc = prod;
    document.getElementById('modal-product-name').textContent = prod.name;
    const modalBody = document.getElementById('modal-product-body');

    const isCanvasCategory = ['wall-panels', 'canvas-abstract', 'canvas-nature', 'canvas-kids', 'canvas-coffee', 'canvas-classic', 'canvas-islamic', 'canvas-custom', 'canvas-sets', 'canvas-cars-pop'].includes(prod.categoryId);
    const isDecorCategory = ['wall-panels', 'wallpaper', 'wall-decor', 'canvas-abstract', 'canvas-nature', 'canvas-kids', 'canvas-coffee', 'canvas-classic', 'canvas-islamic', 'canvas-custom', 'canvas-sets', 'canvas-cars-pop'].includes(prod.categoryId);

    if (isCanvasCategory) {
        state.calcConfig = {
            method: 'online',
            pieces: 1,
            previewMode: '3d',
            arScale: 75,
            arOffset: 0,
            vrColor: '#C5D3D2',
            vrFurniture: 'sofa',
            vrFurnitureImg: 'https://cdn.saferart.com/wp-content/uploads/2022/03/sofa12.png',
            sizeLabel: 'S',
            dimensions: '30×40 سم',
            sizeMultiplier: 1.0,
            type: 'تابلوه ببرواز',
            typePrice: 456,
            model: 'بدون إطار داخلي أبيض',
            modelExtra: 0,
            color: 'خشبي فاتح',
            price: 456
        };

        const randomSku = 'TF' + Math.floor(100000 + Math.random() * 900000);

        modalBody.innerHTML = `
            <!-- TOP DYNAMIC PREVIEW AREA (3D / AR / VR) -->
            <div class="canvas-preview-showcase">
                <div id="canvas-showcase-dynamic-box">
                    <div class="canvas-3d-wrapper">
                        <img src="${prod.image}" alt="${prod.name}">
                        <span class="canvas-sku-watermark"><i class="fa-solid fa-barcode"></i> كود ${randomSku}</span>
                    </div>
                </div>

                <div class="canvas-quick-shortcuts">
                    <button type="button" class="shortcut-badge-btn active" id="btn-mode-3d" onclick="setCanvasPreviewMode('3d', this)">
                        <i class="fa-solid fa-cubes purple-icon"></i> استعراض 3D
                    </button>
                    <button type="button" class="shortcut-badge-btn" id="btn-mode-ar" onclick="setCanvasPreviewMode('ar', this)">
                        <i class="fa-solid fa-camera purple-icon"></i> معاينة جدارك AR
                    </button>
                    <button type="button" class="shortcut-badge-btn" id="btn-mode-vr" onclick="setCanvasPreviewMode('vr', this)">
                        <i class="fa-solid fa-couch purple-icon"></i> الأثاث وغرف VR
                    </button>
                </div>
            </div>

            <!-- AUTOMATIC MULTI-PIECE SPLITTER OPTION -->
            <div class="canvas-config-card">
                <div class="canvas-config-header">
                    <span class="canvas-config-title"><i class="fa-solid fa-grip purple-icon"></i> عدد قطع وتقسيم التابلوه (تقسيم فوري منسق)</span>
                    <span class="canvas-config-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> اتجاه صحيح 100%</span>
                </div>
                <div class="size-chips-grid">
                    <button type="button" class="size-chip-btn piece-chip-btn active" onclick="selectCanvasPieces(1, this)">
                        <span class="size-badge">1</span> قطعة واحدة
                    </button>
                    <button type="button" class="size-chip-btn piece-chip-btn" onclick="selectCanvasPieces(2, this)">
                        <span class="size-badge">2</span> قطعتين
                    </button>
                    <button type="button" class="size-chip-btn piece-chip-btn" onclick="selectCanvasPieces(3, this)">
                        <span class="size-badge">3</span> ثلاث قطع
                    </button>
                    <button type="button" class="size-chip-btn piece-chip-btn" onclick="selectCanvasPieces(4, this)">
                        <span class="size-badge">4</span> اربع قطع
                    </button>
                    <button type="button" class="size-chip-btn piece-chip-btn" onclick="promptCustomCanvasPieces(this)">
                        <span class="size-badge">5+</span> أكثر
                    </button>
                </div>
            </div>

            <!-- PURCHASE METHOD SELECTION -->
            <div class="canvas-config-card" style="margin-bottom:15px; padding:12px;">
                <div style="font-size:0.88rem; font-weight:700; color:#1E1B4B; margin-bottom:8px;">إختار طريقة الشراء</div>
                <div style="display:flex; gap:10px;">
                    <button type="button" class="size-chip-btn active" onclick="setPurchaseMethod('online', this)" style="flex:1; justify-content:center;">
                        <i class="fa-solid fa-cart-shopping"></i> شراء أونلاين (تجهيز فوري)
                    </button>
                    <button type="button" class="size-chip-btn" onclick="setPurchaseMethod('express', this)" style="flex:1; justify-content:center;">
                        <i class="fa-solid fa-store"></i> استلام من الفرع بطنطا
                    </button>
                </div>
            </div>

            <!-- 1. CHOOSE SIZE -->
            <div class="canvas-config-card">
                <div class="canvas-config-header">
                    <span class="canvas-config-title"><i class="fa-solid fa-ruler-combined purple-icon"></i> اختار المقاس</span>
                    <span class="canvas-config-badge" onclick="alert('دليل المقاسات:\nS: 30×40 سم (مناسب للمساحات الصغير)\nM: 40×60 سم (مثالي للغرف والمكاتب)\nL: 60×90 سم (ممتاز للصالات)\nXL: 80×120 سم (كبير للمجالس)\nXXL: 100×150 سم (بانورامي واسع)')" style="cursor:pointer;"><i class="fa-solid fa-tape"></i> دليل المقاسات</span>
                </div>
                <div class="size-chips-grid">
                    <button type="button" class="size-chip-btn active" onclick="selectCanvasSize('S', '30×40 سم', 1.0, this)">
                        <span class="size-badge">S</span> 30×40 سم (456 ج.م)
                    </button>
                    <button type="button" class="size-chip-btn" onclick="selectCanvasSize('M', '40×60 سم', 1.25, this)">
                        <span class="size-badge">M</span> 40×60 سم (570 ج.م)
                    </button>
                    <button type="button" class="size-chip-btn" onclick="selectCanvasSize('L', '60×90 سم', 1.85, this)">
                        <span class="size-badge">L</span> 60×90 سم (840 ج.م)
                    </button>
                    <button type="button" class="size-chip-btn" onclick="selectCanvasSize('XL', '80×120 سم', 2.6, this)">
                        <span class="size-badge">XL</span> 80×120 سم (1180 ج.م)
                    </button>
                    <button type="button" class="size-chip-btn" onclick="selectCanvasSize('XXL', '100×150 سم', 3.9, this)">
                        <span class="size-badge">XXL</span> 100×150 سم (1780 ج.م)
                    </button>
                </div>
            </div>

            <!-- 2. CHOOSE CANVAS TYPE -->
            <div class="canvas-config-card">
                <div class="canvas-config-header">
                    <span class="canvas-config-title"><i class="fa-solid fa-palette purple-icon"></i> اختر نوع التابلوه</span>
                    <span class="canvas-config-badge"><i class="fa-solid fa-circle-info"></i> الفرق والمواصفات</span>
                </div>
                <div class="canvas-type-grid">
                    <div class="canvas-type-card active" onclick="selectCanvasType('تابلوه ببرواز', 456, this)">
                        <i class="fa-solid fa-circle-check check-icon"></i>
                        <div class="type-card-icon"><i class="fa-solid fa-square-full"></i></div>
                        <div class="type-card-info">
                            <h4>تابلوه مع برواز</h4>
                            <span class="type-card-price">(456 جنيه)</span>
                        </div>
                    </div>

                    <div class="canvas-type-card" onclick="selectCanvasType('تابلوه ببرواز + أكريليك', 553, this)">
                        <i class="fa-solid fa-circle-check check-icon"></i>
                        <div class="type-card-icon"><i class="fa-solid fa-gem"></i></div>
                        <div class="type-card-info">
                            <h4>برواز مع أكريليك</h4>
                            <span class="type-card-price" style="color:#059669;">(553 جنيه - لامع جداً)</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. CHOOSE FRAME MODEL -->
            <div class="canvas-config-card">
                <div class="canvas-config-header">
                    <span class="canvas-config-title"><i class="fa-solid fa-border-all purple-icon"></i> إختار موديل البرواز</span>
                    <span class="canvas-config-badge">شوف الفرق هنا</span>
                </div>
                <div class="frame-model-grid">
                    <div class="frame-model-card active" onclick="selectFrameModel('بدون إطار داخلي أبيض', 0, this)">
                        <i class="fa-solid fa-circle-check check-icon"></i>
                        بدون إطار داخلي أبيض
                    </div>
                    <div class="frame-model-card" onclick="selectFrameModel('مع إطار داخلي أبيض (مات)', 60, this)">
                        <i class="fa-solid fa-circle-check check-icon"></i>
                        مع إطار داخلي أبيض
                    </div>
                </div>
            </div>

            <!-- 4. CHOOSE FRAME COLOR -->
            <div class="canvas-config-card">
                <div class="canvas-config-header">
                    <span class="canvas-config-title"><i class="fa-solid fa-brush purple-icon"></i> إختار لون البرواز</span>
                    <span class="canvas-config-badge">ألوان البراويز بوضوح</span>
                </div>
                <div class="color-swatches-flex">
                    <div class="color-swatch-item active" onclick="selectFrameColor('خشبي فاتح', this)">
                        <div class="swatch-box" style="background:#C19A6B;"></div>
                        خشبي فاتح
                    </div>
                    <div class="color-swatch-item" onclick="selectFrameColor('خشبي داكن', this)">
                        <div class="swatch-box" style="background:#4A2E16;"></div>
                        خشبي داكن
                    </div>
                    <div class="color-swatch-item" onclick="selectFrameColor('ذهبي لامع', this)">
                        <div class="swatch-box" style="background:linear-gradient(135deg, #F59E0B, #D97706);"></div>
                        ذهبي لامع
                    </div>
                    <div class="color-swatch-item" onclick="selectFrameColor('فضة لامع', this)">
                        <div class="swatch-box" style="background:linear-gradient(135deg, #E2E8F0, #94A3B8);"></div>
                        فضة لامع
                    </div>
                    <div class="color-swatch-item" onclick="selectFrameColor('أسود ملكي', this)">
                        <div class="swatch-box" style="background:#0F172A;"></div>
                        أسود ملكي
                    </div>
                    <div class="color-swatch-item" onclick="selectFrameColor('أبيض ناصع', this)">
                        <div class="swatch-box" style="background:#FFFFFF; border:1px solid #CCC;"></div>
                        أبيض ناصع
                    </div>
                </div>
            </div>

            <!-- ATTACH DESIGN / NOTES -->
            <div class="form-group" style="margin-bottom:20px;">
                <label style="font-weight:700; color:#1E1B4B;">رابط صورتك الشخصية / التابلوه الخاص المطلوب لطباعته</label>
                <textarea id="calc-design-link" rows="2" placeholder="أرفق رابط صورتك (Google Drive / WeTransfer) أو اكتب أي ملاحظات خاصة للتصميم..."></textarea>
            </div>

            <!-- GUARANTEES & HIGHLIGHTS BOX -->
            <div class="guarantees-card">
                <div style="font-size:0.95rem; font-weight:800; color:#F59E0B; margin-bottom:12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                    <span><i class="fa-solid fa-barcode"></i> كود المنتج: ${randomSku}</span>
                    <span>تقييم العملاء: ⭐⭐⭐⭐⭐</span>
                </div>
                <div class="guarantee-list">
                    <div class="guarantee-item"><i class="fa-solid fa-circle-check"></i> خامات قطنية 100% وألوان ثابتة HD</div>
                    <div class="guarantee-item"><i class="fa-solid fa-circle-check"></i> طباعة بجودة فائقة 4K HD على كانفاس</div>
                    <div class="guarantee-item"><i class="fa-solid fa-circle-check"></i> إكسسوارات التعليق + دليل تعليق مصور</div>
                    <div class="guarantee-item"><i class="fa-solid fa-circle-check"></i> وقت الإنتاج: جاهز للتسليم خلال 24-48 ساعة</div>
                </div>
            </div>

            <!-- ALTERNATIVE QUICK ORDER CHANNELS -->
            <div class="quick-order-channels">
                <span>أو اشترى عن طريق:</span>
                <a href="https://wa.me/201505028565" target="_blank" class="wa"><i class="fa-brands fa-whatsapp"></i> واتس اب</a>
                <a href="tel:01060046150" class="tel"><i class="fa-solid fa-phone"></i> اتصل 01060046150</a>
            </div>

            <!-- DETAILED TABBED CONTENT BELOW -->
            <div style="margin-bottom:20px;">
                <div class="canvas-details-tabs-nav">
                    <button type="button" class="canvas-tab-btn active" onclick="switchCanvasDetailTab('desc', this)">وصف التابلوه</button>
                    <button type="button" class="canvas-tab-btn" onclick="switchCanvasDetailTab('specs', this)">المواصفات والجودة</button>
                    <button type="button" class="canvas-tab-btn" onclick="switchCanvasDetailTab('real', this)">صور من الواقع</button>
                    <button type="button" class="canvas-tab-btn" onclick="switchCanvasDetailTab('package', this)">إيه هايوصلك عند الشراء</button>
                    <button type="button" class="canvas-tab-btn" onclick="switchCanvasDetailTab('faq', this)">أسئلة متكررة</button>
                </div>

                <div id="canvas-tab-panel-desc" class="canvas-tab-content-panel">
                    <p>يتميز هذا التابلوه المودرن بتصميم فني مبتكر وطباعة حرارية على قماش كانفاس قطني 100% مشدود بحرفية على شاسي خشب سويدي متين مع خيارات إطارات خشبية مودرن وأكريليك لامع لحماية فائقة.</p>
                </div>

                <div id="canvas-tab-panel-specs" class="canvas-tab-content-panel" style="display:none;">
                    <p><strong>• كانفاس مخصص:</strong> قماش قطني فاخر مخصص للوحات الفنية المعمارية والديكورية.<br>
                    <strong>• طباعة بجودة فائقة:</strong> أحبار HD صلبة وآمنة تماماً للأطفال والمنازل.</p>
                </div>

                <div id="canvas-tab-panel-real" class="canvas-tab-content-panel" style="display:none;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <img src="${prod.image}" style="width:100%; height:120px; object-fit:cover; border-radius:8px;">
                        <img src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600" style="width:100%; height:120px; object-fit:cover; border-radius:8px;">
                    </div>
                </div>

                <div id="canvas-tab-panel-package" class="canvas-tab-content-panel" style="display:none;">
                    <p>✓ فولدر المحتويات الرسمي لمستندات الطلب<br>✓ التابلوه مغلف بعناية فائقة<br>✓ إكسسوارات التعليق الكاملة + دليل تعليق مصور</p>
                </div>

                <div id="canvas-tab-panel-faq" class="canvas-tab-content-panel" style="display:none;">
                    <p><strong>س: كم يستغرق وقت الشحن والتسليم؟</strong><br>ج: يتم التجهيز والتسليم خلال 24 - 48 ساعة بطنطا وجميع المحافظات.</p>
                </div>
            </div>

            <!-- BOTTOM PURCHASE BAR -->
            <div class="bottom-purchase-bar">
                <div class="purchase-price-wrap">
                    <span class="purchase-price-label">السعر الكلي التقديري:</span>
                    <span class="purchase-price-amount" id="canvas-calculated-total">456 جنيه</span>
                </div>
                <button type="button" class="btn-purchase-action" onclick="handleAddToCartCanvasConfig()">
                    <i class="fa-solid fa-cart-plus"></i> شراء / إضافة لمشترياتى
                </button>
            </div>
        `;

        openModal('product-modal');
        renderCanvasShowcasePreview();
        updateCanvasConfigPrice();
        return;
    }

    if (isDecorCategory) {
        state.calcOptions = {};
        const isDimensions = prod.calcType === 'dimensions';

        let optionsHtml = '';
        if (prod.options) {
            optionsHtml = Object.keys(prod.options).map(optKey => {
                const values = prod.options[optKey];
                state.calcOptions[optKey] = values[0];
                return `
                    <div class="form-group">
                        <label>${getOptionLabelAr(optKey)}</label>
                        <select onchange="updateCalcOption('${optKey}', this.value)">
                            ${values.map(val => `<option value="${val}">${val}</option>`).join('')}
                        </select>
                    </div>
                `;
            }).join('');
        }

        let priceDisplayHtml = `<div style="margin-top:10px; font-weight:700; color:#7C3AED;">السعر الأساسي: ${prod.basePrice} ج.م / ${prod.priceUnit}</div>`;
        if (prod.discountPercent && prod.discountPercent > 0) {
            const discPrice = Math.round(prod.basePrice * (1 - prod.discountPercent / 100));
            priceDisplayHtml = `
                <div style="margin-top:10px;">
                    <span style="font-size:0.85rem; color:#94A3B8; text-decoration:line-through;">السعر الأصلي: ${prod.basePrice} ج.م</span><br>
                    <span style="font-weight:800; color:#059669; font-size:1.1rem;">سعر الخصم (${prod.discountPercent}%): ${discPrice} ج.م / ${prod.priceUnit}</span>
                    ${prod.discountExpiry ? `<br><span style="font-size:0.75rem; color:#D97706;"><i class="fa-solid fa-clock"></i> ينتهي الخصم في: ${prod.discountExpiry}</span>` : ''}
                </div>
            `;
        }

        modalBody.innerHTML = `
            <div style="display:flex; gap:20px; margin-bottom:20px; flex-wrap:wrap;">
                <img src="${prod.image}" alt="${prod.name}" style="width:120px; height:120px; object-fit:cover; border-radius:8px;">
                <div style="flex:1;">
                    <p style="font-size:0.9rem; color:#64748B;">${prod.description}</p>
                    ${priceDisplayHtml}
                </div>
            </div>

            <form onsubmit="handleAddToCartFromModal(event)">
                ${isDimensions ? `
                    <div class="form-row">
                        <div class="form-group">
                            <label>العرض (بالمتر) *</label>
                            <input type="number" step="0.1" min="0.5" max="50" id="calc-width" value="1.0" required oninput="calculateLivePrice()">
                        </div>
                        <div class="form-group">
                            <label>الارتفاع / الطول (بالمتر) *</label>
                            <input type="number" step="0.1" min="0.5" max="50" id="calc-height" value="1.0" required oninput="calculateLivePrice()">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>عدد القطع / الأمتار الإضافية</label>
                        <input type="number" min="1" max="1000" id="calc-qty" value="1" required oninput="calculateLivePrice()">
                    </div>
                ` : `
                    <div class="form-group">
                        <label>الكمية المطلوب طباعتها *</label>
                        <select id="calc-qty" onchange="calculateLivePrice()">
                            <option value="1">1 طقم / علبة (${prod.priceUnit})</option>
                            <option value="2">2 طقم / علبة</option>
                            <option value="3">3 طقم / علب</option>
                            <option value="5">5 طقم / علب (خصم 5%)</option>
                            <option value="10">10 طقم / علب (خصم 10%)</option>
                        </select>
                    </div>
                `}

                ${optionsHtml}

                <div class="form-group">
                    <label>ملاحظات إضافية / رابط التصميم</label>
                    <textarea id="calc-design-link" rows="2" placeholder="اكتب الملاحظات أو أرفق رابط تصميمك..."></textarea>
                </div>

                <div style="background:#F5F3FF; padding:16px; border-radius:12px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; border:1px solid #DDD6FE;">
                    <div>
                        <span style="font-size:0.9rem; color:#475569;">إجمالي السعر التقديري:</span>
                        <div style="font-size:0.78rem; color:#64748B;">شامل الخامات والطباعة المتميزة</div>
                    </div>
                    <strong id="live-calculated-price" style="font-size:1.5rem; color:#7C3AED;">${prod.basePrice} ج.م</strong>
                </div>

                <button type="submit" class="btn btn-primary btn-block btn-lg"><i class="fa-solid fa-cart-plus"></i> إضافة إلى السلة والتحضير</button>
            </form>
        `;

        openModal('product-modal');
        calculateLivePrice();
        return;
    }

    // PRINTING SHOWCASE MODAL
    const encodedMsg = encodeURIComponent(`السلام عليكم مطبعة تفنين، أريد الاستفسار وطلب سعر مخصص لـ ${prod.name}`);
    const waUrl = `https://wa.me/201505028565?text=${encodedMsg}`;

    modalBody.innerHTML = `
        <div style="text-align:center; margin-bottom:20px;">
            <img src="${prod.image}" alt="${prod.name}" style="max-height:220px; width:auto; border-radius:12px; border:2px solid #0D9488; margin-bottom:15px; box-shadow:0 8px 20px rgba(0,0,0,0.1);">
            <h3 style="font-size:1.3rem; color:#1E1B4B; margin-bottom:8px;">${prod.name}</h3>
            <p style="font-size:0.92rem; color:#64748B; max-width:500px; margin:0 auto 15px auto; line-height:1.6;">${prod.description}</p>
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:18px; margin-bottom:20px;">
            <h4 style="font-size:0.95rem; color:#0F172A; margin-bottom:10px;"><i class="fa-solid fa-circle-info purple-icon"></i> كيف يتم الطلب والتسعير؟</h4>
            <p style="font-size:0.85rem; color:#475569; line-height:1.6;">خدمات المطبوعات والواجهات الإعلانية يتم احتساب أسعارها بناءً على المقاسات الدقيقة والخامات المطلوبة وكميات الطباعة. يمكنك التواصل مباشرةً مع فريق مطبعة تفنين عبر الواتساب للحصول على مقايسة مجانية وعرض سعر فورياً.</p>
        </div>

        <a href="${waUrl}" target="_blank" class="btn btn-block btn-lg" style="background:linear-gradient(135deg, #25D366, #128C7E); color:#FFF; font-weight:800; font-size:1.1rem; border-radius:12px;">
            <i class="fa-brands fa-whatsapp" style="font-size:1.4rem;"></i> تواصل واتساب للاستفسار والطلب فوراً
        </a>
    `;

    openModal('product-modal');
}

// MULTI-PIECE PANEL SPLITTER & AI VR ROOM SIMULATOR RENDERERS
function selectCanvasPieces(pieces, btnEl) {
    state.calcConfig.pieces = pieces;
    document.querySelectorAll('.piece-chip-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    renderCanvasShowcasePreview();
    updateCanvasConfigPrice();
}

function promptCustomCanvasPieces(btnEl) {
    const input = prompt('أدخل عدد القطع المطلوبة (مثال: 5، 6، 7 أو أكثر):', '5');
    if (!input) return;
    const num = parseInt(input);
    if (isNaN(num) || num < 1 || num > 30) {
        alert('برجاء إدخال رقم صحيح بين 1 و 30');
        return;
    }
    selectCanvasPieces(num, btnEl);
}

function setVRWallColor(hex, dotEl) {
    state.calcConfig.vrColor = hex;
    document.querySelectorAll('.vr-color-dot').forEach(d => d.classList.remove('active'));
    if (dotEl) dotEl.classList.add('active');

    const roomBox = document.getElementById('vr-room-sandbox');
    if (roomBox) roomBox.style.backgroundColor = hex;
}

function setVRFurniture(type, imgUrl, btnEl) {
    state.calcConfig.vrFurniture = type;
    state.calcConfig.vrFurnitureImg = imgUrl;
    document.querySelectorAll('.vr-furn-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const furnImg = document.getElementById('vr-furniture-img');
    if (furnImg) furnImg.src = imgUrl;
}

function setCanvasPreviewMode(mode, btnEl) {
    state.calcConfig.previewMode = mode;
    document.querySelectorAll('.shortcut-badge-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    renderCanvasShowcasePreview();
}

function adjustARScale(val) {
    state.calcConfig.arScale = parseInt(val);
    const canvasEl = document.getElementById('ai-mounted-canvas');
    if (canvasEl) {
        canvasEl.style.width = `${val}%`;
    }
}

function adjustAROffset(delta) {
    const current = state.calcConfig.arOffset || 0;
    const newOffset = Math.max(-60, Math.min(60, current + delta));
    state.calcConfig.arOffset = newOffset;
    const canvasEl = document.getElementById('ai-mounted-canvas');
    if (canvasEl) {
        canvasEl.style.transform = `translateY(${newOffset}px)`;
    }
}

function renderCanvasShowcasePreview() {
    const box = document.getElementById('canvas-showcase-dynamic-box');
    if (!box) return;

    const prod = state.activeProductForCalc;
    const pieces = state.calcConfig.pieces || 1;
    const mode = state.calcConfig.previewMode || '3d';
    const bgImg = prod ? prod.image : 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800';

    if (mode === 'vr') {
        const wallColor = state.calcConfig.vrColor || '#C5D3D2';
        const furnImg = state.calcConfig.vrFurnitureImg || 'https://cdn.saferart.com/wp-content/uploads/2022/03/sofa12.png';

        box.innerHTML = `
            <div class="vr-room-sandbox" id="vr-room-sandbox" style="background-color: ${wallColor};">
                <div style="font-size:0.75rem; color:#475569; background:rgba(255,255,255,0.85); padding:3px 12px; border-radius:20px; margin-bottom:8px; font-weight:700; border:1px solid #DDD6FE;">
                    <i class="fa-solid fa-eye purple-icon"></i> تجربة ألوان الجدار والأثاث الافتراضية (VR)
                </div>

                <div class="vr-canvas-anchor">
                    ${renderMultiPieceHtml(bgImg, pieces)}
                </div>

                <img id="vr-furniture-img" class="vr-furniture-img" src="${furnImg}" alt="اثاث">

                <div class="vr-controls-bar">
                    <div style="font-size:0.78rem; color:#CBD5E1; font-weight:700; margin-bottom:4px;">تغيير لون الجدار:</div>
                    <div class="vr-color-circles">
                        <div class="vr-color-dot ${wallColor==='#C5D3D2'?'active':''}" style="background:#C5D3D2;" onclick="setVRWallColor('#C5D3D2', this)"></div>
                        <div class="vr-color-dot ${wallColor==='#F7F3E2'?'active':''}" style="background:#F7F3E2;" onclick="setVRWallColor('#F7F3E2', this)"></div>
                        <div class="vr-color-dot ${wallColor==='#E8DFC4'?'active':''}" style="background:#E8DFC4;" onclick="setVRWallColor('#E8DFC4', this)"></div>
                        <div class="vr-color-dot ${wallColor==='#334863'?'active':''}" style="background:#334863;" onclick="setVRWallColor('#334863', this)"></div>
                        <div class="vr-color-dot ${wallColor==='#1E1B4B'?'active':''}" style="background:#1E1B4B;" onclick="setVRWallColor('#1E1B4B', this)"></div>
                        <div class="vr-color-dot ${wallColor==='#84675E'?'active':''}" style="background:#84675E;" onclick="setVRWallColor('#84675E', this)"></div>
                        <div class="vr-color-dot ${wallColor==='#DB355B'?'active':''}" style="background:#DB355B;" onclick="setVRWallColor('#DB355B', this)"></div>
                        <div class="vr-color-dot ${wallColor==='#187D46'?'active':''}" style="background:#187D46;" onclick="setVRWallColor('#187D46', this)"></div>
                        <div class="vr-color-dot ${wallColor==='#0F172A'?'active':''}" style="background:#0F172A;" onclick="setVRWallColor('#0F172A', this)"></div>
                    </div>

                    <div style="font-size:0.78rem; color:#CBD5E1; font-weight:700; margin-top:4px; margin-bottom:4px;">تغيير نوع الأثاث:</div>
                    <div class="vr-furniture-flex">
                        <button type="button" class="vr-furn-btn active" onclick="setVRFurniture('sofa', 'https://cdn.saferart.com/wp-content/uploads/2022/03/sofa12.png', this)">كنبة مودرن</button>
                        <button type="button" class="vr-furn-btn" onclick="setVRFurniture('bed', 'https://cdn.saferart.com/wp-content/uploads/2022/03/bed1.png', this)">سرير نوم</button>
                        <button type="button" class="vr-furn-btn" onclick="setVRFurniture('console', 'https://cdn.saferart.com/wp-content/uploads/2022/03/consol.png', this)">ترابيزة / كونسول</button>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    if (mode === 'ar') {
        const scaleVal = state.calcConfig.arScale || 75;
        const offsetY = state.calcConfig.arOffset || 0;

        box.innerHTML = `
            <div style="background:#110C2A; border:2px solid #7C3AED; border-radius:16px; padding:15px; text-align:center; color:#FFF; box-shadow:0 15px 35px rgba(0,0,0,0.4);">
                <div style="font-size:0.88rem; font-weight:800; color:#F59E0B; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> تركيب التابلوه بالذكاء الاصطناعي بمقاييس الجدار الحقيقية
                </div>

                <div class="ai-ar-wall-sandbox" id="user-wall-sandbox-preview" style="background-image: url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1000');">
                    <div class="ai-wall-spotlight"></div>
                    <div class="ai-mesh-overlay"></div>
                    <div class="ai-mesh-badge"><i class="fa-solid fa-robot"></i> الذكاء الاصطناعي: تعليق موزن للجدار</div>

                    <div class="ai-mounted-canvas-wrap" id="ai-mounted-canvas" style="width:${scaleVal}%; transform: translateY(${offsetY}px);">
                        ${renderMultiPieceHtml(bgImg, pieces)}
                    </div>
                </div>

                <!-- AI SMART AR CONTROLS BAR -->
                <div class="ai-ar-controls-bar">
                    <div class="ai-control-group">
                        <i class="fa-solid fa-cloud-arrow-up purple-icon"></i>
                        <input type="file" id="user-wall-file-input" accept="image/*" onchange="handleUserWallImageUpload(event)" style="display:none;">
                        <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('user-wall-file-input').click()" style="color:#FFF; border-color:#A855F7;">
                            رفع صورة جدارك
                        </button>
                    </div>

                    <div class="ai-control-group">
                        <label style="color:#E0E7FF; font-size:0.78rem;">حجم التابلوه:</label>
                        <input type="range" class="ai-control-slider" min="40" max="100" value="${scaleVal}" oninput="adjustARScale(this.value)">
                    </div>

                    <div class="ai-control-group">
                        <label style="color:#E0E7FF; font-size:0.78rem;">المستوى الجداري:</label>
                        <button type="button" class="btn btn-sm" onclick="adjustAROffset(-15)" style="background:#2E1065; color:#FFF; padding:3px 8px; font-size:0.75rem;"><i class="fa-solid fa-arrow-up"></i> لأعلى</button>
                        <button type="button" class="btn btn-sm" onclick="adjustAROffset(15)" style="background:#2E1065; color:#FFF; padding:3px 8px; font-size:0.75rem;"><i class="fa-solid fa-arrow-down"></i> لأسفل</button>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Default 3D Multi-Piece Splitter View
    box.innerHTML = `
        <div class="canvas-3d-wrapper">
            ${renderMultiPieceHtml(bgImg, pieces)}
        </div>
    `;
}

// UN-MIRRORED NATURAL DIRECTION CANVAS SPLITTER
function renderMultiPieceHtml(imgUrl, pieces) {
    if (pieces === 1) {
        return `<img src="${imgUrl}" alt="Canvas" style="width:100%; max-height:260px; object-fit:cover; border-radius:8px; display:block;">`;
    }

    let panelsHtml = '';

    for (let i = 0; i < pieces; i++) {
        const bgPosPct = (i / (pieces - 1)) * 100;
        panelsHtml += `
            <div class="canvas-split-panel" style="background-image: url('${imgUrl}'); background-position: ${bgPosPct}% center; background-size: ${pieces * 100}% auto;"></div>
        `;
    }

    return `<div class="canvas-piece-split-container" style="direction: ltr !important;">${panelsHtml}</div>`;
}

function handleUserWallImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const sandbox = document.getElementById('user-wall-sandbox-preview');
        if (sandbox) {
            sandbox.style.backgroundImage = `url('${evt.target.result}')`;
        }
    };
    reader.readAsDataURL(file);
}

// CANVAS CONFIGURATOR ACTIONS & PRICING
function setPurchaseMethod(method, btnEl) {
    state.calcConfig.method = method;
    const parent = btnEl.parentElement;
    parent.querySelectorAll('.size-chip-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
}

function selectCanvasSize(sizeLabel, dimensions, sizeMultiplier, btnEl) {
    state.calcConfig.sizeLabel = sizeLabel;
    state.calcConfig.dimensions = dimensions;
    state.calcConfig.sizeMultiplier = sizeMultiplier;

    document.querySelectorAll('.size-chips-grid .size-chip-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    updateCanvasConfigPrice();
}

function selectCanvasType(type, typePrice, cardEl) {
    state.calcConfig.type = type;
    state.calcConfig.typePrice = typePrice;

    document.querySelectorAll('.canvas-type-card').forEach(c => c.classList.remove('active'));
    if (cardEl) cardEl.classList.add('active');

    updateCanvasConfigPrice();
}

function selectFrameModel(model, modelExtra, cardEl) {
    state.calcConfig.model = model;
    state.calcConfig.modelExtra = modelExtra;

    document.querySelectorAll('.frame-model-card').forEach(c => c.classList.remove('active'));
    if (cardEl) cardEl.classList.add('active');

    updateCanvasConfigPrice();
}

function selectFrameColor(color, swatchEl) {
    state.calcConfig.color = color;

    document.querySelectorAll('.color-swatch-item').forEach(s => s.classList.remove('active'));
    if (swatchEl) swatchEl.classList.add('active');

    updateCanvasConfigPrice();
}

function switchCanvasDetailTab(tabId, btnEl) {
    state.activeDetailTab = tabId;
    document.querySelectorAll('.canvas-tab-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    document.querySelectorAll('.canvas-tab-content-panel').forEach(p => p.style.display = 'none');
    const activePanel = document.getElementById(`canvas-tab-panel-${tabId}`);
    if (activePanel) activePanel.style.display = 'block';
}

function updateCanvasConfigPrice() {
    const base = state.calcConfig.typePrice || 456;
    const mult = state.calcConfig.sizeMultiplier || 1.0;
    const extra = state.calcConfig.modelExtra || 0;
    const pieces = state.calcConfig.pieces || 1;

    let pieceMultiplier = 1.0;
    if (pieces === 2) pieceMultiplier = 1.35;
    if (pieces === 3) pieceMultiplier = 1.7;
    if (pieces === 4) pieceMultiplier = 2.1;

    const total = Math.round((base + extra) * mult * pieceMultiplier);
    state.calcConfig.price = total;

    const totalEl = document.getElementById('canvas-calculated-total');
    if (totalEl) totalEl.textContent = `${total} جنيه`;
}

function handleAddToCartCanvasConfig() {
    const prod = state.activeProductForCalc;
    if (!prod) return;

    const designNotes = document.getElementById('calc-design-link')?.value.trim() || '';

    const cartItem = {
        cartItemId: 'item-' + Date.now(),
        productId: prod.id,
        productName: prod.name,
        image: prod.image,
        unitPrice: state.calcConfig.price,
        quantity: 1,
        totalPrice: state.calcConfig.price,
        selectedOptions: {
            'عدد القطع': `${state.calcConfig.pieces || 1} قطعة`,
            'طريقة الشراء': state.calcConfig.method === 'express' ? 'استلام من الفرع بطنطا' : 'شراء أونلاين',
            'المقاس': `${state.calcConfig.dimensions} (${state.calcConfig.sizeLabel})`,
            'نوع التابلوه': state.calcConfig.type,
            'موديل البرواز': state.calcConfig.model,
            'لون البرواز': state.calcConfig.color
        },
        designNotes
    };

    state.cart.push(cartItem);
    saveLocalCart();
    closeModal('product-modal');
    toggleCartDrawer();
}

function updateCalcOption(key, val) {
    state.calcOptions[key] = val;
    calculateLivePrice();
}

function calculateLivePrice() {
    const prod = state.activeProductForCalc;
    if (!prod) return 0;

    let effectivePrice = prod.basePrice;
    if (prod.discountPercent && prod.discountPercent > 0) {
        effectivePrice = Math.round(prod.basePrice * (1 - prod.discountPercent / 100));
    }

    let total = 0;
    if (prod.calcType === 'dimensions') {
        const w = parseFloat(document.getElementById('calc-width')?.value || 1);
        const h = parseFloat(document.getElementById('calc-height')?.value || 1);
        const qty = parseInt(document.getElementById('calc-qty')?.value || 1);
        const area = w * h;
        total = Math.round(area * effectivePrice * qty);
    } else {
        const qty = parseInt(document.getElementById('calc-qty')?.value || 1);
        let multiplier = 1;
        if (qty === 5) multiplier = 0.95;
        if (qty >= 10) multiplier = 0.90;

        total = Math.round(effectivePrice * qty * multiplier);
    }

    const priceEl = document.getElementById('live-calculated-price');
    if (priceEl) priceEl.textContent = `${total} ج.م`;
    return total;
}

function handleAddToCartFromModal(e) {
    e.preventDefault();
    const prod = state.activeProductForCalc;
    if (!prod) return;

    let effectivePrice = prod.basePrice;
    if (prod.discountPercent && prod.discountPercent > 0) {
        effectivePrice = Math.round(prod.basePrice * (1 - prod.discountPercent / 100));
    }

    const total = calculateLivePrice();
    const isDimensions = prod.calcType === 'dimensions';

    let width = null, height = null, qty = 1;
    if (isDimensions) {
        width = parseFloat(document.getElementById('calc-width').value);
        height = parseFloat(document.getElementById('calc-height').value);
        qty = parseInt(document.getElementById('calc-qty').value);
    } else {
        qty = parseInt(document.getElementById('calc-qty').value);
    }

    const designNotes = document.getElementById('calc-design-link').value.trim();

    const cartItem = {
        cartItemId: 'item-' + Date.now(),
        productId: prod.id,
        productName: prod.name,
        image: prod.image,
        unitPrice: effectivePrice,
        quantity: qty,
        width,
        height,
        totalPrice: total,
        selectedOptions: { ...state.calcOptions },
        designNotes
    };

    state.cart.push(cartItem);
    saveLocalCart();
    closeModal('product-modal');
    toggleCartDrawer();
}

function getOptionLabelAr(key) {
    const labels = {
        panelSize: 'المقاس والأبعاد',
        panelSet: 'عدد القطع والتصميم',
        frameColor: 'نوع ولون البرواز الخشبي',
        canvasMaterial: 'خامة الكانفاس والطباعة',
        thickness: 'السمك والجودة',
        color: 'اللون واللمعة',
        warranty: 'فترة الضمان',
        lighting: 'نوع الإضاءة',
        depth: 'عمق البروز 3D',
        acrylicType: 'نوع الأكريليك',
        frame: 'نوع الشاسي والحديد',
        flexGrammage: 'وزن خامة الفلكس',
        grammage: 'سماكة البانر (الجراماج)',
        finishing: 'التشطيب والإنهاء',
        finish: 'نوع الطبقات واللمعة',
        lamination: 'التغليف والحماية UV',
        quality: 'دقة وتمريرات الألوان',
        perforated: 'نوع الثقوب للزجاج',
        filmType: 'نوع فيلم الباك لايت',
        material: 'خامة ورق الحائط',
        canvasType: 'خامة القماش والكنفس',
        frameThickness: 'بروز الشاسي الخشبي',
        paper: 'نوع الورق والوزن',
        coating: 'التغليف والبصمة',
        paperWeight: 'وزن الورق',
        size: 'المقاس القياسي',
        adhesive: 'شريط الإغلاق اللاصق',
        copies: 'عدد النسخ المكررة',
        numbering: 'نظام الترقيم المسلسل',
        pocket: 'جيوب الفولدر الداخلية',
        folding: 'أسلوب الطي',
        binding: 'نوع التجليد والإنهاء',
        pagesCount: 'عدد الصفحات',
        type: 'نوع الستيكر',
        cutShape: 'أسلوب القص (Die-cut)',
        wire: 'سلك التجليد',
        cover: 'نوع الغلاف الخارجية',
        foiling: 'البصمة الحرارية (ذهبي/فضي)',
        paperType: 'خامة الورق الفاخر'
    };
    return labels[key] || key;
}

// CART DRAWER & OPTIONAL TAX CHECKOUT
function toggleCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (!drawer || !backdrop) return;

    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
    } else {
        renderCartItems();
        drawer.classList.add('open');
        backdrop.classList.add('open');
    }
}

function handleGovernorateChange() {
    const select = document.getElementById('cart-governorate-select');
    const input = document.getElementById('cart-shipping-input');
    if (!select || !input) return;

    const opt = select.options[select.selectedIndex];
    const feeAttr = opt ? opt.getAttribute('data-fee') : '50';

    if (feeAttr !== 'custom') {
        input.value = parseFloat(feeAttr) || 0;
    }

    renderCartItems();
}

function renderCartItems() {
    const cartBody = document.getElementById('cart-body');
    const cartFooter = document.getElementById('cart-footer');
    if (!cartBody) return;

    if (state.cart.length === 0) {
        cartBody.innerHTML = `
            <div style="text-align:center; padding:60px 20px; color:#64748B;">
                <i class="fa-solid fa-bag-shopping" style="font-size:3rem; margin-bottom:15px; color:#CBD5E1;"></i>
                <p>سلة طلبات الديكور والتابلوهات فارغة حالياً</p>
                <button class="btn btn-outline btn-sm" onclick="toggleCartDrawer()" style="margin-top:15px;">استكشف قسم الديكور والتابلوهات</button>
            </div>
        `;
        if (cartFooter) cartFooter.style.display = 'none';
        return;
    }

    if (cartFooter) cartFooter.style.display = 'block';

    let subtotal = 0;
    cartBody.innerHTML = state.cart.map((item, idx) => {
        subtotal += item.totalPrice;
        const optionsList = Object.entries(item.selectedOptions || {}).map(([k, v]) => `${getOptionLabelAr(k)}: ${v}`).join(' | ');
        const dimStr = item.width && item.height ? `الأبعاد: ${item.width} × ${item.height} م | ` : '';

        return `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.productName}">
                <div class="cart-item-details">
                    <h4>${item.productName}</h4>
                    <div class="cart-item-options">${dimStr}${optionsList}</div>
                    ${item.designNotes ? `<div style="font-size:0.75rem; color:#7C3AED;">ملاحظات: ${item.designNotes}</div>` : ''}
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                        <span class="cart-item-price">${item.totalPrice} ج.م</span>
                        <button class="cart-item-remove" onclick="removeCartItem(${idx})"><i class="fa-solid fa-trash"></i> حذف</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const includeTax = state.settings && state.settings.includeTax === true;
    const tax = includeTax ? Math.round(subtotal * 0.14) : 0;
    const shippingInput = document.getElementById('cart-shipping-input');
    const shipping = parseFloat(shippingInput ? shippingInput.value : '50') || 0;
    const grand = subtotal + tax + shipping;

    const subtotalEl = document.getElementById('cart-subtotal');
    if (subtotalEl) subtotalEl.textContent = `${subtotal} ج.م`;
    const taxEl = document.getElementById('cart-tax');
    if (taxEl) taxEl.textContent = `${tax} ج.م`;
    const shippingEl = document.getElementById('cart-shipping');
    if (shippingEl) shippingEl.textContent = `${shipping} ج.م`;
    const grandEl = document.getElementById('cart-grandtotal');
    if (grandEl) grandEl.textContent = `${grand} ج.م`;
}

function removeCartItem(index) {
    state.cart.splice(index, 1);
    saveLocalCart();
    renderCartItems();
}

async function handleCheckout() {
    if (!state.currentUser) {
        toggleCartDrawer();
        openAuthModal('login');
        alert('يرجى تسجيل الدخول أولاً لإكمال طلبك وإصدار الفاتورة الضريبية.');
        return;
    }

    if (state.cart.length === 0) return;

    const shippingInput = document.getElementById('cart-shipping-input');
    const shippingFee = parseFloat(shippingInput ? shippingInput.value : '50') || 0;
    const governorateSelect = document.getElementById('cart-governorate-select');
    const governorate = governorateSelect ? governorateSelect.value : 'محافظة الغربية (طنطا والقرى)';

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify({
                items: state.cart,
                shippingFee,
                governorate
            })
        }).then(r => r.json());

        if (response.success) {
            state.cart = [];
            saveLocalCart();
            toggleCartDrawer();
            openInvoiceModal(response.data.id);
        } else {
            alert(response.message || 'حدث خطأ أثناء تنفيذ الطلب');
        }
    } catch (err) {
        console.error('Checkout error:', err);
        alert('حدث خطأ في الإتصال بالسيرفر');
    }
}

// OFFICIAL INVOICES AND ORDERS MODAL HANDLERS
async function openInvoiceModal(orderId) {
    if (!state.currentUser) {
        openAuthModal('login');
        return;
    }

    try {
        const order = await fetch(`/api/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${state.currentUser.id}` }
        }).then(r => r.json()).then(r => r.data);

        if (!order) {
            alert('الفاتورة المطلوبة غير موجودة');
            return;
        }

        const printable = document.getElementById('invoice-printable-area');
        if (!printable) return;

        const hasTax = order.taxAmount && order.taxAmount > 0;
        const taxLabel = hasTax ? `ضريبة القيمة المضافة (14%)` : `ضريبة القيمة المضافة (غير مدرجة - اختيارية)`;
        const taxValueStr = hasTax ? `${order.taxAmount} ج.م` : `0 ج.م (بدون ضريبة)`;

        const itemsHtml = (order.items || []).map((item, idx) => {
            const opts = Object.entries(item.selectedOptions || {}).map(([k, v]) => `${getOptionLabelAr(k)}: ${v}`).join(' | ');
            const dims = item.width && item.height ? `(${item.width} × ${item.height} م)` : '';
            return `
                <tr>
                    <td style="padding:8px; text-align:center;">${idx + 1}</td>
                    <td style="padding:8px; text-align:right;">
                        <strong>${item.productName}</strong> ${dims}
                        ${opts ? `<div style="font-size:0.75rem; color:#64748B;">${opts}</div>` : ''}
                    </td>
                    <td style="padding:8px; text-align:center;">${item.quantity || 1}</td>
                    <td style="padding:8px; text-align:center;">${item.unitPrice} ج.م</td>
                    <td style="padding:8px; text-align:center;"><strong>${item.totalPrice} ج.م</strong></td>
                </tr>
            `;
        }).join('');

        printable.innerHTML = `
            <div class="invoice-box" style="padding:10px; font-family:var(--font-main);">
                <div class="invoice-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #7C3AED; padding-bottom:15px; margin-bottom:20px;">
                    <div class="invoice-logo">
                        <img src="/images/logo.svg" alt="مطبعة تفنين" style="height:60px; background:#1E1B4B; padding:6px 12px; border-radius:8px;">
                        <div style="font-size:0.8rem; color:#64748B; margin-top:4px;">طنطا: شارع عادل الهرميل (خلف مستشفى دار القمة)</div>
                    </div>
                    <div style="text-align:left; direction:ltr;">
                        <h2 style="font-size:1.4rem; color:#1E1B4B; margin:0;">${hasTax ? 'فاتورة ضريبية رسمية' : 'فاتورة طلب رسمية'}</h2>
                        <div style="font-size:0.9rem; font-weight:800; color:#7C3AED;">${order.invoiceNumber}</div>
                        <div style="font-size:0.8rem; color:#64748B;">تاريخ الطلب: ${new Date(order.createdAt).toLocaleDateString('ar-EG')}</div>
                    </div>
                </div>

                <div class="invoice-info-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px; background:#F8FAFC; padding:12px; border-radius:8px; margin-bottom:20px; font-size:0.88rem;">
                    <div>
                        <div><strong>اسم العميل:</strong> ${order.clientName}</div>
                        <div><strong>اسم الشركة / المحل:</strong> ${order.clientCompany || 'فرد'}</div>
                        <div><strong>رقم الهاتف:</strong> ${order.clientPhone || 'غير مدخل'}</div>
                        <div><strong>المحافظة وعنوان التوصيل:</strong> <span style="color:#7C3AED; font-weight:700;">${order.governorate || 'محافظة الغربية (طنطا والقرى)'}</span></div>
                    </div>
                    <div>
                        <div><strong>حالة الفاتورة:</strong> <span class="status-tag status-${order.status}">${order.statusAr || 'قيد التنفيذ'}</span></div>
                        <div><strong>طريقة السداد والطلب:</strong> تسليم واستلام / شحن للمحافظات</div>
                        ${order.notes ? `<div><strong>ملاحظات الطلب:</strong> ${order.notes}</div>` : ''}
                    </div>
                </div>

                <table class="invoice-table" style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                    <thead>
                        <tr style="background:#1E1B4B; color:#FFF; font-size:0.85rem;">
                            <th style="padding:8px; text-align:center;">#</th>
                            <th style="padding:8px; text-align:right;">بيان المنتج والخدمة المطلوبة</th>
                            <th style="padding:8px; text-align:center;">الكمية</th>
                            <th style="padding:8px; text-align:center;">سعر الوحدة</th>
                            <th style="padding:8px; text-align:center;">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="invoice-totals" style="width:320px; margin-right:auto; background:#F8FAFC; padding:12px; border-radius:8px; border:1px solid #E2E8F0; font-size:0.9rem;">
                    <div style="display:flex; justify-content:space-between; padding:4px 0;">
                        <span>المجموع الفرعي:</span>
                        <strong>${order.subtotal} ج.م</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:4px 0; color:${hasTax ? '#7C3AED' : '#64748B'}; font-weight:${hasTax ? '800' : 'normal'};">
                        <span>${taxLabel}:</span>
                        <strong>${taxValueStr}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:4px 0;">
                        <span>رسوم التوصيل والمعاينة:</span>
                        <span>${order.shippingFee || 50} ج.م</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-top:2px solid #1E1B4B; margin-top:6px; font-size:1.1rem; font-weight:800; color:#1E1B4B;">
                        <span>المبلغ الإجمالي الكلي:</span>
                        <strong>${order.grandTotal} ج.م</strong>
                    </div>
                </div>

                <div style="margin-top:25px; border-top:1px solid #E2E8F0; padding-top:12px; text-align:center; font-size:0.8rem; color:#64748B;">
                    شكرًا لتعاملكم مع مطبعة تفنين طنطا | هاتف: 01060046150 - 01505028565 | شارع عادل الهرميل خلف مستشفى دار القمة
                </div>
            </div>
        `;

        openModal('invoice-modal');
    } catch (err) {
        alert('حدث خطأ أثناء فتح الفاتورة');
    }
}

async function openMyOrdersModal() {
    if (!state.currentUser) {
        openAuthModal('login');
        return;
    }

    try {
        const orders = await fetch('/api/orders', {
            headers: { 'Authorization': `Bearer ${state.currentUser.id}` }
        }).then(r => r.json()).then(r => r.data || []);

        const container = document.getElementById('orders-list-container');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#64748B;">
                    <i class="fa-solid fa-receipt" style="font-size:3rem; margin-bottom:12px; color:#CBD5E1;"></i>
                    <p>لا توجد فواتير أو طلبات سابقة مسجلة باسمك حالياً</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="table-responsive">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>رقم الفاتورة</th>
                                <th>تاريخ الطلب</th>
                                <th>المبلغ الكلي</th>
                                <th>الضريبة (14%)</th>
                                <th>الحالة</th>
                                <th>معاينة وطباعة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.map(o => `
                                <tr>
                                    <td><strong>${o.invoiceNumber}</strong></td>
                                    <td>${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                                    <td><strong>${o.grandTotal} ج.م</strong></td>
                                    <td>${o.taxAmount > 0 ? `<span style="color:#7C3AED; font-weight:700;">14% (${o.taxAmount} ج.م)</span>` : '<span style="color:#64748B;">بدون ضريبة</span>'}</td>
                                    <td><span class="status-tag status-${o.status}">${o.statusAr || 'قيد التنفيذ'}</span></td>
                                    <td>
                                        <button class="btn btn-primary btn-sm" onclick="closeModal('orders-modal'); openInvoiceModal('${o.id}');"><i class="fa-solid fa-print"></i> الفاتورة</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        openModal('orders-modal');
    } catch (err) {
        alert('حدث خطأ أثناء تحميل الفواتير');
    }
}

// PROMOTING PRODUCTS AND SERVICES TO HERO SHOWCASE CARDS
async function promoteProductToHero(prodId) {
    const prod = state.products.find(p => p.id === prodId);
    if (!prod) return;

    const cat = state.categories.find(c => c.id === prod.categoryId);
    const catName = cat ? cat.name : 'قسم التابلوهات والديكور';

    try {
        const res = await fetch('/api/hero-cards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify({
                badge: catName,
                title: prod.name,
                subtitle: prod.description || `السعر: ${prod.basePrice} ج.م / ${prod.priceUnit}`,
                tag: 'توصيل لكافة المحافظات',
                image: prod.image
            })
        }).then(r => r.json());

        if (res.success) {
            alert(`✅ تم إضافة المنتج "${prod.name}" بنجاح إلى كروت الهيرو المميزة بالواجهة الرئيسية!`);
            await fetchInitialData();
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('حدث خطأ أثناء إضافة المنتج كـ كارت هيرو');
    }
}

async function promotePrintServiceToHero(serviceId) {
    const srv = state.printsServices.find(s => s.id === serviceId);
    if (!srv) return;

    try {
        const res = await fetch('/api/hero-cards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify({
                badge: 'معرض المطبوعات والواجهات الإعلانية',
                title: srv.title,
                subtitle: srv.description,
                tag: 'معاينة ومقايسة مجانية',
                image: srv.image
            })
        }).then(r => r.json());

        if (res.success) {
            alert(`✅ تم إضافة خدمة "${srv.title}" بنجاح إلى كروت الهيرو المميزة بالواجهة الرئيسية!`);
            await fetchInitialData();
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('حدث خطأ أثناء إضافة خدمة المطبوعات كـ كارت هيرو');
    }
}

// ADMIN DASHBOARD & SEPARATED DECOR VS PRINTING MANAGERS
async function openAdminPanel() {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
        alert('هذه الصفحة خاصة بمدير النظام فقط');
        return;
    }

    switchTab('admin');
    await loadAdminStatsAndTables();
}

function switchAdminSubTab(subTab) {
    document.querySelectorAll('.admin-subtab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));

    const activeSub = document.getElementById(`admin-subtab-${subTab}`);
    if (activeSub) activeSub.style.display = 'block';

    const activeBtn = document.querySelector(`.admin-tab-btn[onclick*="${subTab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

async function loadAdminStatsAndTables() {
    try {
        const [ordersRes, prodRes, tickRes, slidesRes, heroRes, printsRes, quotesRes, cbRes, catRes] = await Promise.all([
            fetch('/api/orders', { headers: { 'Authorization': `Bearer ${state.currentUser.id}` } }).then(r => r.json()),
            fetch('/api/products').then(r => r.json()),
            fetch('/api/tickers').then(r => r.json()),
            fetch('/api/topbar-slides').then(r => r.json()),
            fetch('/api/hero-cards').then(r => r.json()),
            fetch('/api/prints-services').then(r => r.json()),
            fetch('/api/quotes', { headers: { 'Authorization': `Bearer ${state.currentUser.id}` } }).then(r => r.json()),
            fetch('/api/chatbot-rules').then(r => r.json()),
            fetch('/api/categories').then(r => r.json()).catch(() => ({ success: false }))
        ]);

        const orders = ordersRes.data || [];
        const products = prodRes.data || [];
        state.tickers = tickRes.data || [];
        state.topBarSlides = slidesRes.data || [];
        state.heroCards = heroRes.data || [];
        state.printsServices = printsRes.data || [];
        state.quotes = quotesRes.data || [];
        if (cbRes && cbRes.success) state.chatbotRules = cbRes.data || [];
        if (catRes && catRes.success) state.categories = catRes.data || [];

        const totalRevenue = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

        const revEl = document.getElementById('stat-total-revenue');
        if (revEl) revEl.textContent = `${totalRevenue} ج.م`;
        const ordEl = document.getElementById('stat-total-orders');
        if (ordEl) ordEl.textContent = orders.length;
        const prodCountEl = document.getElementById('stat-total-products');
        if (prodCountEl) prodCountEl.textContent = products.length;
        const quoteStatEl = document.getElementById('stat-total-quotes');
        if (quoteStatEl) quoteStatEl.textContent = state.quotes.length;

        // Sync Global Tax Toggle in Admin
        const taxToggle = document.getElementById('admin-global-tax-toggle');
        if (taxToggle) {
            taxToggle.checked = !!(state.settings && state.settings.includeTax);
        }

        // Render Chatbot Rules Table & Categories Table
        renderAdminChatbotTable();
        renderAdminCategoriesTableAndDropdowns();

        // FILTER DECOR PRODUCTS ONLY FOR THE DECOR TAB
        const decorCats = [
        'wall-panels', 'wallpaper', 'wall-decor',
        'canvas-abstract', 'canvas-islamic', 'canvas-sets',
        'canvas-nature', 'canvas-coffee', 'canvas-custom',
        'canvas-kids', 'canvas-cars-pop', 'canvas-classic'
    ];
        let decorProducts = products.filter(p => decorCats.includes(p.categoryId));

        let cats = state.categories || [];
        if (cats.length === 0) {
            const uniqueCatIds = [...new Set(decorProducts.map(p => p.categoryId))];
            cats = uniqueCatIds.map(id => ({ id, name: id }));
        }

        const filterSelect = document.getElementById('admin-product-category-filter');
        if (filterSelect) {
            const currentVal = filterSelect.value || 'all';
            const catOptions = ['<option value="all">جميع الأقسام (عرض الكل)</option>']
                .concat(cats.map(c => `<option value="${c.id}">${c.name || c.id}</option>`));
            filterSelect.innerHTML = catOptions.join('');
            filterSelect.value = currentVal;

            if (currentVal !== 'all') {
                decorProducts = decorProducts.filter(p => p.categoryId === currentVal);
            }
        }

        // FILTER NON-DECOR PRINTING PRODUCTS
        const printingProducts = products.filter(p => !decorCats.includes(p.categoryId));

        // Render Admin Decor Products Table
        const prodTbody = document.getElementById('admin-products-tbody');
        if (prodTbody) {
            prodTbody.innerHTML = decorProducts.map(p => `
                <tr>
                    <td><img src="${p.image}" onerror="this.src='https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80'" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.categoryId}</td>
                    <td>${p.basePrice} ج.م</td>
                    <td>${p.isBestSeller ? '<span style="color:#D97706; font-weight:800;">🔥 نعم</span>' : 'لا'}</td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="editProductAdmin('${p.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                        <button class="btn btn-sm" style="background:#10B981; color:#FFF;" onclick="duplicateProductAdmin('${p.id}')" title="تكرار المنتج"><i class="fa-solid fa-copy"></i> تكرار</button>
                        <button class="btn btn-sm" style="background:#8B5CF6; color:#FFF;" onclick="promoteProductToHero('${p.id}')" title="عرض المنتج كـ كارت هيرو مميز"><i class="fa-solid fa-star"></i> للهيرو</button>
                        <button class="btn btn-sm" style="background:#EF4444; color:#FFF;" onclick="deleteProductAdmin('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }

        // Render Admin Standalone Prints Services Table
        const printsTbody = document.getElementById('admin-prints-tbody');
        if (printsTbody) {
            let combinedPrintRows = state.printsServices.map(s => `
                <tr>
                    <td><img src="${s.image}" onerror="this.src='https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80'" style="width:45px; height:45px; object-fit:cover; border-radius:6px;"></td>
                    <td><strong>${s.title}</strong></td>
                    <td style="max-width:250px; font-size:0.8rem; color:#64748B;">${s.description}</td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="editPrintServiceAdmin('${s.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                        <button class="btn btn-sm" style="background:#8B5CF6; color:#FFF;" onclick="promotePrintServiceToHero('${s.id}')" title="عرض خدمة المطبوعات كـ كارت هيرو مميز"><i class="fa-solid fa-star"></i> للهيرو</button>
                        <button class="btn btn-sm" style="background:#EF4444; color:#FFF;" onclick="deletePrintServiceAdmin('${s.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            combinedPrintRows += printingProducts.map(p => `
                <tr>
                    <td><img src="${p.image}" onerror="this.src='https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80'" style="width:45px; height:45px; object-fit:cover; border-radius:6px;"></td>
                    <td><strong>${p.name}</strong> <span style="font-size:0.7rem; color:#0D9488; background:#E0F2FE; padding:2px 6px; border-radius:4px;">كتالوج الطباعة</span></td>
                    <td style="max-width:250px; font-size:0.8rem; color:#64748B;">${p.description}</td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="editProductAdmin('${p.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                        <button class="btn btn-sm" style="background:#10B981; color:#FFF;" onclick="duplicateProductAdmin('${p.id}')" title="تكرار المنتج"><i class="fa-solid fa-copy"></i> تكرار</button>
                        <button class="btn btn-sm" style="background:#8B5CF6; color:#FFF;" onclick="promoteProductToHero('${p.id}')" title="عرض في كروت الهيرو"><i class="fa-solid fa-star"></i> للهيرو</button>
                        <button class="btn btn-sm" style="background:#EF4444; color:#FFF;" onclick="deleteProductAdmin('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            printsTbody.innerHTML = combinedPrintRows;
        }

        // Render Admin Hero Showcase Cards Table
        const heroTbody = document.getElementById('admin-herocards-tbody');
        if (heroTbody) {
            heroTbody.innerHTML = state.heroCards.map(c => `
                <tr>
                    <td><img src="${c.image}" onerror="this.src='https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80'" style="width:55px; height:45px; object-fit:cover; border-radius:6px;"></td>
                    <td>
                        <span style="font-size:0.75rem; color:#7C3AED; font-weight:700;">${c.badge}</span>
                        <div><strong>${c.title}</strong></div>
                    </td>
                    <td>
                        <div style="font-size:0.8rem; color:#64748B;">${c.subtitle}</div>
                        <span style="font-size:0.72rem; color:#0D9488; font-weight:700;">${c.tag}</span>
                    </td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="editHeroCardAdmin('${c.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                        <button class="btn btn-sm" style="background:#EF4444; color:#FFF;" onclick="deleteHeroCardAdmin('${c.id}')"><i class="fa-solid fa-trash"></i> حذف</button>
                    </td>
                </tr>
            `).join('');
        }

        // Render Admin Quotes Inbox Table
        const quotesTbody = document.getElementById('admin-quotes-tbody');
        if (quotesTbody) {
            if (state.quotes.length === 0) {
                quotesTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748B;">لا توجد طلبات عروض أسعار حالياً في الصندوق</td></tr>`;
            } else {
                quotesTbody.innerHTML = state.quotes.map(q => `
                    <tr>
                        <td><strong>${q.name}</strong></td>
                        <td>
                            <div><i class="fa-solid fa-phone purple-icon"></i> ${q.phone}</div>
                            ${q.email ? `<div style="font-size:0.75rem; color:#64748B;">${q.email}</div>` : ''}
                        </td>
                        <td><span class="badge-accent">${q.category}</span></td>
                        <td style="max-width:280px; font-size:0.85rem; color:#334155;">${q.details}</td>
                        <td style="font-size:0.8rem; color:#64748B;">${new Date(q.createdAt).toLocaleDateString('ar-EG')}</td>
                        <td>
                            <a href="https://wa.me/20${q.phone.replace(/^0/,'')}?text=${encodeURIComponent('مرحباً '+q.name+'، معك مطبعة تفنين بخصوص طلب عرض السعر الخاص بـ '+q.category)}" target="_blank" class="btn btn-sm" style="background:#25D366; color:#FFF; margin-bottom:4px;">
                                <i class="fa-brands fa-whatsapp"></i> واتساب
                            </a>
                            <button class="btn btn-sm" style="background:#EF4444; color:#FFF;" onclick="deleteQuoteAdmin('${q.id}')"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // Render Admin Tickers Table
        const tickerTbody = document.getElementById('admin-tickers-tbody');
        if (tickerTbody) {
            tickerTbody.innerHTML = state.tickers.map(t => `
                <tr>
                    <td><i class="fa-solid ${t.icon || 'fa-gift'}" style="color:#A855F7; font-size:1.2rem;"></i></td>
                    <td><strong>${t.text}</strong></td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="editTickerAdmin('${t.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                        <button class="btn btn-sm" style="background:#EF4444; color:#FFF;" onclick="deleteTickerAdmin('${t.id}')"><i class="fa-solid fa-trash"></i> حذف</button>
                    </td>
                </tr>
            `).join('');
        }

        // Render Admin Top Slides Table
        const slidesTbody = document.getElementById('admin-slides-tbody');
        if (slidesTbody) {
            slidesTbody.innerHTML = state.topBarSlides.map(s => `
                <tr>
                    <td><i class="fa-solid ${s.icon || 'fa-star'}" style="color:#A855F7; font-size:1.2rem;"></i></td>
                    <td><strong>${s.title}</strong></td>
                    <td>${s.detail}</td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="editSlideAdmin('${s.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                        <button class="btn btn-sm" style="background:#EF4444; color:#FFF;" onclick="deleteSlideAdmin('${s.id}')"><i class="fa-solid fa-trash"></i> حذف</button>
                    </td>
                </tr>
            `).join('');
        }

        // Render Admin Orders Table
        const ordersTbody = document.getElementById('admin-orders-tbody');
        if (ordersTbody) {
            ordersTbody.innerHTML = orders.map(o => `
                <tr>
                    <td><strong>${o.invoiceNumber}</strong></td>
                    <td>${o.clientName} (${o.clientCompany || 'فرد'})</td>
                    <td>${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td><strong>${o.grandTotal} ج.م</strong></td>
                    <td>
                        <select onchange="updateOrderStatusAdmin('${o.id}', this.value)" style="padding:4px; border-radius:4px;">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>قيد المراجعة</option>
                            <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>قيد التنفيذ والطباعة</option>
                            <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>تم الطباعة والتسليم</option>
                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغى</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="openInvoiceModal('${o.id}')"><i class="fa-solid fa-print"></i> الفاتورة</button>
                    </td>
                </tr>
            `).join('');
        }

    } catch (err) {
        console.error('Admin load error:', err);
    }
}

// SMART CHATBOT WIDGET IMPLEMENTATION WITH PRINTING OPTIONS
function initChatbot() {
    const chatBody = document.getElementById('chatbot-chat-body');
    if (!chatBody) return;

    chatBody.innerHTML = `
        <div class="chat-msg bot">
            <strong>مساعد تفنين الذكي:</strong><br>
            أهلاً بك في مطبعة تفنين طنطا! 🌺 كشريكك الموثوق في التابلوهات والديكور والمطبوعات والواجهات الإعلانية، كيف يمكنني مساعدتك اليوم؟
            <div class="chat-quick-replies">
                <button class="quick-reply-btn" onclick="chatbotQuickReply('تابلوهات')"><i class="fa-solid fa-palette purple-icon"></i> استفسار عن التابلوهات والكانفاس</button>
                <button class="quick-reply-btn" onclick="chatbotQuickReply('ورق حائط')"><i class="fa-solid fa-paint-roller purple-icon"></i> استفسار عن ورق الحائط 3D والديكور</button>
                <button class="quick-reply-btn" onclick="chatbotQuickReply('مطبوعات ورقية')"><i class="fa-solid fa-file-alt purple-icon"></i> الكروت، الفواتير، الأظرف، والفلايرات</button>
                <button class="quick-reply-btn" onclick="chatbotQuickReply('اوت دور')"><i class="fa-solid fa-scroll purple-icon"></i> طباعة البنر، الفينيل، الفلكس، والسيثرو</button>
                <button class="quick-reply-btn" onclick="chatbotQuickReply('كلادينج')"><i class="fa-solid fa-building purple-icon"></i> واجهات الكلادينج والحروف المضيئة</button>
                <button class="quick-reply-btn" onclick="chatbotQuickReply('عنوان')"><i class="fa-solid fa-location-dot purple-icon"></i> موقع المطبعة والمواعيد بطنطا</button>
                <button class="quick-reply-btn" onclick="chatbotQuickReply('واتساب')"><i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> التحدث المباشر مع موظف المبيعات</button>
            </div>
        </div>
    `;
}

function toggleChatbotWidget() {
    const windowEl = document.getElementById('chatbot-window');
    if (!windowEl) return;

    chatbotState.isOpen = !chatbotState.isOpen;
    if (chatbotState.isOpen) {
        windowEl.classList.add('open');
        document.getElementById('chatbot-user-input')?.focus();
    } else {
        windowEl.classList.remove('open');
    }
}

function chatbotQuickReply(type) {
    const chatBody = document.getElementById('chatbot-chat-body');
    if (!chatBody) return;

    if (type === 'تابلوهات') {
        appendUserMessage('أريد معرفة تفاصيل وأسعار التابلوهات والكانفاس.');
        appendBotMessage(`
            <strong>مساعد تفنين:</strong><br>
            نوفر تابلوهات كانفاس قطني 100% مطبوعة بدقة 4K HD مشدودة على شاسي خشب سويدي مع خيارات براويز مودرن (خشبي، ذهبي، أسود) وأكريليك لامع:<br>
            • <strong>مقاس S (30×40 سم):</strong> 456 ج.م<br>
            • <strong>مقاس M (40×60 سم):</strong> 570 ج.م<br>
            • <strong>مقاس L (60×90 سم):</strong> 840 ج.م<br>
            • <strong>طقم 3 قطع مودرن:</strong> يبدأ من 1250 ج.م<br><br>
            يمكنك أيضاً تحويل صورك الشخصية لتابلوه جاهز للتعليق!
        `);
    } else if (type === 'ورق حائط') {
        appendUserMessage('أريد الاستفسار عن خامات وأسعار ورق الحائط 3D.');
        appendBotMessage(`
            <strong>مساعد تفنين:</strong><br>
            نطبع ورق حائط 3D بمقاسات جدارك المخصصة بدقة 4K قابلة للمسح والغسيل بالماء تماماً:<br>
            • <strong>ورق نسيج ألماني فاخر:</strong> 120 ج.م / م²<br>
            • <strong>ورق جلد لاصق ذاتي ممتاز:</strong> 140 ج.م / م²<br><br>
            نوفر خدمة معاينة الجدار ورسم البوستر قبل الطباعة.
        `);
    } else if (type === 'مطبوعات ورقية') {
        appendUserMessage('أريد الاستفسار عن المطبوعات الورقية والكروت والدفاتر والفلايرات.');
        appendBotMessage(`
            <strong>مساعد تفنين:</strong><br>
            نوفر جميع المطبوعات الورقية للشركات والمحلات بأعلى دقة وطباعة أوفست وديجيتال:<br>
            • <strong>الكروت الشخصية (1000 كارت كوشيه 350g مع سلفان):</strong> 150 ج.م<br>
            • <strong>أوراق المراسلات A4 والأظرف الرسمية:</strong> تبدأ من 220 ج.م<br>
            • <strong>دفاتر الفواتير والسنداتNCR ترقيم مسلسل:</strong> تبدأ من 180 ج.م<br>
            • <strong>الفلايرات والكتالوجات والستيكر المقصوص:</strong> تبدأ من 160 ج.م
        `);
    } else if (type === 'اوت دور') {
        appendUserMessage('أريد الاستفسار عن طباعة البنر والفينيل والفلكس والسيثرو.');
        appendBotMessage(`
            <strong>مساعد تفنين:</strong><br>
            نطبع كافة خامات الأوت دور الخارجية بدقة ألوان زاهية ومقاومة للشمس والحرارة:<br>
            • <strong>البنر والفلكس (مع خيارات السلفان اللامع/المط):</strong> يبدأ من 60 ج.م / م²<br>
            • <strong>الفينيل الأبيض والشفاف (لامع / مط مع سلفان):</strong> يبدأ من 85 ج.م / م²<br>
            • <strong>السيثرو والاسكوتش العاكس وكنفاس جليتر:</strong> يبدأ من 110 ج.م / م²
        `);
    } else if (type === 'كلادينج') {
        appendUserMessage('أريد الاستفسار عن واجهات الكلادينج والحروف الأكريليك.');
        appendBotMessage(`
            <strong>مساعد تفنين:</strong><br>
            نقوم بتنفيذ واجهات ألمنيوم الكلادينج سمك 4 مم المقاومة للحريق مع حروف أكريليك بارزة مضيئة بلمبات LED كورية كفالة ممتازة.<br>
            نوفر <strong>معاينة ومقايسة مجانية</strong> للمحلات والشركات بطنطا والمحافظات.
        `);
    } else if (type === 'عنوان') {
        appendUserMessage('أين موقع مطبعة تفنين وما هي مواعيد العمل؟');
        appendBotMessage(`
            <strong>مساعد تفنين:</strong><br>
            📍 <strong>مقر المطبعة الرئيسي:</strong> طنطا - شارع عادل الهرميل (خلف مستشفى دار القمة).<br>
            📞 <strong>الهواتف:</strong> 01060046150 - 01275270599 - 0403295911 - 01505028565<br>
            ⏰ <strong>المواعيد:</strong> يومياً من 10 صباحاً حتى 10 مساءً.
        `);
    } else if (type === 'واتساب') {
        transferToWhatsApp('استفسار مباشر مع موظف المبيعات والدعم عبر الواتساب');
    }
}

function handleChatbotInputKey(e) {
    if (e.key === 'Enter') {
        sendChatbotMessage();
    }
}

function sendChatbotMessage() {
    const input = document.getElementById('chatbot-user-input');
    if (!input) return;

    const query = input.value.trim();
    if (!query) return;

    appendUserMessage(query);
    input.value = '';

    processChatbotQuery(query);
}

function appendUserMessage(text) {
    const chatBody = document.getElementById('chatbot-chat-body');
    if (!chatBody) return;

    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function appendBotMessage(htmlContent) {
    const chatBody = document.getElementById('chatbot-chat-body');
    if (!chatBody) return;

    setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'chat-msg bot';
        div.innerHTML = htmlContent;
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 400);
}

function processChatbotQuery(query) {
    const q = query.toLowerCase().trim();

    // 1. MATCH AGAINST DYNAMIC CHATBOT RULES MANAGED FROM ADMIN DASHBOARD
    if (state.chatbotRules && state.chatbotRules.length > 0) {
        for (const rule of state.chatbotRules) {
            const isMatch = (rule.keywords || []).some(kw => kw && q.includes(kw.toLowerCase().trim()));
            if (isMatch) {
                let html = `<strong>مساعد تفنين الذكي:</strong><br>${rule.response}`;
                if (rule.showWaBtn) {
                    const btnLabel = rule.waBtnText || 'التواصل عبر الواتساب';
                    html += `
                        <div style="margin-top:10px;">
                            <button class="btn btn-sm" style="background:#25D366; color:#FFF; font-weight:700;" onclick="transferToWhatsApp('${query}')">
                                <i class="fa-brands fa-whatsapp"></i> ${btnLabel}
                            </button>
                        </div>
                    `;
                }
                appendBotMessage(html);
                return;
            }
        }
    }

    // 2. FALLBACK TO DIRECT WHATSAPP
    transferToWhatsApp(query);
}

// CHATBOT FORM INPUT MODE SWITCHER & DYNAMIC FIELDS ENGINE
function switchChatbotInputMode(mode) {
    const formatTypeInput = document.getElementById('admin-chatbot-format-type');
    const fieldsBox = document.getElementById('chatbot-fields-container');
    const htmlBox = document.getElementById('chatbot-html-container');
    const btnFields = document.getElementById('btn-mode-fields');
    const btnHtml = document.getElementById('btn-mode-html');

    if (formatTypeInput) formatTypeInput.value = mode;

    if (mode === 'fields') {
        if (fieldsBox) fieldsBox.style.display = 'flex';
        if (htmlBox) htmlBox.style.display = 'none';
        if (btnFields) {
            btnFields.style.background = '#7C3AED';
            btnFields.style.color = '#FFF';
            btnFields.classList.remove('btn-outline');
        }
        if (btnHtml) {
            btnHtml.style.background = 'transparent';
            btnHtml.style.color = '#7C3AED';
            btnHtml.classList.add('btn-outline');
        }
    } else {
        if (fieldsBox) fieldsBox.style.display = 'none';
        if (htmlBox) htmlBox.style.display = 'block';
        if (btnHtml) {
            btnHtml.style.background = '#7C3AED';
            btnHtml.style.color = '#FFF';
            btnHtml.classList.remove('btn-outline');
        }
        if (btnFields) {
            btnFields.style.background = 'transparent';
            btnFields.style.color = '#7C3AED';
            btnFields.classList.add('btn-outline');
        }
    }

    updateChatbotLivePreview();
}

function addChatbotItemRow(title = '', detail = '') {
    const box = document.getElementById('chatbot-bullet-items-box');
    if (!box) return;

    const row = document.createElement('div');
    row.className = 'chatbot-bullet-item-row';
    row.style.cssText = 'display:flex; gap:10px; align-items:center;';
    row.innerHTML = `
        <input type="text" class="cb-item-title" value="${title}" placeholder="اسم البند / النقطة (مثال: مقاس S)" style="flex:1; padding:8px 12px; border:1px solid #CBD5E1; border-radius:6px; font-family:var(--font-main);" oninput="updateChatbotLivePreview()">
        <input type="text" class="cb-item-detail" value="${detail}" placeholder="التفاصيل / السعر (مثال: 456 ج.م)" style="flex:1; padding:8px 12px; border:1px solid #CBD5E1; border-radius:6px; font-family:var(--font-main);" oninput="updateChatbotLivePreview()">
        <button type="button" class="btn btn-sm" onclick="removeChatbotItemRow(this)" style="background:#EF4444; color:#FFF; padding:6px 12px;"><i class="fa-solid fa-times"></i></button>
    `;
    box.appendChild(row);

    updateChatbotLivePreview();
}

function removeChatbotItemRow(btnEl) {
    if (btnEl && btnEl.parentElement) {
        btnEl.parentElement.remove();
        updateChatbotLivePreview();
    }
}

function getCompiledChatbotResponse() {
    const modeInput = document.getElementById('admin-chatbot-format-type');
    const mode = modeInput ? modeInput.value : 'fields';

    if (mode === 'html') {
        const rawHtmlEl = document.getElementById('admin-chatbot-response');
        return rawHtmlEl ? rawHtmlEl.value.trim() : '';
    }

    const introText = (document.getElementById('admin-chatbot-intro')?.value || '').trim();
    const outroText = (document.getElementById('admin-chatbot-outro')?.value || '').trim();

    const titleInputs = document.querySelectorAll('.cb-item-title');
    const detailInputs = document.querySelectorAll('.cb-item-detail');

    const items = [];
    titleInputs.forEach((tInput, idx) => {
        const titleVal = tInput.value.trim();
        const detailVal = detailInputs[idx] ? detailInputs[idx].value.trim() : '';
        if (titleVal || detailVal) {
            items.push({ title: titleVal, detail: detailVal });
        }
    });

    let compiled = '';
    if (introText) {
        compiled += introText;
    }

    if (items.length > 0) {
        if (compiled) compiled += '<br>';
        compiled += items.map(it => {
            if (it.title && it.detail) {
                return `• <strong>${it.title}:</strong> ${it.detail}`;
            } else if (it.title) {
                return `• <strong>${it.title}</strong>`;
            } else {
                return `• ${it.detail}`;
            }
        }).join('<br>');
    }

    if (outroText) {
        if (compiled) compiled += '<br><br>';
        compiled += outroText;
    }

    return compiled;
}

function updateChatbotLivePreview() {
    const previewBox = document.getElementById('chatbot-live-preview-box');
    if (!previewBox) return;

    const compiled = getCompiledChatbotResponse();
    const showWa = document.getElementById('admin-chatbot-showwa')?.checked;
    const waText = document.getElementById('admin-chatbot-watext')?.value || 'التواصل عبر الواتساب لتأكيد الطلب';

    let html = `<strong>مساعد تفنين الذكي:</strong><br>${compiled || '<span style="color:#94A3B8;">(سيظهر نص الرد التلقائي هنا فور الكتابة...)</span>'}`;
    if (showWa) {
        html += `
            <div style="margin-top:10px;">
                <button type="button" class="btn btn-sm" style="background:#25D366; color:#FFF; font-weight:700;">
                    <i class="fa-brands fa-whatsapp"></i> ${waText}
                </button>
            </div>
        `;
    }

    previewBox.innerHTML = html;
}

// RENDER CHATBOT RULES IN ADMIN DASHBOARD
function renderAdminChatbotTable() {
    const tbody = document.getElementById('admin-chatbot-tbody');
    if (!tbody) return;

    if (!state.chatbotRules || state.chatbotRules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748B;">لا توجد قواعد ردود آلية مسجلة في البوت حالياً</td></tr>`;
        return;
    }

    tbody.innerHTML = state.chatbotRules.map(rule => `
        <tr>
            <td><strong>${rule.topic}</strong></td>
            <td>
                <div style="display:flex; flex-wrap:wrap; gap:4px;">
                    ${(rule.keywords || []).map(kw => `<span style="background:#F3E8FF; color:#7C3AED; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:700;">${kw}</span>`).join('')}
                </div>
            </td>
            <td style="max-width:300px; font-size:0.82rem; color:#334155; line-height:1.5;">${rule.response}</td>
            <td>
                ${rule.showWaBtn ? `<span style="color:#25D366; font-weight:800; font-size:0.8rem;"><i class="fa-brands fa-whatsapp"></i> مفعّل (${rule.waBtnText || 'واتساب'})</span>` : '<span style="color:#94A3B8; font-size:0.8rem;">غير مفعّل</span>'}
            </td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="editChatbotRuleAdmin('${rule.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                <button class="btn btn-sm" style="background:#EF4444; color:#FFF;" onclick="deleteChatbotRuleAdmin('${rule.id}')"><i class="fa-solid fa-trash"></i> حذف</button>
            </td>
        </tr>
    `).join('');
}

function editChatbotRuleAdmin(id) {
    const rule = (state.chatbotRules || []).find(r => r.id === id);
    if (!rule) return;

    document.getElementById('admin-chatbot-id').value = rule.id;
    document.getElementById('admin-chatbot-topic').value = rule.topic || '';
    document.getElementById('admin-chatbot-keywords').value = (rule.keywords || []).join(', ');
    document.getElementById('admin-chatbot-showwa').checked = rule.showWaBtn !== false;
    document.getElementById('admin-chatbot-watext').value = rule.waBtnText || '';

    const itemsBox = document.getElementById('chatbot-bullet-items-box');
    if (itemsBox) itemsBox.innerHTML = '';

    if (rule.formatType === 'html' || (!rule.bulletItems && !rule.introText)) {
        switchChatbotInputMode('html');
        document.getElementById('admin-chatbot-response').value = rule.response || '';
    } else {
        switchChatbotInputMode('fields');
        document.getElementById('admin-chatbot-intro').value = rule.introText || '';
        document.getElementById('admin-chatbot-outro').value = rule.outroText || '';

        if (Array.isArray(rule.bulletItems) && rule.bulletItems.length > 0) {
            rule.bulletItems.forEach(item => {
                addChatbotItemRow(item.title || '', item.detail || '');
            });
        } else {
            addChatbotItemRow();
        }
    }

    updateChatbotLivePreview();

    const form = document.getElementById('admin-chatbot-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
}

async function handleAddChatbotRuleSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('admin-chatbot-id').value;
    const topic = document.getElementById('admin-chatbot-topic').value;
    const keywords = document.getElementById('admin-chatbot-keywords').value;
    const showWaBtn = document.getElementById('admin-chatbot-showwa').checked;
    const waBtnText = document.getElementById('admin-chatbot-watext').value;
    const formatType = document.getElementById('admin-chatbot-format-type')?.value || 'fields';

    const introText = document.getElementById('admin-chatbot-intro')?.value || '';
    const outroText = document.getElementById('admin-chatbot-outro')?.value || '';

    const titleInputs = document.querySelectorAll('.cb-item-title');
    const detailInputs = document.querySelectorAll('.cb-item-detail');

    const bulletItems = [];
    titleInputs.forEach((tInput, idx) => {
        const titleVal = tInput.value.trim();
        const detailVal = detailInputs[idx] ? detailInputs[idx].value.trim() : '';
        if (titleVal || detailVal) {
            bulletItems.push({ title: titleVal, detail: detailVal });
        }
    });

    const response = getCompiledChatbotResponse();

    if (!response) {
        alert('برجاء كتابة نص الرد الآلي للعميل');
        return;
    }

    const body = { topic, keywords, response, showWaBtn, waBtnText, formatType, introText, bulletItems, outroText };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/chatbot-rules/${id}` : '/api/chatbot-rules';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify(body)
        }).then(r => r.json());

        if (res.success) {
            alert(res.message || 'تم حفظ رد الآلي بنجاح');
            document.getElementById('admin-chatbot-form').reset();
            document.getElementById('admin-chatbot-id').value = '';
            if (document.getElementById('chatbot-bullet-items-box')) {
                document.getElementById('chatbot-bullet-items-box').innerHTML = '';
            }

            const cbRes = await fetch('/api/chatbot-rules').then(r => r.json());
            if (cbRes.success) state.chatbotRules = cbRes.data;

            renderAdminChatbotTable();
            initChatbot();
        } else {
            alert(res.message || 'فشل في حفظ رد الآلي');
        }
    } catch (err) {
        alert('حدث خطأ أثناء الاتصال بالخادم');
    }
}

async function deleteChatbotRuleAdmin(id) {
    if (!confirm('هل أنت تأكد من إزالة هذا الرد التلقائي من بوت الرد الشات؟')) return;

    try {
        const res = await fetch(`/api/chatbot-rules/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.currentUser.id}` }
        }).then(r => r.json());

        if (res.success) {
            alert('تم حذف رد البوت الآلي بنجاح');
            const cbRes = await fetch('/api/chatbot-rules').then(r => r.json());
            if (cbRes.success) state.chatbotRules = cbRes.data;

            renderAdminChatbotTable();
            initChatbot();
        }
    } catch (err) {
        alert('حدث خطأ أثناء الحذف');
    }
}

function transferToWhatsApp(userQuery) {
    const name = state.currentUser ? state.currentUser.name : 'عميل الموقع';
    const msg = `السلام عليكم مطبعة تفنين، أنا العميل (${name}). أريد الاستفسار بخصوص: ${userQuery}`;
    const waUrl = `https://wa.me/201505028565?text=${encodeURIComponent(msg)}`;

    appendBotMessage(`
        <strong>مساعد تفنين الذكي:</strong><br>
        سأقوم بنقلك فوراً للرد المباشر مع فريق الدعم عبر الواتساب لتنفيذ طلبك وإجابة استفسارك بشكل كامل 🌺<br><br>
        <a href="${waUrl}" target="_blank" class="btn btn-sm btn-block" style="background:linear-gradient(135deg, #25D366, #128C7E); color:#FFF; font-weight:800; font-size:0.95rem; margin-top:4px;">
            <i class="fa-brands fa-whatsapp" style="font-size:1.1rem;"></i> اضغط هنا للتحدث عبر الواتساب الآن
        </a>
    `);
}

// ADMIN EDIT HANDLERS FOR PRINTS, HERO CARDS, TICKERS, SLIDES

function editPrintServiceAdmin(id) {
    const srv = state.printsServices.find(s => s.id === id);
    if (!srv) return;

    switchAdminSubTab('prints');

    document.getElementById('edit-print-id').value = srv.id;
    document.getElementById('admin-print-title').value = srv.title;
    document.getElementById('admin-print-image').value = srv.image;
    document.getElementById('admin-print-desc').value = srv.description;
    document.getElementById('admin-print-watext').value = srv.waText || '';

    const previewContainer = document.getElementById('print-image-upload-preview-container');
    const previewImg = document.getElementById('print-form-image-preview');
    if (srv.image && previewImg && previewContainer) {
        previewImg.src = srv.image;
        previewContainer.style.display = 'block';
    }

    const form = document.getElementById('admin-print-service-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
}

async function handleAddPrintServiceSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-print-id').value;
    const title = document.getElementById('admin-print-title').value;
    const image = document.getElementById('admin-print-image').value;
    const description = document.getElementById('admin-print-desc').value;
    const waText = document.getElementById('admin-print-watext').value || `السلام عليكم، أريد الاستفسار عن ${title}`;

    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/prints-services/${editId}` : '/api/prints-services';

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify({ title, image, description, waText })
        }).then(r => r.json());

        if (res.success) {
            alert(res.message);
            document.getElementById('admin-print-service-form').reset();
            document.getElementById('edit-print-id').value = '';
            await fetchInitialData();
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('حدث خطأ أثناء حفظ خدمة المطبوعات');
    }
}

function editHeroCardAdmin(id) {
    const card = state.heroCards.find(c => c.id === id);
    if (!card) return;

    switchAdminSubTab('herocards');

    document.getElementById('edit-hero-id').value = card.id;
    document.getElementById('admin-hero-badge').value = card.badge;
    document.getElementById('admin-hero-title').value = card.title;
    document.getElementById('admin-hero-subtitle').value = card.subtitle || '';
    document.getElementById('admin-hero-tag').value = card.tag || '';
    document.getElementById('admin-hero-image').value = card.image;

    const previewContainer = document.getElementById('hero-image-upload-preview-container');
    const previewImg = document.getElementById('hero-form-image-preview');
    if (card.image && previewImg && previewContainer) {
        previewImg.src = card.image;
        previewContainer.style.display = 'block';
    }

    const form = document.getElementById('admin-hero-card-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
}

// GENERIC IMAGE UPLOAD HELPER FOR ANY ADMIN SECTION
async function uploadImageFileGeneric(file, urlInputId, previewImgId, statusId, containerId) {
    if (!file || !file.type.startsWith('image/')) {
        alert('برجاء اختيار ملف صورة صحيح');
        return;
    }

    const reader = new FileReader();
    const statusEl = document.getElementById(statusId);
    const previewContainer = document.getElementById(containerId);
    const previewImg = document.getElementById(previewImgId);

    if (previewContainer) previewContainer.style.display = 'block';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 25;
        if (statusEl) statusEl.textContent = `جاري رفع ومعالجة الصورة... ${progress}%`;
        if (progress >= 100) clearInterval(interval);
    }, 100);

    reader.onload = function(e) {
        const base64Data = e.target.result;
        if (previewImg) previewImg.src = base64Data;

        document.getElementById(urlInputId).value = base64Data;
        setTimeout(() => {
            if (statusEl) statusEl.textContent = '✅ تم رفع وتجهيز الصورة بنجاح!';
        }, 400);
    };
    reader.readAsDataURL(file);
}

function handlePrintServiceImageSelect(event) {
    uploadImageFileGeneric(event.target.files[0], 'admin-print-image', 'print-form-image-preview', 'print-image-upload-status', 'print-image-upload-preview-container');
}

function handleHeroCardImageSelect(event) {
    uploadImageFileGeneric(event.target.files[0], 'admin-hero-image', 'hero-form-image-preview', 'hero-image-upload-status', 'hero-image-upload-preview-container');
}

async function handleAddHeroCardSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-hero-id').value;
    const badge = document.getElementById('admin-hero-badge').value;
    const title = document.getElementById('admin-hero-title').value;
    const subtitle = document.getElementById('admin-hero-subtitle').value;
    const tag = document.getElementById('admin-hero-tag').value;
    const image = document.getElementById('admin-hero-image').value;

    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/hero-cards/${editId}` : '/api/hero-cards';

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify({ badge, title, subtitle, tag, image })
        }).then(r => r.json());

        if (res.success) {
            alert(res.message);
            document.getElementById('admin-hero-card-form').reset();
            document.getElementById('edit-hero-id').value = '';
            await fetchInitialData();
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('حدث خطأ أثناء إضافة كارت الهيرو');
    }
}

function editTickerAdmin(id) {
    const t = state.tickers.find(x => x.id === id);
    if (!t) return;

    switchAdminSubTab('tickers');

    document.getElementById('edit-ticker-id').value = t.id;
    document.getElementById('admin-ticker-text').value = t.text;
    document.getElementById('admin-ticker-icon').value = t.icon || 'fa-gift';

    const form = document.getElementById('admin-ticker-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
}

async function handleAddTickerSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-ticker-id').value;
    const text = document.getElementById('admin-ticker-text').value;
    const icon = document.getElementById('admin-ticker-icon').value || 'fa-gift';

    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/tickers/${editId}` : '/api/tickers';

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify({ text, icon })
        }).then(r => r.json());

        if (res.success) {
            alert(res.message);
            document.getElementById('admin-ticker-form').reset();
            document.getElementById('edit-ticker-id').value = '';
            await fetchInitialData();
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('حدث خطأ أثناء إضافة العرض');
    }
}

function editSlideAdmin(id) {
    const s = state.topBarSlides.find(x => x.id === id);
    if (!s) return;

    switchAdminSubTab('slides');

    document.getElementById('edit-slide-id').value = s.id;
    document.getElementById('admin-slide-title').value = s.title;
    document.getElementById('admin-slide-detail').value = s.detail || '';
    document.getElementById('admin-slide-icon').value = s.icon || 'fa-star';
    document.getElementById('admin-slide-category').value = s.categoryId || 'all';

    const form = document.getElementById('admin-slide-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
}

async function handleAddSlideSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-slide-id').value;
    const title = document.getElementById('admin-slide-title').value;
    const detail = document.getElementById('admin-slide-detail').value;
    const icon = document.getElementById('admin-slide-icon').value || 'fa-star';
    const categoryId = document.getElementById('admin-slide-category').value;

    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/topbar-slides/${editId}` : '/api/topbar-slides';

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify({ title, detail, icon, categoryId })
        }).then(r => r.json());

        if (res.success) {
            alert(res.message);
            document.getElementById('admin-slide-form').reset();
            document.getElementById('edit-slide-id').value = '';
            await fetchInitialData();
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('حدث خطأ أثناء إضافة الشريحة');
    }
}

async function updateGlobalTaxSetting(enabled) {
    try {
        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser ? state.currentUser.id : ''}`
            },
            body: JSON.stringify({ includeTax: enabled })
        }).then(r => r.json());

        if (res.success) {
            if (!state.settings) state.settings = {};
            state.settings.includeTax = enabled;
            alert(res.message);
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert('تعذر تحديث إعدادات الضريبة العامة');
    }
}

async function deleteQuoteAdmin(id) {
    if (!confirm('هل تريد حذف طلب عرض السعر هذا من الصندوق؟')) return;

    try {
        const res = await fetch(`/api/quotes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.currentUser.id}` }
        }).then(r => r.json());

        if (res.success) {
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('تعذر الحذف');
    }
}

async function deletePrintServiceAdmin(id) {
    if (!confirm('هل تريد حذف هذه الخدمة من السلايدر المنفصل للمطبوعات؟')) return;

    try {
        const res = await fetch(`/api/prints-services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.currentUser.id}` }
        }).then(r => r.json());

        if (res.success) {
            await fetchInitialData();
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('تعذر الحذف');
    }
}

async function deleteHeroCardAdmin(id) {
    if (!confirm('هل تريد حذف هذا الكارت من الهيرو؟')) return;

    try {
        const res = await fetch(`/api/hero-cards/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.currentUser.id}` }
        }).then(r => r.json());

        if (res.success) {
            await fetchInitialData();
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('تعذر الحذف');
    }
}

async function deleteTickerAdmin(id) {
    if (!confirm('هل تريد حذف هذا العرض من الشريط المتحرك؟')) return;

    try {
        const res = await fetch(`/api/tickers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.currentUser.id}` }
        }).then(r => r.json());

        if (res.success) {
            await fetchInitialData();
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('تعذر الحذف');
    }
}

async function deleteSlideAdmin(id) {
    if (!confirm('هل تريد حذف هذه الشريحة من الشريط العلوي؟')) return;

    try {
        const res = await fetch(`/api/topbar-slides/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.currentUser.id}` }
        }).then(r => r.json());

        if (res.success) {
            await fetchInitialData();
            await loadAdminStatsAndTables();
        }
    } catch (err) {
        alert('تعذر الحذف');
    }
}

// ADMIN CATEGORIES MANAGEMENT & DYNAMIC DROPDOWNS
function renderAdminCategoriesTableAndDropdowns() {
    const catTbody = document.getElementById('admin-categories-tbody');
    if (catTbody) {
        catTbody.innerHTML = state.categories.map(c => `
            <tr>
                <td style="font-size:1.2rem; color:#7C3AED; text-align:center;"><i class="fa-solid ${c.icon || 'fa-folder'}"></i></td>
                <td><code>${c.id}</code></td>
                <td><strong>${c.name}</strong><br><span style="font-size:0.75rem; color:#64748B;">${c.description || ''}</span></td>
                <td><code style="background:#F1F5F9; padding:2px 6px; border-radius:4px; font-size:0.8rem; color:#7C3AED;">${c.keywords || 'غير محدد'}</code></td>
                <td><span style="color:#059669; font-weight:700;">${c.defaultPrice || 0} ج.م</span> / <span style="color:#64748B; font-size:0.85rem;">${c.defaultUnit || 'وحدة'}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editCategoryAdmin('${c.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                    <button class="btn btn-sm" style="background:#EF4444; color:#FFF;" onclick="deleteCategoryAdmin('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    const prodCatSelect = document.getElementById('prod-form-category');
    if (prodCatSelect) {
        prodCatSelect.innerHTML = state.categories.map(c => `
            <option value="${c.id}">${c.name} (${c.id})</option>
        `).join('');
    }
}

function handleProductCategorySelect(catId) {
    const cat = state.categories.find(c => c.id === catId);
    if (!cat) return;

    const priceInput = document.getElementById('prod-form-price');
    const unitInput = document.getElementById('prod-form-unit');

    if (priceInput && cat.defaultPrice && (!priceInput.value || priceInput.value == 0)) {
        priceInput.value = cat.defaultPrice;
    }
    if (unitInput && cat.defaultUnit && (!unitInput.value || unitInput.value === 'وحدة')) {
        unitInput.value = cat.defaultUnit;
    }
}

function editCategoryAdmin(id) {
    const c = state.categories.find(x => x.id === id);
    if (!c) return;

    switchAdminSubTab('categories');

    document.getElementById('edit-cat-id').value = c.id;
    document.getElementById('admin-cat-id').value = c.id;
    document.getElementById('admin-cat-id').readOnly = true;
    document.getElementById('admin-cat-name').value = c.name;
    document.getElementById('admin-cat-icon').value = c.icon || 'fa-folder';
    document.getElementById('admin-cat-keywords').value = c.keywords || '';
    document.getElementById('admin-cat-default-price').value = c.defaultPrice || '';
    document.getElementById('admin-cat-default-unit').value = c.defaultUnit || '';
    document.getElementById('admin-cat-desc').value = c.description || '';

    const form = document.getElementById('admin-category-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
}

async function handleAddCategorySubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-cat-id').value;
    const catId = document.getElementById('admin-cat-id').value.trim();
    const name = document.getElementById('admin-cat-name').value.trim();
    const icon = document.getElementById('admin-cat-icon').value.trim() || 'fa-folder';
    const keywords = document.getElementById('admin-cat-keywords').value.trim();
    const defaultPrice = parseFloat(document.getElementById('admin-cat-default-price').value) || 0;
    const defaultUnit = document.getElementById('admin-cat-default-unit').value.trim();
    const description = document.getElementById('admin-cat-desc').value.trim();

    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/categories/${editId}` : '/api/categories';

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify({ id: catId, name, icon, keywords, defaultPrice, defaultUnit, description })
        }).then(r => r.json());

        if (res.success) {
            alert(res.message);
            document.getElementById('admin-category-form').reset();
            document.getElementById('edit-cat-id').value = '';
            document.getElementById('admin-cat-id').readOnly = false;
            await fetchInitialData();
            await loadAdminStatsAndTables();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert('حدث خطأ أثناء حفظ القسم');
    }
}

async function deleteCategoryAdmin(id) {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف هذا القسم / التصنيف (${id})؟`)) return;

    try {
        const res = await fetch(`/api/categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.currentUser.id}` }
        }).then(r => r.json());

        if (res.success) {
            alert(res.message);
            await fetchInitialData();
            await loadAdminStatsAndTables();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert('تعذر الحذف');
    }
}

async function updateOrderStatusAdmin(orderId, newStatus) {
    try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify({ status: newStatus })
        }).then(r => r.json());

        if (res.success) {
            alert('تم تحديث حالة الفاتورة والطلب بنجاح');
        }
    } catch (err) {
        alert('حدث خطأ أثناء التحديث');
    }
}

// CLIENT-SIDE IMAGE COMPRESSION HELPER TO PREVENT VERCEL PAYLOAD LIMITS
function compressImageFile(file, maxWidth = 450, quality = 0.75) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ADMIN IMAGE UPLOAD HANDLER
async function handleAdminImageFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('برجاء اختيار ملف صورة صحيح');
        return;
    }

    const statusEl = document.getElementById('image-upload-status');
    const previewContainer = document.getElementById('image-upload-preview-container');
    const previewImg = document.getElementById('prod-form-image-preview');

    if (previewContainer) previewContainer.style.display = 'block';
    if (statusEl) statusEl.textContent = 'جاري ضغط ومعالجة الصورة...';

    try {
        const compressedBase64 = await compressImageFile(file);
        if (previewImg) previewImg.src = compressedBase64;
        if (statusEl) statusEl.textContent = 'جاري رفع الصورة إلى Google Drive...';

        const adminUser = state.currentUser || JSON.parse(localStorage.getItem('tfnen_user') || '{"id":"u-admin"}');
        const token = adminUser.id || 'u-admin';

        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ imageBase64: compressedBase64, fileName: file.name })
        }).then(r => r.json());

        if (res.success && res.url) {
            document.getElementById('prod-form-image-url').value = res.url;
            if (statusEl) statusEl.textContent = '✅ تم رفع الصورة إلى Google Drive بنجاح!';
        } else {
            document.getElementById('prod-form-image-url').value = compressedBase64;
            if (statusEl) statusEl.textContent = '✅ تم تجهيز الصورة بنجاح!';
        }
    } catch (err) {
        console.error('Upload error:', err);
        if (statusEl) statusEl.textContent = '❌ خطأ أثناء رفع الصورة';
    }
}

function openAddProductModal() {
    renderAdminCategoriesTableAndDropdowns();
    document.getElementById('edit-prod-id').value = '';
    document.getElementById('add-prod-title').textContent = 'إضافة منتج أو تابلوه جديد لـ مطبعة تفنين';
    document.getElementById('admin-product-form').reset();
    document.getElementById('prod-form-unit').value = 'قطعة واحدة';
    document.getElementById('prod-form-image-url').value = '';
    document.getElementById('prod-form-bestseller').checked = false;
    document.getElementById('prod-form-tax').checked = false;

    const previewContainer = document.getElementById('image-upload-preview-container');
    if (previewContainer) previewContainer.style.display = 'none';

    openModal('add-product-modal');
}

function editProductAdmin(prodId) {
    const prod = state.products.find(p => p.id === prodId);
    if (!prod) return;

    document.getElementById('edit-prod-id').value = prod.id;
    document.getElementById('add-prod-title').textContent = 'تعديل بيانات المنتج وصورته';
    document.getElementById('prod-form-name').value = prod.name;
    document.getElementById('prod-form-category').value = prod.categoryId;
    document.getElementById('prod-form-calcType').value = prod.calcType || 'quantity';
    document.getElementById('prod-form-price').value = prod.basePrice;

    const unitSelect = document.getElementById('prod-form-unit');
    const unitVal = prod.priceUnit || 'قطعة واحدة';
    if (unitSelect) {
        let exists = Array.from(unitSelect.options).some(o => o.value === unitVal);
        if (!exists) {
            const opt = document.createElement('option');
            opt.value = unitVal;
            opt.textContent = unitVal;
            unitSelect.appendChild(opt);
        }
        unitSelect.value = unitVal;
    }

    document.getElementById('prod-form-discount-percent').value = prod.discountPercent || '';
    document.getElementById('prod-form-discount-expiry').value = prod.discountExpiry || '';
    document.getElementById('prod-form-image-url').value = prod.image || '';
    document.getElementById('prod-form-desc').value = prod.description || '';
    document.getElementById('prod-form-bestseller').checked = !!prod.isBestSeller;
    document.getElementById('prod-form-tax').checked = !!prod.includeTax;

    const previewContainer = document.getElementById('image-upload-preview-container');
    const previewImg = document.getElementById('prod-form-image-preview');
    const statusEl = document.getElementById('image-upload-status');

    if (prod.image && previewImg && previewContainer) {
        previewImg.src = prod.image;
        previewContainer.style.display = 'block';
        if (statusEl) statusEl.textContent = 'الصورة الحالية للمنتج';
    }

    openModal('add-product-modal');
}

async function handleSaveProductSubmit(e) {
    e.preventDefault();
    const prodId = document.getElementById('edit-prod-id').value;
    const imageUrl = document.getElementById('prod-form-image-url').value || 'https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?w=600&auto=format&fit=crop&q=80';

    const body = {
        name: document.getElementById('prod-form-name').value,
        categoryId: document.getElementById('prod-form-category').value,
        calcType: document.getElementById('prod-form-calcType').value,
        basePrice: parseFloat(document.getElementById('prod-form-price').value),
        priceUnit: document.getElementById('prod-form-unit').value,
        discountPercent: parseFloat(document.getElementById('prod-form-discount-percent').value) || 0,
        discountExpiry: document.getElementById('prod-form-discount-expiry').value.trim(),
        image: imageUrl,
        description: document.getElementById('prod-form-desc').value,
        isBestSeller: document.getElementById('prod-form-bestseller').checked,
        includeTax: document.getElementById('prod-form-tax').checked
    };

    const method = prodId ? 'PUT' : 'POST';
    const url = prodId ? `/api/products/${prodId}` : '/api/products';

    const adminUser = state.currentUser || JSON.parse(localStorage.getItem('tfnen_user') || '{"id":"u-admin"}');
    const token = adminUser.id || 'u-admin';

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        }).then(r => r.json());

        if (res.success) {
            alert(res.message);
            closeModal('add-product-modal');
            await fetchInitialData();
            switchTab('admin');
            await loadAdminStatsAndTables();
        } else {
            alert(res.message || 'فشل في حفظ المنتج');
        }
    } catch (err) {
        console.error('Save product error:', err);
        alert('حدث خطأ أثناء حفظ المنتج');
    }
}

async function deleteProductAdmin(prodId) {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذا المنتج من المطبعة؟')) return;

    const adminUser = state.currentUser || JSON.parse(localStorage.getItem('tfnen_user') || '{"id":"u-admin"}');
    const token = adminUser.id || 'u-admin';

    try {
        const res = await fetch(`/api/products/${prodId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());

        if (res.success) {
            alert(res.message);
            await fetchInitialData();
            switchTab('admin');
            await loadAdminStatsAndTables();
        } else {
            alert(res.message || 'تعذر الحذف');
        }
    } catch (err) {
        alert('تعذر الحذف');
    }
}

// CUSTOM QUOTE SUBMIT
async function handleQuoteSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('quote-name').value;
    const phone = document.getElementById('quote-phone').value;
    const email = document.getElementById('quote-email').value;
    const category = document.getElementById('quote-category').value;
    const details = document.getElementById('quote-details').value;

    try {
        const res = await fetch('/api/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, email, category, details })
        }).then(r => r.json());

        alert(res.message || 'تم إرسال طلبك بنجاح');
        document.getElementById('quote-form').reset();
    } catch (err) {
        alert('حدث خطأ أثناء إرسال الطلب');
    }
}

async function duplicateProductAdmin(prodId) {
    const prod = state.products.find(p => p.id === prodId);
    if (!prod) return;

    if (!confirm(`هل أنت متأكد من رغبتك في تكرار المنتج "${prod.name}"؟`)) return;

    const duplicatedBody = {
        name: prod.name + ' (نسخة)',
        categoryId: prod.categoryId,
        calcType: prod.calcType || 'quantity',
        basePrice: prod.basePrice,
        priceUnit: prod.priceUnit || 'قطعة واحدة',
        discountPercent: prod.discountPercent || 0,
        discountExpiry: prod.discountExpiry || '',
        image: prod.image,
        description: prod.description || '',
        isBestSeller: false,
        options: prod.options || {}
    };

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.currentUser.id}`
            },
            body: JSON.stringify(duplicatedBody)
        }).then(r => r.json());

        if (res.success) {
            alert('✅ تم تكرار المنتج بنجاح!');
            await fetchInitialData();
            switchTab('admin');
            await loadAdminStatsAndTables();
        } else {
            alert(res.message || 'تعذر تكرار المنتج');
        }
    } catch (err) {
        alert('حدث خطأ أثناء تكرار المنتج');
    }
}

// MODAL UTILITIES
function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
}

// PAGE VIEWS & NAVIGATION ENGINE
function switchTab(tabName) {
    if (!tabName) tabName = 'home';
    state.currentActiveTab = tabName;

    document.querySelectorAll('.page-view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });

    document.querySelectorAll('.secondary-nav-bar .nav-tab-item').forEach(btn => {
        btn.classList.remove('active');
    });

    const targetView = document.getElementById('view-' + tabName);
    if (targetView) {
        targetView.style.display = 'block';
        targetView.classList.add('active');
    }

    const activeNavBtn = document.querySelector(`.secondary-nav-bar .nav-tab-item[data-tab="${tabName}"]`);
    if (activeNavBtn) {
        activeNavBtn.classList.add('active');
    }

    if (tabName === 'home') {
        renderHomeBestSellers();
    } else if (tabName === 'decor') {
        renderDecorPage(state.selectedDecorCategory || 'all');
    } else if (tabName === 'prints') {
        renderPrintsPage(state.selectedPrintsCategory || 'all');
    } else if (tabName === 'cards') {
        renderCardsPage();
    } else if (tabName === 'admin') {
        loadAdminStatsAndTables();
    }

    const newPath = tabName === 'home' ? '/' : '/' + tabName;
    try {
        window.history.pushState(null, '', newPath);
    } catch (e) {
        window.location.hash = tabName;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHomeBestSellers() {
    const grid = document.getElementById('home-bestsellers-grid');
    if (!grid) return;

    let featured = state.products.filter(p => p.isBestSeller || ['business-cards', 'wall-panels', 'wallpaper', 'canvas-abstract', 'canvas-nature', 'canvas-kids', 'canvas-coffee', 'canvas-classic', 'canvas-islamic', 'canvas-custom', 'canvas-sets', 'canvas-cars-pop'].includes(p.categoryId));
    if (featured.length === 0) {
        featured = state.products;
    }

    if (featured.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:#64748B;">جاري تحميل المنتجات...</div>';
        return;
    }

    grid.innerHTML = featured.slice(0, 8).map(prod => buildProductCardHtml(prod)).join('');
}

function filterDecorPage(catId, btnEl) {
    state.selectedDecorCategory = catId;
    if (btnEl) {
        const parent = btnEl.parentElement;
        if (parent) parent.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
    renderDecorPage(catId);
}

function renderDecorPage(catId = 'all') {
    const grid = document.getElementById('decor-products-grid');
    const countEl = document.getElementById('decor-products-count');
    if (!grid) return;

    const decorCatIds = [
        'wall-panels', 'wallpaper', 'wall-decor',
        'canvas-abstract', 'canvas-islamic', 'canvas-sets',
        'canvas-nature', 'canvas-coffee', 'canvas-custom',
        'canvas-kids', 'canvas-cars-pop', 'canvas-classic'
    ];

    let list = state.products.filter(p => decorCatIds.includes(p.categoryId));
    if (catId !== 'all') {
        list = list.filter(p => p.categoryId === catId);
    }

    if (countEl) {
        countEl.textContent = `عدد المنتجات المعروضة: ${list.length} منتج`;
    }

    if (list.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px; color:#64748B;">
            <i class="fa-solid fa-palette" style="font-size:3rem; margin-bottom:15px; color:#CBD5E1;"></i>
            <h3>لا توجد منتجات ديكور متوفرة في هذا القسم حالياً</h3>
        </div>`;
        return;
    }

    grid.innerHTML = list.map(prod => buildProductCardHtml(prod)).join('');
}

function filterPrintsPage(catId, btnEl) {
    state.selectedPrintsCategory = catId;
    if (btnEl) {
        const parent = btnEl.parentElement;
        if (parent) parent.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
    renderPrintsPage(catId);
}

function renderPrintsPage(catId = 'all') {
    const grid = document.getElementById('prints-products-grid');
    const countEl = document.getElementById('prints-products-count');
    if (!grid) return;

    const printsCatIds = ['business-cards', 'cladding', 'acrylic-letters', 'outdoor-prints', 'paper-prints', 'marketing-prints', 'custom-prints'];
    let list = state.products.filter(p => printsCatIds.includes(p.categoryId));

    if (catId !== 'all') {
        list = list.filter(p => p.categoryId === catId);
    }

    if (countEl) {
        countEl.textContent = `عدد الخدمات والمنتجات المعروضة: ${list.length} صنف`;
    }

    if (list.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px; color:#64748B;">
            <i class="fa-solid fa-print" style="font-size:3rem; margin-bottom:15px; color:#CBD5E1;"></i>
            <h3>لا توجد خدمات مطبوعات متوفرة في هذا القسم حالياً</h3>
        </div>`;
        return;
    }

    grid.innerHTML = list.map(prod => buildProductCardHtml(prod)).join('');
}

function selectCardType(name, pricePer1000, icon, badge, desc, btnEl) {
    state.selectedCardType = {
        name: name,
        pricePer1000: pricePer1000,
        icon: icon,
        badge: badge,
        desc: desc
    };

    if (btnEl) {
        const grid = document.getElementById('cards-type-selector-grid');
        if (grid) {
            grid.querySelectorAll('.card-type-chip').forEach(chip => chip.classList.remove('active'));
        }
        btnEl.classList.add('active');
    }

    calculateBusinessCardLivePrice();
}

function calculateBusinessCardLivePrice() {
    const qtySelect = document.getElementById('bc-qty-select');
    const totalEl = document.getElementById('bc-live-total-price');

    if (!qtySelect || !totalEl) return;

    const qty = parseInt(qtySelect.value) || 1000;
    state.cardQty = qty;

    const baseUnitPrice = state.selectedCardType ? state.selectedCardType.pricePer1000 : 130;
    let discountRate = 0;

    if (qty === 2000) discountRate = 0.05;
    else if (qty === 3000) discountRate = 0.08;
    else if (qty === 5000) discountRate = 0.12;
    else if (qty === 10000) discountRate = 0.18;

    const numBoxes = qty / 1000;
    const subtotal = baseUnitPrice * numBoxes;
    const finalPrice = Math.round(subtotal * (1 - discountRate));

    totalEl.textContent = `${finalPrice} ج.م`;
    return finalPrice;
}

function handleAddToCartBusinessCard() {
    const qtySelect = document.getElementById('bc-qty-select');
    const designLinkInput = document.getElementById('bc-design-link');

    const qty = parseInt(qtySelect ? qtySelect.value : '1000') || 1000;
    const notes = designLinkInput ? designLinkInput.value.trim() : '';

    const totalPrice = calculateBusinessCardLivePrice();
    const cardTypeName = state.selectedCardType ? state.selectedCardType.name : 'كرت شخصى وجه واحد UV';

    const cartItem = {
        productId: 'bc-' + Date.now(),
        productName: `كارت شخصي - ${cardTypeName}`,
        quantity: qty / 1000,
        unitPrice: Math.round(totalPrice / (qty / 1000)),
        totalPrice: totalPrice,
        selectedOptions: {
            'نوع الكارت / التغليف': cardTypeName,
            'الكمية المطلوبة': `${qty} كارت / ملصق`,
            'رابط التصميم / ملاحظات': notes || 'لا يوجد'
        }
    };

    state.cart.push(cartItem);
    saveLocalCart();

    alert(`✅ تم إضافة "${cartItem.productName}" بنجاح إلى سلة مشترياتك!`);
    toggleCartDrawer();
}

function appendPresetKeyword(val) {
    if (!val) return;
    const input = document.getElementById('admin-cat-keywords');
    if (!input) return;
    if (input.value.trim()) {
        input.value = input.value.trim() + ', ' + val;
    } else {
        input.value = val;
    }
}

function renderCardsPage() {
    const grid = document.getElementById('cards-products-grid');
    if (!grid) return;

    const cardProducts = state.products.filter(p => p.categoryId === 'business-cards');

    if (cardProducts.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:#64748B;">جاري تحميل أصناف الكروت...</div>';
        return;
    }

    grid.innerHTML = cardProducts.map(prod => buildProductCardHtml(prod)).join('');
    calculateBusinessCardLivePrice();
}

function toggleMobileMenu() {
    const nav = document.getElementById('mobile-nav');
    if (nav) nav.classList.toggle('open');
}

// Prevent image saving / right click context menu on images
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG' || e.target.closest('img') || e.target.classList.contains('canvas-3d-wrapper')) {
            e.preventDefault();
            return false;
        }
    });
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG' || e.target.closest('img')) {
            e.preventDefault();
            return false;
        }
    });
});

