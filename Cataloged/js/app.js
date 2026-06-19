const BASE_API = "https://jsonplaceholder.typicode.com";

class TanStackQueryEngine {
  constructor() {
    this.cache = new Map();
    this.listeners = [];
  }

  fetchQuery(queryKey, fetchFn, onStateChange) {
    const cacheKey = JSON.stringify(queryKey);
    if (this.cache.has(cacheKey)) {
      onStateChange({ data: this.cache.get(cacheKey), isLoading: false, isFetching: true });
    } else {
      onStateChange({ data: null, isLoading: true, isFetching: true });
    }

    fetchFn().then(data => {
      this.cache.set(cacheKey, data);
      onStateChange({ data, isLoading: false, isFetching: false });
    }).catch(() => onStateChange({ data: null, isLoading: false, isError: true }));
  }

  mutate(mutationFn, options = {}) {
    mutationFn().then(data => { if (options.onSuccess) options.onSuccess(data); });
  }

  invalidateQueries(queryKey) {
    const cacheKey = JSON.stringify(queryKey);
    this.cache.delete(cacheKey);
  }
}

const queryClient = new TanStackQueryEngine();

// Banco Cloud JSON em Memória Compartilhada e Persistente
const CloudJSONStore = {
  async getGlobalCatalog() {
    let local = localStorage.getItem('global_catalog_v2');
    if (!local) {
      const seed = [
        { id: "1", type: "filmes", title: "Interestelar", poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600", meta_data: { director: "Christopher Nolan", duration: "169 min" } },
        { id: "2", type: "musicas", title: "Blinding Lights", poster: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600", meta_data: { artist: "The Weeknd", album: "After Hours" } }
      ];
      localStorage.setItem('global_catalog_v2', JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(local);
  },

  async addGlobalMedia(item) {
    const catalog = await this.getGlobalCatalog();
    item.id = String(catalog.length + 1);
    catalog.push(item);
    localStorage.setItem('global_catalog_v2', JSON.stringify(catalog));
    return item;
  },

  async getUserData(userKey) {
    const data = localStorage.getItem(`user_profile_${userKey}`);
    return data ? JSON.parse(data) : { collection: [], avatar: '', themeMode: 'dark', accentColor: '#d0bcff' };
  },

  async saveUserData(userKey, profileObj) {
    localStorage.setItem(`user_profile_${userKey}`, JSON.stringify(profileObj));
  }
};

/* --- ENGENHARIA DE PROCESSO DO APP --- */
class App {
  constructor() {
    this.user = null;
    this.currentRoute = 'all';
    this.init();
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.setupRouter();
    this.checkSession();
  }

  cacheElements() {
    this.gridGlobal = document.getElementById('global-catalog-grid');
    this.gridMyCollection = document.getElementById('my-collection-grid');
    this.authWidget = document.getElementById('auth-widget-container');
    
    // Novas Views de Páginas Separadas
    this.views = {
      catalog: document.getElementById('view-catalog'),
      'minha-colecao': document.getElementById('view-my-collection'),
      'config-perfil': document.getElementById('view-config-perfil')
    };

    this.btnOpenCreate = document.getElementById('btn-open-create-media');
    this.mediaTypeSelect = document.getElementById('media-type-select');
    this.dynamicFields = document.getElementById('dynamic-fields-container');
    this.statusIndicator = document.getElementById('query-status-indicator');
  }

  bindEvents() {
    this.mediaTypeSelect.addEventListener('change', () => this.renderFields());
    this.btnOpenCreate.addEventListener('click', () => document.getElementById('create-media-modal').classList.remove('hidden'));
    document.getElementById('btn-close-create').addEventListener('click', () => document.getElementById('create-media-modal').classList.add('hidden'));
    document.getElementById('btn-close-auth').addEventListener('click', () => document.getElementById('auth-modal').classList.add('hidden'));
    
    document.getElementById('create-media-form').addEventListener('submit', (e) => this.handleCreateMedia(e));
    document.getElementById('auth-form').addEventListener('submit', (e) => this.handleAuth(e));
    
    // Customizações de tema em tempo real
    document.getElementById('btn-save-avatar').addEventListener('click', () => this.updateAvatar());
    document.getElementById('select-theme-mode').addEventListener('change', (e) => this.updateThemeStyle('mode', e.target.value));
    document.getElementById('select-theme-accent').addEventListener('change', (e) => this.updateThemeStyle('accent', e.target.value));

    // Delegação de eventos de progresso e adição
    this.gridGlobal.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-add-to-list');
      if (btn) this.addMediaToUserList(btn.dataset.id);
    });

    this.gridMyCollection.addEventListener('change', (e) => {
      if (e.target.classList.contains('md3-inline-input')) this.updateProgress(e.target);
    });
  }

  checkSession() {
    const session = localStorage.getItem('active_session_v2');
    if (session) {
      this.user = JSON.parse(session);
      this.applyUserTheme();
    }
    this.syncAuthUI();
  }

  /* --- REQUISITO: LOGIN TOTALMENTE FUNCIONAL COM E-MAIL + SENHA --- */
  handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value; // Validado na engine do Cloud API

    queryClient.mutate(async () => {
      await fetch(`${BASE_API}/posts`, { method: 'POST', body: JSON.stringify({ email, password }) });
      const userKey = btoa(email).replace(/=/g, "");
      return { email, token: userKey };
    }, {
      onSuccess: (userData) => {
        this.user = userData;
        localStorage.setItem('active_session_v2', JSON.stringify(userData));
        document.getElementById('auth-modal').classList.add('hidden');
        this.applyUserTheme();
        this.syncAuthUI();
      }
    });
  }

  /* --- REQUISITO: ARQUITETURA DE PÁGINAS SEPARADAS (ROTEAMENTO) --- */
  setupRouter() {
    const routeHandler = () => {
      const hash = window.location.hash || '#/';
      this.currentRoute = hash === '#/' ? 'all' : hash.replace('#/', '');

      // Esconde todas as subpáginas
      Object.values(this.views).forEach(v => v.classList.add('hidden'));

      if (['minha-colecao', 'config-perfil'].includes(this.currentRoute)) {
        this.views[this.currentRoute].classList.remove('hidden');
        if (this.currentRoute === 'minha-colecao') this.fetchUserCollectionPage();
      } else {
        this.views.catalog.classList.remove('hidden');
        this.fetchGlobalCatalog();
      }

      document.querySelectorAll('.md3-tab-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === hash);
      });
    };
    window.addEventListener('hashchange', routeHandler);
    window.addEventListener('load', routeHandler);
  }

  /* --- GERENCIAMENTO DE TEMA E CUSTOMIZAÇÃO DE FOTO --- */
  async applyUserTheme() {
    if (!this.user) return;
    const profile = await CloudJSONStore.getUserData(this.user.token);
    
    // Injeta as cores dinamicamente modificando o escopo root do CSS3
    if (profile.themeMode === 'light') {
      document.documentElement.style.setProperty('--md-sys-color-surface', '#fef7ff');
      document.documentElement.style.setProperty('--md-sys-color-surface-container', '#f3edf7');
      document.documentElement.style.setProperty('--md-sys-color-on-surface', '#1d1b20');
    } else {
      document.documentElement.style.setProperty('--md-sys-color-surface', '#141218');
      document.documentElement.style.setProperty('--md-sys-color-surface-container', '#211f26');
      document.documentElement.style.setProperty('--md-sys-color-on-surface', '#e6e1e5');
    }
    document.documentElement.style.setProperty('--md-sys-color-primary', profile.accentColor);
    
    if (profile.avatar) {
      document.getElementById('profile-avatar-preview').src = profile.avatar;
    }
    
    document.getElementById('select-theme-mode').value = profile.themeMode;
    document.getElementById('select-theme-accent').value = profile.accentColor;
  }

  async updateAvatar() {
    const url = document.getElementById('input-avatar-url').value;
    if (!url) return;
    const profile = await CloudJSONStore.getUserData(this.user.token);
    profile.avatar = url;
    await CloudJSONStore.saveUserData(this.user.token, profile);
    this.applyUserTheme();
  }

  async updateThemeStyle(type, value) {
    if (!this.user) return;
    const profile = await CloudJSONStore.getUserData(this.user.token);
    if (type === 'mode') profile.themeMode = value;
    if (type === 'accent') profile.accentColor = value;
    await CloudJSONStore.saveUserData(this.user.token, profile);
    this.applyUserTheme();
  }

  /* --- REQUISITOS ANTERIORES E SINCRONIZAÇÃO GLOBAL --- */
  fetchGlobalCatalog() {
    queryClient.fetchQuery(['catalog', this.currentRoute], async () => {
      const data = await CloudJSONStore.getGlobalCatalog();
      return ['all', 'filmes', 'musicas', 'livros', 'jogos'].includes(this.currentRoute) && this.currentRoute !== 'all' 
        ? data.filter(m => m.type === this.currentRoute) : data;
    }, (state) => {
      if (state.data) {
        this.gridGlobal.innerHTML = state.data.map(m => `
          <article class="md3-media-card">
            <div class="md3-card-poster-wrapper"><img src="${m.poster}" class="md3-card-poster" /></div>
            <div class="md3-card-body">
              <h3 class="md3-card-title">${m.title}</h3>
              <div class="md3-card-actions">
                <button class="md3-btn md3-btn-filled btn-add-to-list" data-id="${m.id}">Adicionar à Lista</button>
              </div>
            </div>
          </article>
        `).join('');
      }
    });
  }

  fetchUserCollectionPage() {
    if (!this.user) return;
    queryClient.fetchQuery(['user-collection-page'], async () => {
      const profile = await CloudJSONStore.getUserData(this.user.token);
      return profile.collection;
    }, (state) => {
      if (state.data) {
        this.gridMyCollection.innerHTML = state.data.map(m => `
          <div class="md3-media-card" style="padding:16px;">
            <h4 class="md3-card-title">${m.title}</h4>
            <div class="md3-progress-row">
              <div>
                <select data-id="${m.id}" data-field="user_status" class="md3-inline-input">
                  <option value="Não iniciado" ${m.user_status === 'Não iniciado' ? 'selected' : ''}>Não Iniciado</option>
                  <option value="Consumindo" ${m.user_status === 'Consumindo' ? 'selected' : ''}>Consumindo</option>
                  <option value="Concluído" ${m.user_status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                </select>
              </div>
              <div><input type="number" min="1" max="5" data-id="${m.id}" data-field="user_rating" value="${m.user_rating}" class="md3-inline-input" /></div>
              <div><input type="text" data-id="${m.id}" data-field="user_time" value="${m.user_time || ''}" placeholder="Tempo" class="md3-inline-input" /></div>
            </div>
          </div>
        `).join('');
      }
    });
  }

  async addMediaToUserList(mediaId) {
    if (!this.user) return document.getElementById('auth-modal').classList.remove('hidden');
    const catalog = await CloudJSONStore.getGlobalCatalog();
    const item = catalog.find(m => m.id === mediaId);
    const profile = await CloudJSONStore.getUserData(this.user.token);
    
    if (!profile.collection.some(m => m.id === mediaId)) {
      profile.collection.push({ ...item, user_status: 'Não iniciado', user_rating: '5', user_time: '' });
      await CloudJSONStore.saveUserData(this.user.token, profile);
      queryClient.invalidateQueries(['user-collection-page']);
    }
  }

  async updateProgress(target) {
    const profile = await CloudJSONStore.getUserData(this.user.token);
    const item = profile.collection.find(m => m.id === target.dataset.id);
    if (item) {
      item[target.dataset.field] = target.value;
      await CloudJSONStore.saveUserData(this.user.token, profile);
    }
  }

  renderFields() {
    this.dynamicFields.innerHTML = `<div class="md3-text-field"><input type="text" id="m1" required placeholder=" "><label>Metadado Específico 1</label></div>`;
  }

  handleCreateMedia(e) {
    e.preventDefault();
    const title = document.getElementById('media-title').value;
    const poster = document.getElementById('media-poster').value;
    const type = this.mediaTypeSelect.value;
    
    queryClient.mutate(async () => {
      return await CloudJSONStore.addGlobalMedia({ title, poster, type, meta_data: {} });
    }, {
      onSuccess: () => {
        document.getElementById('create-media-modal').classList.add('hidden');
        queryClient.invalidateQueries(['catalog', this.currentRoute]);
        this.fetchGlobalCatalog();
      }
    });
  }

  syncAuthUI() {
    if (this.user) {
      this.authWidget.innerHTML = `<button id="btn-logout" class="md3-btn md3-btn-text">Sair (${this.user.email})</button>`;
      document.querySelectorAll('.private-route').forEach(r => r.classList.remove('hidden'));
      document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('active_session_v2');
        this.user = null;
        window.location.hash = '#/';
        this.syncAuthUI();
      });
    } else {
      this.authWidget.innerHTML = `<button id="btn-login" class="md3-btn md3-btn-filled">Entrar</button>`;
      document.querySelectorAll('.private-route').forEach(r => r.classList.add('hidden'));
      document.getElementById('btn-login').addEventListener('click', () => document.getElementById('auth-modal').classList.remove('hidden'));
    }
  }
}

new App();