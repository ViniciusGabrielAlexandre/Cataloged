/** Cliente oficial do TanStack Query Core, utilizável sem framework. */
const { QueryClient } = globalThis.TanStackQueryCore;
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

async function runQuery(queryKey, queryFn, onStateChange) {
  const cached = queryClient.getQueryData(queryKey);
  onStateChange({ data: cached, isLoading: !cached, isFetching: true, isError: false });
  try {
    const data = await queryClient.fetchQuery({ queryKey, queryFn });
    onStateChange({ data, isLoading: false, isFetching: false, isError: false });
    return data;
  } catch (error) {
    onStateChange({ data: cached, isLoading: false, isFetching: false, isError: true });
    throw error;
  }
}

async function runMutation(mutationFn, options = {}) {
  const mutation = queryClient.getMutationCache().build(queryClient, { mutationFn, ...options });
  return mutation.execute();
}

function invalidateQuery(queryKey) { return queryClient.invalidateQueries({ queryKey }); }
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&fit=crop&crop=face';
const CATALOG_KEY = 'global_catalog_v4';
const USERS_KEY = 'catalloged_users_v1';
const SESSION_KEY = 'active_session_v3';

const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const makeToken = email => btoa(unescape(encodeURIComponent(email))).replace(/=/g, '');

async function hashPassword(password) {
  // O fallback mantém a validação estrita quando o arquivo é aberto em um
  // navegador que não expõe Web Crypto para o protocolo file://.
  if (!globalThis.crypto?.subtle) return btoa(unescape(encodeURIComponent(password)));
  const bytes = new TextEncoder().encode(password);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

const CloudJSONStore = {
  async getGlobalCatalog() {
    const stored = localStorage.getItem(CATALOG_KEY);
    const existingCatalog = (stored ? JSON.parse(stored) : []).filter(media => media.type !== 'musicas');
    existingCatalog.forEach((media, index) => { media.release_year ||= String(2000 + index); });
    if (stored && JSON.parse(stored).length !== existingCatalog.length) localStorage.setItem(CATALOG_KEY, JSON.stringify(existingCatalog));
    if (existingCatalog.length >= 15) { localStorage.setItem(CATALOG_KEY, JSON.stringify(existingCatalog)); return existingCatalog; }
    const poster = (id) => `https://images.unsplash.com/${id}?w=900&auto=format&fit=crop`;
    const seed = [
      { id: 'film-1', type: 'filmes', title: 'Interestelar', poster: poster('photo-1534447677768-be436bb09401'), meta_data: { director: 'Christopher Nolan', genre: 'Ficção científica' } },
      { id: 'film-2', type: 'filmes', title: 'Parasita', poster: poster('photo-1485846234645-a62644f84728'), meta_data: { director: 'Bong Joon-ho', genre: 'Mistério' } },
      { id: 'film-3', type: 'filmes', title: 'O Farol', poster: poster('photo-1500534314209-a25ddb2bd429'), meta_data: { director: 'Robert Eggers', genre: 'Horror' } },
      { id: 'film-4', type: 'filmes', title: 'Antes do Amanhecer', poster: poster('photo-1489599849927-2ee91cede3ba'), meta_data: { director: 'Richard Linklater', genre: 'Romance' } },
      { id: 'film-5', type: 'filmes', title: 'Mad Max: Estrada da Fúria', poster: poster('photo-1509347528160-9326518ac447'), meta_data: { director: 'George Miller', genre: 'Ação' } },
      { id: 'book-1', type: 'livros', title: 'Duna', poster: poster('photo-1544947950-fa07a98d237f'), meta_data: { author: 'Frank Herbert', genre: 'Ação' } },
      { id: 'book-2', type: 'livros', title: 'O Iluminado', poster: poster('photo-1512820790803-83ca734da794'), meta_data: { author: 'Stephen King', genre: 'Horror' } },
      { id: 'book-3', type: 'livros', title: 'Orgulho e Preconceito', poster: poster('photo-1476275466078-4007374efbbe'), meta_data: { author: 'Jane Austen', genre: 'Romance' } },
      { id: 'book-4', type: 'livros', title: 'Garota Exemplar', poster: poster('photo-1495446815901-a7297e633e8d'), meta_data: { author: 'Gillian Flynn', genre: 'Mistério' } },
      { id: 'book-5', type: 'livros', title: 'O Hobbit', poster: poster('photo-1511108690759-009324a90311'), meta_data: { author: 'J. R. R. Tolkien', genre: 'Aventura' } },
      { id: 'game-1', type: 'jogos', title: 'Hollow Knight', poster: poster('photo-1614680376593-902f74cf0d41'), meta_data: { console: 'PC', genre: 'Aventura' } },
      { id: 'game-2', type: 'jogos', title: 'The Last of Us', poster: poster('photo-1550745165-9bc0b252726f'), meta_data: { console: 'Playstation', genre: 'Terror' } },
      { id: 'game-3', type: 'jogos', title: 'The Legend of Zelda', poster: poster('photo-1552820728-8b83bb6b773f'), meta_data: { console: 'Nintendo', genre: 'RPG' } },
      { id: 'game-4', type: 'jogos', title: 'Forza Horizon 5', poster: poster('photo-1511512578047-dfb367046420'), meta_data: { console: 'Xbox', genre: 'Corrida' } },
      { id: 'game-5', type: 'jogos', title: 'Doki Doki Literature Club', poster: poster('photo-1542751371-adc38448a05e'), meta_data: { console: 'PC', genre: 'Visual Novel' } }
    ];
    const knownIds = new Set(existingCatalog.map(media => media.id));
    const catalog = [...existingCatalog, ...seed.filter(media => !knownIds.has(media.id))];
    catalog.forEach((media, index) => { media.release_year ||= String(2000 + index); });
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
    return catalog;
  },

  async addGlobalMedia(item) {
    const catalog = await this.getGlobalCatalog();
    const media = { ...item, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}` };
    catalog.push(media);
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
    return media;
  },

  async updateGlobalMedia(id, changes) {
    const catalog = await this.getGlobalCatalog();
    const index = catalog.findIndex(media => media.id === id);
    if (index === -1) throw new Error('Mídia não encontrada.');
    catalog[index] = { ...catalog[index], ...changes, meta_data: { ...catalog[index].meta_data, ...changes.meta_data } };
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
    // Mantém cópias da mídia já adicionadas às coleções pessoais consistentes,
    // sem sobrescrever os campos que pertencem ao acompanhamento do usuário.
    Object.keys(localStorage).filter(key => key.startsWith('user_profile_')).forEach(key => {
      const profile = JSON.parse(localStorage.getItem(key));
      const { description, ...collectionMedia } = catalog[index];
      profile.collection = (profile.collection || []).map(media => media.id === id ? { ...media, ...collectionMedia, user_status: media.user_status, user_rating: media.user_rating, user_game_time: media.user_game_time || '', user_chapters_read: media.user_chapters_read || '0', user_review: media.user_review || '' } : media);
      localStorage.setItem(key, JSON.stringify(profile));
    });
    return catalog[index];
  },

  async deleteGlobalMedia(id) {
    const catalog = await this.getGlobalCatalog();
    const nextCatalog = catalog.filter(media => media.id !== id);
    if (nextCatalog.length === catalog.length) throw new Error('Mídia não encontrada.');
    localStorage.setItem(CATALOG_KEY, JSON.stringify(nextCatalog));
    Object.keys(localStorage).filter(key => key.startsWith('user_profile_')).forEach(key => {
      const profile = JSON.parse(localStorage.getItem(key));
      profile.collection = (profile.collection || []).filter(media => media.id !== id);
      profile.favorites = (profile.favorites || []).filter(favoriteId => favoriteId !== id);
      localStorage.setItem(key, JSON.stringify(profile));
    });
  },

  async getUserData(userKey) {
    const data = localStorage.getItem(`user_profile_${userKey}`);
    if (!data) return { collection: [], favorites: [], avatar: '', username: '', bio: '', themeMode: 'dark', accentColor: '#d0bcff' };
    const profile = JSON.parse(data);
    profile.collection = (profile.collection || []).filter(media => media.type !== 'musicas');
    const statuses = { livros: ['Lista de desejo', 'Postergado', 'Descartado', 'Lendo', 'Lido'], jogos: ['Lista de desejo', 'Postergado', 'Descartado', 'Jogando', 'Zerado', 'Platinado'], filmes: ['Lista de desejo', 'Postergado', 'Descartado', 'Assistido'] };
    profile.collection.forEach(media => { delete media.user_time; if (!statuses[media.type]?.includes(media.user_status)) media.user_status = statuses[media.type]?.[0] || ''; });
    profile.favorites = (profile.favorites || []).filter(id => profile.collection.some(media => media.id === id));
    profile.bio ||= '';
    return profile;
  },

  async saveUserData(userKey, profile) { localStorage.setItem(`user_profile_${userKey}`, JSON.stringify(profile)); }
};

const AuthService = {
  async getUsers() {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) return JSON.parse(stored);
    // Conta de demonstração com permissão administrativa.
    const users = [{ email: 'admin@catalloged.app', username: 'Administrador', token: makeToken('admin@catalloged.app'), isAdmin: true, passwordHash: await hashPassword('admin123') }];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users;
  },

  async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const users = await this.getUsers();
    const passwordHash = await hashPassword(password);
    const existing = users.find(user => user.email === normalizedEmail);
    if (!existing) throw new Error('Conta não encontrada. Crie uma conta para continuar.');
    if (existing.passwordHash !== passwordHash) throw new Error('Senha incorreta. Confira a senha e tente novamente.');
    return { email: existing.email, username: existing.username, token: existing.token, isAdmin: existing.isAdmin };
  },

  async register({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const users = await this.getUsers();
    if (users.some(user => user.email === normalizedEmail)) throw new Error('Já existe uma conta com este e-mail. Faça login.');
    const passwordHash = await hashPassword(password);
    const user = { email: normalizedEmail, username: normalizedEmail.split('@')[0], token: makeToken(normalizedEmail), isAdmin: false, passwordHash };
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { email: user.email, username: user.username, token: user.token, isAdmin: false };
  },

  async updateUsername(token, username) {
    const users = await this.getUsers();
    const user = users.find(item => item.token === token);
    if (user) { user.username = username; localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
  }
};

class App {
  constructor() { this.user = null; this.currentRoute = 'all'; this.mediaBeingEdited = null; this.pendingAvatar = ''; this.catalogGenre = 'all'; this.collectionType = 'all'; this.collectionGenre = 'all'; this.collectionIds = new Set(); this.init(); }

  init() { this.cacheElements(); this.bindEvents(); this.setupRouter(); this.checkSession(); }

  cacheElements() {
    this.gridGlobal = document.getElementById('global-catalog-grid');
    this.gridMyCollection = document.getElementById('my-collection-grid');
    this.gridFavorites = document.getElementById('favorites-grid');
    this.authWidget = document.getElementById('auth-widget-container');
    this.statusIndicator = document.getElementById('query-status-indicator');
    this.views = { catalog: document.getElementById('view-catalog'), collection: document.getElementById('view-my-collection'), profile: document.getElementById('view-config-perfil'), detail: document.getElementById('view-media-detail') };
    this.mediaTypeSelect = document.getElementById('media-type-select');
    this.dynamicFields = document.getElementById('dynamic-fields-container');
  }

  bindEvents() {
    this.mediaTypeSelect.addEventListener('change', () => this.renderFields());
    document.getElementById('btn-open-create-media').addEventListener('click', () => this.openMediaModal());
    document.getElementById('btn-close-create').addEventListener('click', () => this.closeMediaModal());
    document.getElementById('btn-close-auth').addEventListener('click', () => this.closeAuthModal());
    document.getElementById('create-media-form').addEventListener('submit', event => this.handleCreateOrEditMedia(event));
    document.getElementById('login-form').addEventListener('submit', event => this.handleLogin(event));
    document.getElementById('register-form').addEventListener('submit', event => this.handleRegister(event));
    document.getElementById('btn-show-register').addEventListener('click', () => this.showAuthScreen('register'));
    document.querySelectorAll('.btn-show-login').forEach(button => button.addEventListener('click', () => this.showAuthScreen('login')));
    document.getElementById('media-poster').addEventListener('change', event => this.showSelectedFile(event, 'media-poster-name'));
    document.getElementById('catalog-genre-filter').addEventListener('change', event => { this.catalogGenre = event.target.value; this.fetchGlobalCatalog(this.currentRoute); });
    document.getElementById('collection-type-filter').addEventListener('change', event => { this.collectionType = event.target.value; this.collectionGenre = 'all'; this.fetchUserCollectionPage(); });
    document.getElementById('collection-genre-filter').addEventListener('change', event => { this.collectionGenre = event.target.value; this.fetchUserCollectionPage(); });
    document.getElementById('input-avatar-file').addEventListener('change', event => this.prepareAvatar(event));
    document.getElementById('btn-save-profile').addEventListener('click', () => this.saveProfile());
    document.getElementById('btn-logout').addEventListener('click', () => this.logout());
    document.getElementById('select-theme-mode').addEventListener('change', event => this.updateThemeStyle('mode', event.target.value));
    document.getElementById('select-theme-accent').addEventListener('change', event => this.updateThemeStyle('accent', event.target.value));
    document.getElementById('btn-back-to-catalog').addEventListener('click', () => { window.location.hash = '#/'; });

    this.gridGlobal.addEventListener('click', event => this.handleMediaAction(event));
    this.gridGlobal.addEventListener('keydown', event => this.handleCardKeyboard(event));
    this.gridMyCollection.addEventListener('click', event => this.handleMediaAction(event));
    this.gridMyCollection.addEventListener('keydown', event => this.handleCardKeyboard(event));
    this.gridMyCollection.addEventListener('change', event => { if (event.target.classList.contains('md3-inline-input')) this.updateProgress(event.target); });
    this.gridMyCollection.addEventListener('pointermove', event => this.previewRating(event));
    this.gridMyCollection.addEventListener('pointerout', event => this.resetRatingPreview(event));
    this.gridFavorites.addEventListener('click', event => this.handleMediaAction(event));
    document.getElementById('profile-favorites-grid').addEventListener('click', event => this.handleMediaAction(event));
    document.getElementById('favorite-form').addEventListener('submit', event => this.addFavorite(event));
    document.getElementById('media-detail-content').addEventListener('click', event => this.handleMediaAction(event));
    document.getElementById('media-detail-content').addEventListener('change', event => { if (event.target.matches('.gallery-upload')) this.addGalleryImage(event); });
  }

  checkSession() {
    const session = localStorage.getItem(SESSION_KEY) || localStorage.getItem('active_session_v2');
    if (session) this.user = JSON.parse(session);
    if (this.user) this.applyUserTheme().then(() => this.syncAuthUI());
    else this.syncAuthUI();
  }

  async handleLogin(event) {
    event.preventDefault();
    const error = document.getElementById('login-form-error');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    error.classList.add('hidden');
    if (!email || !password) return this.showFormError(error, 'Preencha e-mail e senha para continuar.');
    try {
      await runMutation(() => AuthService.login({ email, password }), {
        onSuccess: async user => {
          this.user = user;
          localStorage.setItem(SESSION_KEY, JSON.stringify(user));
          const profile = await CloudJSONStore.getUserData(user.token);
          if (!profile.username) { profile.username = user.username; await CloudJSONStore.saveUserData(user.token, profile); }
          this.closeAuthModal();
          await this.applyUserTheme();
          this.syncAuthUI();
        },
        onError: authError => this.showFormError(error, authError.message || 'Não foi possível entrar.')
      });
    } catch { /* A mensagem já foi apresentada sem tocar na sessão. */ }
  }

  async handleRegister(event) {
    event.preventDefault();
    const error = document.getElementById('register-form-error');
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    error.classList.add('hidden');
    if (!email || !password) return this.showFormError(error, 'Preencha e-mail e senha para criar sua conta.');
    try {
      await runMutation(() => AuthService.register({ email, password }), {
        onSuccess: user => {
          this.showAuthScreen('login');
          document.getElementById('login-email').value = user.email;
          this.showToast('Conta criada. Agora faça login para continuar.');
        },
        onError: authError => this.showFormError(error, authError.message || 'Não foi possível criar a conta.')
      });
    } catch { /* O feedback permanece no formulário de cadastro. */ }
  }

  setupRouter() {
    const routeHandler = async () => {
      const path = (window.location.hash || '#/').slice(2) || 'all';
      this.currentRoute = path;
      Object.values(this.views).forEach(view => view.classList.add('hidden'));
      if (['perfil/colecao', 'perfil/editar'].includes(path) && !this.user) {
        this.showError('Entre na sua conta para acessar esta página.');
        window.location.hash = '#/';
        return;
      }
      if (path === 'perfil/colecao') { this.views.collection.classList.remove('hidden'); await this.fetchUserCollectionPage(); }
      else if (path === 'perfil/editar') { this.views.profile.classList.remove('hidden'); await this.applyUserTheme(); }
      else if (path.startsWith('midia/')) { this.views.detail.classList.remove('hidden'); await this.fetchMediaDetail(path.slice('midia/'.length)); }
      else { this.views.catalog.classList.remove('hidden'); await this.fetchGlobalCatalog(path); }
      document.querySelectorAll('.md3-tab-link').forEach(link => link.classList.toggle('active', link.dataset.route === path || (path === 'all' && link.dataset.route === 'all')));
    };
    window.addEventListener('hashchange', routeHandler);
    window.addEventListener('load', routeHandler);
  }

  async applyUserTheme() {
    if (!this.user) return;
    const profile = await CloudJSONStore.getUserData(this.user.token);
    const light = profile.themeMode === 'light';
    document.documentElement.style.setProperty('--md-sys-color-surface', light ? '#fef7ff' : '#141218');
    document.documentElement.style.setProperty('--md-sys-color-surface-container', light ? '#f3edf7' : '#211f26');
    document.documentElement.style.setProperty('--md-sys-color-on-surface', light ? '#1d1b20' : '#e6e1e5');
    document.documentElement.style.setProperty('--md-sys-color-primary', profile.accentColor || '#d0bcff');
    document.getElementById('profile-avatar-preview').src = profile.avatar || DEFAULT_AVATAR;
    document.getElementById('input-username').value = profile.username || this.user.username || '';
    document.getElementById('input-profile-bio').value = profile.bio || '';
    document.getElementById('select-theme-mode').value = profile.themeMode || 'dark';
    document.getElementById('select-theme-accent').value = profile.accentColor || '#d0bcff';
    await this.renderProfileFavorites(profile);
  }

  async prepareAvatar(event) {
    const [file] = event.target.files;
    if (!file) return;
    try {
      this.pendingAvatar = await this.readImageFile(file);
      document.getElementById('profile-avatar-preview').src = this.pendingAvatar;
      document.getElementById('avatar-file-name').textContent = file.name;
    } catch (error) { this.showError(error.message); event.target.value = ''; }
  }

  async saveProfile() {
    if (!this.user) return;
    const username = document.getElementById('input-username').value.trim();
    const bio = document.getElementById('input-profile-bio').value.trim();
    if (!username) return this.showError('Informe um nome de usuário.');
    await runMutation(async () => {
      const profile = await CloudJSONStore.getUserData(this.user.token);
      profile.username = username;
      profile.bio = bio;
      if (this.pendingAvatar) profile.avatar = this.pendingAvatar;
      await CloudJSONStore.saveUserData(this.user.token, profile);
      await AuthService.updateUsername(this.user.token, username);
      this.user.username = username;
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.user));
    }, { onSuccess: async () => { this.pendingAvatar = ''; await this.applyUserTheme(); this.syncAuthUI(); } });
  }

  async updateThemeStyle(type, value) {
    if (!this.user) return;
    const profile = await CloudJSONStore.getUserData(this.user.token);
    if (type === 'mode') profile.themeMode = value;
    if (type === 'accent') profile.accentColor = value;
    await CloudJSONStore.saveUserData(this.user.token, profile);
    await this.applyUserTheme();
  }

  async fetchGlobalCatalog(route = this.currentRoute) {
    const allowedRoutes = ['all', 'filmes', 'livros', 'jogos'];
    const filter = allowedRoutes.includes(route) ? route : 'all';
    if (this.user) {
      const profile = await CloudJSONStore.getUserData(this.user.token);
      this.collectionIds = new Set((profile.collection || []).map(media => media.id));
    } else this.collectionIds = new Set();
    document.getElementById('catalog-title').textContent = filter === 'all' ? 'Feed global de mídias' : `Mídias: ${filter[0].toUpperCase()}${filter.slice(1)}`;
    await runQuery(['catalog'], () => CloudJSONStore.getGlobalCatalog(), state => {
      this.statusIndicator.textContent = state.isLoading || state.isFetching ? 'Sincronizando…' : state.isError ? 'Falha ao sincronizar' : 'Sincronizado';
      if (state.data) {
        this.renderCatalogGenreFilter(state.data, filter);
        this.renderCatalog(state.data.filter(media => (filter === 'all' || media.type === filter) && (this.catalogGenre === 'all' || media.meta_data?.genre === this.catalogGenre)));
      }
    }).catch(() => this.showError('Não foi possível carregar o catálogo.'));
  }

  renderCatalogGenreFilter(catalog, type) {
    const select = document.getElementById('catalog-genre-filter');
    const genres = [...new Set(catalog.filter(media => media.type === type).map(media => media.meta_data?.genre).filter(Boolean))];
    if (!genres.length) { this.catalogGenre = 'all'; select.classList.add('hidden'); return; }
    if (!genres.includes(this.catalogGenre)) this.catalogGenre = 'all';
    select.innerHTML = `<option value="all">Todos os gêneros</option>${genres.map(genre => `<option value="${escapeHTML(genre)}">${escapeHTML(genre)}</option>`).join('')}`;
    select.value = this.catalogGenre;
    select.classList.remove('hidden');
  }

  renderCatalog(mediaList) {
    this.gridGlobal.innerHTML = mediaList.length ? mediaList.map(media => this.mediaCard(media)).join('') : '<p class="empty-state">Nenhuma mídia encontrada nesta categoria.</p>';
  }

  mediaCard(media, collection = false) {
    const adminActions = this.user?.isAdmin ? `<div class="admin-card-actions"><button class="icon-action btn-edit-media" type="button" data-id="${escapeHTML(media.id)}" aria-label="Editar ${escapeHTML(media.title)}"><span class="material-symbols-outlined">edit</span></button><button class="icon-action danger btn-delete-media" type="button" data-id="${escapeHTML(media.id)}" aria-label="Excluir ${escapeHTML(media.title)}"><span class="material-symbols-outlined">delete</span></button></div>` : '';
    const rating = Number(media.user_rating || 0);
    const stars = [1, 2, 3, 4, 5].map(value => {
      const fill = Math.max(0, Math.min(1, rating - (value - 1))) * 100;
      return `<button type="button" class="rating-star" style="--star-fill:${fill}%" data-id="${escapeHTML(media.id)}" data-rating="${value}" aria-label="Avaliar entre ${value - 0.5} e ${value} estrelas" aria-pressed="${fill > 0}"><span aria-hidden="true">★</span></button>`;
    }).join('');
    const statuses = this.getStatusOptions(media.type);
    const statusControl = `<label>Status<select data-id="${escapeHTML(media.id)}" data-field="user_status" class="md3-inline-input">${statuses.map(status => `<option value="${status}" ${media.user_status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label>`;
    const chaptersControl = media.type === 'livros' && media.user_status === 'Lendo' ? `<label>Capítulos lidos<input type="number" min="0" step="1" data-id="${escapeHTML(media.id)}" data-field="user_chapters_read" value="${escapeHTML(media.user_chapters_read || '0')}" class="md3-inline-input" /></label>` : '';
    const gameTimeControl = media.type === 'jogos' ? `<label>Tempo de jogo<input type="text" data-id="${escapeHTML(media.id)}" data-field="user_game_time" value="${escapeHTML(media.user_game_time || '')}" placeholder="Ex.: 12h" class="md3-inline-input" /></label>` : '';
    const inCollection = this.collectionIds.has(media.id);
    const collectionContent = collection ? `<div class="collection-controls"><div class="collection-main-fields">${statusControl}${chaptersControl}${gameTimeControl}</div><div class="rating-field"><span>Sua avaliação: ${rating ? rating.toFixed(1).replace('.0', '') : 'não avaliada'}</span><div class="star-rating" data-current-rating="${rating}" role="group" aria-label="Sua avaliação. Clique no lado esquerdo para meia estrela e no lado direito para uma estrela inteira.">${stars}</div></div><label class="review-field">Review<textarea data-id="${escapeHTML(media.id)}" data-field="user_review" class="md3-inline-input collection-review" rows="3" maxlength="1200" placeholder="Escreva uma breve review…">${escapeHTML(media.user_review || '')}</textarea></label></div>` : `<div class="md3-card-actions"><button class="md3-btn ${inCollection ? 'md3-btn-outlined btn-remove-from-list' : 'md3-btn-filled btn-add-to-list'}" type="button" data-id="${escapeHTML(media.id)}">${inCollection ? 'Remover da minha lista' : 'Adicionar à minha lista'}</button></div>`;
    return `<article class="md3-media-card media-card-clickable" data-media-id="${escapeHTML(media.id)}" tabindex="0" role="link" aria-label="Ver detalhes de ${escapeHTML(media.title)}"><div class="md3-card-poster-wrapper"><img src="${escapeHTML(media.poster)}" class="md3-card-poster" alt="Capa de ${escapeHTML(media.title)}" /></div><div class="md3-card-body"><div class="card-heading"><span class="media-type">${escapeHTML(media.type)}</span>${adminActions}</div><h3 class="md3-card-title">${escapeHTML(media.title)}</h3>${collectionContent}</div></article>`;
  }

  getStatusOptions(type) {
    const options = {
      livros: ['Lista de desejo', 'Postergado', 'Descartado', 'Lendo', 'Lido'],
      jogos: ['Lista de desejo', 'Postergado', 'Descartado', 'Jogando', 'Zerado', 'Platinado'],
      filmes: ['Lista de desejo', 'Postergado', 'Descartado', 'Assistido']
    };
    return options[type] || [];
  }

  async fetchUserCollectionPage() {
    if (!this.user) return;
    await runQuery(['user-collection', this.user.token], async () => await CloudJSONStore.getUserData(this.user.token), state => {
      if (state.data) {
        const collection = state.data.collection || [];
        this.collectionIds = new Set(collection.map(media => media.id));
        this.renderCollectionGenreFilter(collection);
        const filteredCollection = collection.filter(media => (this.collectionType === 'all' || media.type === this.collectionType) && (this.collectionGenre === 'all' || media.meta_data?.genre === this.collectionGenre));
        this.gridMyCollection.innerHTML = filteredCollection.length ? filteredCollection.map(media => this.mediaCard(media, true)).join('') : '<p class="empty-state">Nenhuma mídia encontrada com estes filtros.</p>';
        this.renderFavorites(state.data);
      }
    });
  }

  renderFavorites(profile) {
    const collection = profile.collection || [];
    const favorites = collection.filter(media => (profile.favorites || []).includes(media.id));
    this.gridFavorites.innerHTML = favorites.length ? favorites.map(media => `<article class="favorite-card" data-media-id="${escapeHTML(media.id)}"><img src="${escapeHTML(media.poster)}" alt="Capa de ${escapeHTML(media.title)}"><div><h4>${escapeHTML(media.title)}</h4></div></article>`).join('') : '<p class="favorites-empty">Nenhum favorito selecionado ainda.</p>';
  }

  renderCollectionGenreFilter(collection) {
    const select = document.getElementById('collection-genre-filter');
    const types = this.collectionType === 'all' ? ['filmes', 'livros', 'jogos'] : [this.collectionType];
    const genres = [...new Set(collection.filter(media => types.includes(media.type)).map(media => media.meta_data?.genre).filter(Boolean))];
    if (!genres.includes(this.collectionGenre)) this.collectionGenre = 'all';
    select.innerHTML = `<option value="all">Todos os gêneros</option>${genres.map(genre => `<option value="${escapeHTML(genre)}">${escapeHTML(genre)}</option>`).join('')}`;
    select.value = this.collectionGenre;
  }

  async addFavorite(event) {
    event.preventDefault();
    if (!this.user) return;
    const id = document.getElementById('favorite-select').value;
    if (!id) return this.showError('Escolha uma mídia para adicionar aos favoritos.');
    const profile = await CloudJSONStore.getUserData(this.user.token);
    profile.favorites ||= [];
    if (profile.favorites.length >= 5) return this.showError('Você pode ter no máximo cinco favoritos.');
    if (!profile.favorites.includes(id)) profile.favorites.push(id);
    await CloudJSONStore.saveUserData(this.user.token, profile);
    invalidateQuery(['user-collection', this.user.token]);
    if (this.currentRoute === 'perfil/editar') await this.renderProfileFavorites(profile);
    else await this.fetchUserCollectionPage();
  }

  async removeFavorite(id) {
    if (!this.user) return;
    const profile = await CloudJSONStore.getUserData(this.user.token);
    profile.favorites = (profile.favorites || []).filter(favoriteId => favoriteId !== id);
    await CloudJSONStore.saveUserData(this.user.token, profile);
    invalidateQuery(['user-collection', this.user.token]);
    if (this.currentRoute === 'perfil/editar') await this.renderProfileFavorites(profile);
    else await this.fetchUserCollectionPage();
  }

  async renderProfileFavorites(profile) {
    const favorites = (profile.collection || []).filter(media => (profile.favorites || []).includes(media.id));
    const available = (profile.collection || []).filter(media => !(profile.favorites || []).includes(media.id));
    const target = document.getElementById('profile-favorites-grid');
    const select = document.getElementById('favorite-select');
    const submit = document.querySelector('#favorite-form button');
    select.innerHTML = available.length ? `<option value="">Escolha uma mídia da sua coleção</option>${available.map(media => `<option value="${escapeHTML(media.id)}">${escapeHTML(media.title)}</option>`).join('')}` : '<option value="">Nenhuma mídia disponível</option>';
    select.disabled = favorites.length >= 5 || !available.length;
    submit.disabled = favorites.length >= 5 || !available.length;
    document.getElementById('favorites-limit-hint').classList.toggle('hidden', favorites.length >= 5);
    target.innerHTML = favorites.length ? favorites.map(media => `<article class="profile-favorite-item" data-media-id="${escapeHTML(media.id)}"><img src="${escapeHTML(media.poster)}" alt="Capa de ${escapeHTML(media.title)}"><button type="button" class="favorite-remove btn-remove-favorite" data-id="${escapeHTML(media.id)}" aria-label="Remover ${escapeHTML(media.title)} dos favoritos">×</button><span>${escapeHTML(media.title)}</span></article>`).join('') : '<p class="favorites-empty">Seus favoritos aparecerão aqui.</p>';
  }

  async fetchMediaDetail(id) {
    if (this.user) {
      const profile = await CloudJSONStore.getUserData(this.user.token);
      this.collectionIds = new Set((profile.collection || []).map(media => media.id));
    }
    await runQuery(['media', id], async () => (await CloudJSONStore.getGlobalCatalog()).find(media => media.id === id), state => {
      const target = document.getElementById('media-detail-content');
      if (!state.data && !state.isLoading) { target.innerHTML = '<p class="empty-state">Esta mídia não existe mais.</p>'; return; }
      if (!state.data) return;
      const media = state.data;
      const metadataLabels = { genre: 'Gênero', director: 'Diretor', author: 'Autor', pages: 'Páginas', console: 'Console', release_year: 'Ano de lançamento' };
      const metadataEntries = [...Object.entries(media.meta_data || {}), ...(media.release_year ? [['release_year', media.release_year]] : [])];
      const metadata = metadataEntries.map(([key, value]) => `<div><dt>${escapeHTML(metadataLabels[key] || key)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('');
      const controls = this.user?.isAdmin ? `<div class="detail-controls"><button type="button" class="md3-btn md3-btn-outlined btn-edit-media" data-id="${escapeHTML(media.id)}">Editar mídia</button><button type="button" class="md3-btn md3-btn-danger btn-delete-media" data-id="${escapeHTML(media.id)}">Excluir definitivamente</button></div>` : '';
      const description = media.description ? escapeHTML(media.description).replace(/\n/g, '<br>') : 'Nenhuma descrição foi adicionada para esta mídia.';
      const galleryImages = [media.poster, ...(media.gallery || [])];
      const galleryControls = this.user?.isAdmin ? `<label class="md3-btn md3-btn-outlined" for="gallery-upload-${escapeHTML(media.id)}"><span class="material-symbols-outlined">add_photo_alternate</span> Adicionar imagem</label><input id="gallery-upload-${escapeHTML(media.id)}" class="gallery-upload visually-hidden" data-id="${escapeHTML(media.id)}" type="file" accept="image/*" multiple>` : '';
      const inCollection = this.collectionIds.has(media.id);
      const listAction = `<button type="button" class="md3-btn ${inCollection ? 'md3-btn-outlined btn-remove-from-list' : 'md3-btn-filled btn-add-to-list'}" data-id="${escapeHTML(media.id)}">${inCollection ? 'Remover da minha lista' : 'Adicionar à minha lista'}</button>`;
      target.innerHTML = `<article class="media-detail"><img src="${escapeHTML(media.poster)}" alt="Capa de ${escapeHTML(media.title)}" /><div><p class="eyebrow">${escapeHTML(media.type)}</p><h1 class="md3-headline">${escapeHTML(media.title)}</h1><dl class="metadata-list">${metadata || '<div><dd>Sem informações adicionais.</dd></div>'}</dl><section class="media-description"><h2>Descrição</h2><p>${description}</p></section>${listAction}${controls}</div></article><section class="media-gallery"><div class="gallery-heading"><div><p class="eyebrow">GALERIA</p><h2>Imagens da mídia</h2></div>${galleryControls}</div><div class="gallery-grid">${galleryImages.map((image, index) => `<img src="${escapeHTML(image)}" alt="Imagem ${index + 1} de ${escapeHTML(media.title)}">`).join('')}</div></section>`;
    }).catch(() => this.showError('Não foi possível carregar os detalhes da mídia.'));
  }

  handleCardKeyboard(event) { if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('button, input, select, textarea')) { event.preventDefault(); this.openMediaDetails(event.target.closest('[data-media-id]')?.dataset.mediaId); } }

  async handleMediaAction(event) {
    const add = event.target.closest('.btn-add-to-list');
    const edit = event.target.closest('.btn-edit-media');
    const remove = event.target.closest('.btn-delete-media');
    const removeFromList = event.target.closest('.btn-remove-from-list');
    const removeFavorite = event.target.closest('.btn-remove-favorite');
    const rating = event.target.closest('.rating-star');
    const card = event.target.closest('[data-media-id]');
    if (add) { event.stopPropagation(); return this.addMediaToUserList(add.dataset.id); }
    if (edit) { event.stopPropagation(); return this.openEditMedia(edit.dataset.id); }
    if (remove) { event.stopPropagation(); return this.deleteMedia(remove.dataset.id); }
    if (removeFromList) { event.stopPropagation(); return this.removeMediaFromUserList(removeFromList.dataset.id); }
    if (removeFavorite) { event.stopPropagation(); return this.removeFavorite(removeFavorite.dataset.id); }
    if (rating) {
      event.stopPropagation();
      const value = Number(rating.dataset.rating);
      const bounds = rating.getBoundingClientRect();
      const selected = event.detail === 0 || event.clientX >= bounds.left + bounds.width / 2 ? value : value - 0.5;
      return this.updateRating(rating.dataset.id, selected);
    }
    if (card && !event.target.closest('input, select, textarea, label')) this.openMediaDetails(card.dataset.mediaId);
  }

  openMediaDetails(id) { if (id) window.location.hash = `#/midia/${encodeURIComponent(id)}`; }

  async addGalleryImage(event) {
    if (!this.user?.isAdmin) return;
    const files = [...event.target.files];
    if (!files.length) return;
    try {
      const images = await Promise.all(files.map(file => this.readImageFile(file)));
      const id = event.target.dataset.id;
      await runMutation(async () => {
        const media = (await CloudJSONStore.getGlobalCatalog()).find(item => item.id === id);
        if (!media) throw new Error('Mídia não encontrada.');
        return CloudJSONStore.updateGlobalMedia(id, { gallery: [...(media.gallery || []), ...images] });
      }, { onSuccess: async () => { invalidateQuery(['catalog']); invalidateQuery(['media', id]); await this.fetchMediaDetail(id); this.showToast('Imagens adicionadas à galeria.'); } });
    } catch (error) { this.showError(error.message || 'Não foi possível adicionar as imagens.'); }
  }

  async addMediaToUserList(mediaId) {
    if (!this.user) { this.showAuthScreen('login'); return; }
    await runMutation(async () => {
      const catalog = await CloudJSONStore.getGlobalCatalog();
      const item = catalog.find(media => media.id === mediaId);
      if (!item) throw new Error('Esta mídia não está mais disponível.');
      const profile = await CloudJSONStore.getUserData(this.user.token);
      if (!profile.collection.some(media => media.id === mediaId)) {
        const { description, ...collectionItem } = item;
        profile.collection.push({ ...collectionItem, user_status: this.getStatusOptions(item.type)[0], user_rating: '0', user_game_time: '', user_chapters_read: '0', user_review: '' });
        await CloudJSONStore.saveUserData(this.user.token, profile);
        return item;
      }
      return null;
    }, { onSuccess: async item => {
      invalidateQuery(['user-collection', this.user.token]);
      if (item) {
        this.collectionIds.add(item.id);
        this.showToast(`${item.title} adicionado ao seu catálogo.`);
        await this.refreshCurrentView();
      }
    }, onError: error => this.showError(error.message) });
  }

  async removeMediaFromUserList(mediaId) {
    if (!this.user) return;
    const profile = await CloudJSONStore.getUserData(this.user.token);
    const item = profile.collection.find(media => media.id === mediaId);
    if (!item) return;
    profile.collection = profile.collection.filter(media => media.id !== mediaId);
    profile.favorites = (profile.favorites || []).filter(id => id !== mediaId);
    await CloudJSONStore.saveUserData(this.user.token, profile);
    this.collectionIds.delete(mediaId);
    invalidateQuery(['user-collection', this.user.token]);
    this.showToast(`${item.title} removido da sua lista.`);
    await this.refreshCurrentView();
  }

  async updateProgress(target) {
    if (!this.user) return;
    const profile = await CloudJSONStore.getUserData(this.user.token);
    const item = profile.collection.find(media => media.id === target.dataset.id);
    if (item) {
      item[target.dataset.field] = target.value;
      await CloudJSONStore.saveUserData(this.user.token, profile);
      invalidateQuery(['user-collection', this.user.token]);
      if (target.dataset.field === 'user_status') await this.fetchUserCollectionPage();
    }
  }

  async updateRating(mediaId, rating) {
    if (!this.user) return;
    const profile = await CloudJSONStore.getUserData(this.user.token);
    const item = profile.collection.find(media => media.id === mediaId);
    if (!item) return;
    item.user_rating = String(Math.max(0.5, Math.min(5, Math.round(rating * 2) / 2)));
    await CloudJSONStore.saveUserData(this.user.token, profile);
    invalidateQuery(['user-collection', this.user.token]);
    await this.fetchUserCollectionPage();
  }

  previewRating(event) {
    const star = event.target.closest('.rating-star');
    if (!star) return;
    const bounds = star.getBoundingClientRect();
    const value = Number(star.dataset.rating) - (event.clientX < bounds.left + bounds.width / 2 ? 0.5 : 0);
    this.paintRating(star.closest('.star-rating'), value);
  }

  resetRatingPreview(event) {
    const previous = event.target.closest('.rating-star');
    if (!previous || previous.parentElement.contains(event.relatedTarget)) return;
    const container = previous.closest('.star-rating');
    this.paintRating(container, Number(container.dataset.currentRating || 0));
  }

  paintRating(container, rating) {
    if (!container) return;
    container.querySelectorAll('.rating-star').forEach(star => {
      const value = Number(star.dataset.rating);
      const fill = Math.max(0, Math.min(1, rating - (value - 1))) * 100;
      star.style.setProperty('--star-fill', `${fill}%`);
    });
  }

  renderFields(media = null) {
    const type = this.mediaTypeSelect.value;
    const data = media?.meta_data || {};
    const select = (id, label, options, selected = '') => `<label class="field-label" for="${id}">${label}</label><select id="${id}" required class="md3-select-input"><option value="" disabled ${selected ? '' : 'selected'}>Selecione uma opção</option>${options.map(option => `<option value="${option}" ${option === selected ? 'selected' : ''}>${option}</option>`).join('')}</select>`;
    const text = (id, label, value = '', inputType = 'text') => `<div class="md3-text-field"><input type="${inputType}" id="${id}" required placeholder=" " value="${escapeHTML(value)}" ${inputType === 'number' ? 'min="1" step="1"' : ''}/><label for="${id}">${label}</label></div>`;
    const catalog = {
      filmes: { personId: 'media-director', personLabel: 'Diretor', personKey: 'director', genres: ['Ação', 'Horror', 'Romance', 'Mistério', 'Drama', 'Ficção científica'] },
      livros: { personId: 'media-author', personLabel: 'Autor', personKey: 'author', genres: ['Ação', 'Horror', 'Romance', 'Mistério', 'Aventura', 'Fantasia'] }
    };
    if (type === 'jogos') {
      this.dynamicFields.innerHTML = `${select('media-console', 'Console', ['Playstation', 'Nintendo', 'Xbox', 'PC'], data.console)}${select('media-genre', 'Gênero', ['Ação', 'Aventura', 'RPG', 'Terror', 'Visual Novel', 'Corrida'], data.genre)}`;
      return;
    }
    const config = catalog[type];
    const pages = type === 'livros' ? text('media-pages', 'Quantidade de páginas', data.pages || '', 'number') : '';
    this.dynamicFields.innerHTML = config ? `${text(config.personId, config.personLabel, data[config.personKey])}${pages}${select('media-genre', 'Gênero', config.genres, data.genre)}` : '';
  }

  openMediaModal(media = null) {
    this.mediaBeingEdited = media;
    const form = document.getElementById('create-media-form');
    form.reset();
    document.getElementById('media-form-error').classList.add('hidden');
    document.getElementById('media-modal-title').textContent = media ? 'Editar mídia' : 'Adicionar nova mídia';
    form.querySelector('[type="submit"]').textContent = media ? 'Salvar alterações' : 'Publicar';
    document.getElementById('media-poster').required = !media;
    document.getElementById('media-poster-name').textContent = media ? 'Escolha um arquivo apenas se quiser trocar a imagem.' : 'Nenhum arquivo selecionado.';
    document.getElementById('media-poster-preview').src = media?.poster || '';
    document.getElementById('media-release-year').value = media?.release_year || '';
    document.getElementById('media-description').value = media?.description || '';
    if (media) { document.getElementById('media-title').value = media.title; this.mediaTypeSelect.value = media.type; this.renderFields(media); }
    else { this.dynamicFields.innerHTML = ''; }
    document.getElementById('create-media-modal').classList.remove('hidden');
  }

  closeMediaModal() { document.getElementById('create-media-modal').classList.add('hidden'); this.mediaBeingEdited = null; }
  showAuthScreen(screen) {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('auth-login-screen').classList.toggle('hidden', screen !== 'login');
    document.getElementById('auth-register-screen').classList.toggle('hidden', screen !== 'register');
    document.getElementById('login-form-error').classList.add('hidden');
    document.getElementById('register-form-error').classList.add('hidden');
  }

  closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('login-form-error').classList.add('hidden');
    document.getElementById('register-form-error').classList.add('hidden');
  }
  showSelectedFile(event, labelId) {
    const [file] = event.target.files;
    document.getElementById(labelId).textContent = file ? file.name : 'Nenhum arquivo selecionado.';
    if (file?.type.startsWith('image/')) document.getElementById('media-poster-preview').src = URL.createObjectURL(file);
  }

  async openEditMedia(id) {
    if (!this.user?.isAdmin) return this.showError('Apenas administradores podem editar mídias.');
    const media = (await CloudJSONStore.getGlobalCatalog()).find(item => item.id === id);
    if (media) this.openMediaModal(media);
  }

  async handleCreateOrEditMedia(event) {
    event.preventDefault();
    if (!this.user) return;
    const error = document.getElementById('media-form-error');
    const title = document.getElementById('media-title').value.trim();
    const type = this.mediaTypeSelect.value;
    const releaseYear = document.getElementById('media-release-year').value;
    const description = document.getElementById('media-description').value.trim();
    const file = document.getElementById('media-poster').files[0];
    error.classList.add('hidden');
    try {
      const poster = file ? await this.readImageFile(file) : this.mediaBeingEdited?.poster;
      if (!poster) throw new Error('Escolha uma imagem para a mídia.');
      const genre = document.getElementById('media-genre')?.value;
      const metaDataByType = {
        filmes: { director: document.getElementById('media-director')?.value.trim(), genre },
        livros: { author: document.getElementById('media-author')?.value.trim(), pages: document.getElementById('media-pages')?.value, genre },
        jogos: { console: document.getElementById('media-console')?.value, genre }
      };
      const metaData = metaDataByType[type];
      if (!metaData || Object.values(metaData).some(value => !value)) throw new Error('Preencha todos os campos específicos desta mídia.');
      if (description.split(/\r?\n/).length > 500) throw new Error('A descrição pode ter no máximo 500 linhas.');
      await runMutation(() => this.mediaBeingEdited ? CloudJSONStore.updateGlobalMedia(this.mediaBeingEdited.id, { title, type, poster, release_year: releaseYear, description, meta_data: metaData }) : CloudJSONStore.addGlobalMedia({ title, type, poster, release_year: releaseYear, description, meta_data: metaData }), {
        onSuccess: async media => {
          invalidateQuery(['catalog']);
          invalidateQuery(['media']);
          invalidateQuery(['user-collection']);
          this.closeMediaModal();
          if (this.currentRoute.startsWith('midia/')) window.location.hash = `#/midia/${media.id}`;
          else await this.refreshCurrentView();
        }
      });
    } catch (creationError) { this.showFormError(error, creationError.message || 'Não foi possível salvar a mídia.'); }
  }

  async deleteMedia(id) {
    if (!this.user?.isAdmin) return this.showError('Apenas administradores podem excluir mídias.');
    if (!window.confirm('Excluir esta mídia definitivamente? Ela também sairá das coleções dos usuários.')) return;
    try {
      await runMutation(() => CloudJSONStore.deleteGlobalMedia(id), { onSuccess: async () => {
        invalidateQuery(['catalog']); invalidateQuery(['media']); invalidateQuery(['user-collection']);
        if (this.currentRoute.startsWith('midia/')) window.location.hash = '#/'; else await this.refreshCurrentView();
      } });
    } catch (error) { this.showError(error.message || 'Não foi possível excluir a mídia.'); }
  }

  async readImageFile(file) {
    if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem válido.');
    if (file.size > 2 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 2 MB.');
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Não foi possível ler a imagem.')); reader.readAsDataURL(file); });
  }

  logout() { localStorage.removeItem(SESSION_KEY); localStorage.removeItem('active_session_v2'); this.user = null; this.pendingAvatar = ''; window.location.hash = '#/'; this.syncAuthUI(); }

  async refreshCurrentView() {
    if (this.currentRoute === 'perfil/colecao') return this.fetchUserCollectionPage();
    if (this.currentRoute === 'perfil/editar') return;
    if (this.currentRoute.startsWith('midia/')) return this.fetchMediaDetail(this.currentRoute.slice('midia/'.length));
    return this.fetchGlobalCatalog(this.currentRoute);
  }

  syncAuthUI() {
    if (this.user) {
      const avatar = document.getElementById('profile-avatar-preview').getAttribute('src') || DEFAULT_AVATAR;
      this.authWidget.innerHTML = `<a class="user-chip" href="#/perfil/editar" aria-label="Editar perfil"><img src="${escapeHTML(avatar)}" alt="" /><span>${escapeHTML(this.user.username || this.user.email.split('@')[0])}</span></a>`;
      document.querySelectorAll('.private-route').forEach(route => route.classList.remove('hidden'));
    } else {
      this.authWidget.innerHTML = '<button id="btn-login" class="md3-btn md3-btn-filled" type="button">Entrar</button>';
      document.querySelectorAll('.private-route').forEach(route => route.classList.add('hidden'));
      document.getElementById('btn-login').addEventListener('click', () => this.showAuthScreen('login'));
    }
  }

  showFormError(element, message) { element.textContent = message; element.classList.remove('hidden'); }
  showError(message) { const banner = document.getElementById('error-banner'); document.getElementById('error-message-text').textContent = message; banner.classList.remove('hidden'); window.setTimeout(() => banner.classList.add('hidden'), 4500); }
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">check_circle</span><span>${escapeHTML(message)}</span>`;
    document.getElementById('toast-container').append(toast);
    window.setTimeout(() => { toast.classList.add('is-leaving'); window.setTimeout(() => toast.remove(), 220); }, 3800);
  }
}

new App();
