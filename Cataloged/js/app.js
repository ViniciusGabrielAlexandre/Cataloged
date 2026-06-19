import { INITIAL_GLOBAL_CATALOG } from "./mockData.js";

const BASE_API = "https://jsonplaceholder.typicode.com";

class TanStackQueryEngine {
  constructor() {
    this.cache = new Map();
  }

  fetchQuery(queryKey, fetchFn, onStateChange) {
    const cacheKey = JSON.stringify(queryKey);

    if (this.cache.has(cacheKey)) {
      onStateChange({
        data: this.cache.get(cacheKey),
        isLoading: false,
        isFetching: true,
        isError: false
      });
    } else {
      onStateChange({
        data: null,
        isLoading: true,
        isFetching: true,
        isError: false
      });
    }

    fetchFn()
      .then(data => {
        this.cache.set(cacheKey, data);
        onStateChange({
          data,
          isLoading: false,
          isFetching: false,
          isError: false
        });
      })
      .catch(error => {
        onStateChange({
          data: null,
          isLoading: false,
          isFetching: false,
          isError: true,
          error
        });
      });
  }

  mutate(mutationFn, options = {}) {
    mutationFn()
      .then(data => {
        if (options.onSuccess) options.onSuccess(data);
      })
      .catch(error => {
        if (options.onError) options.onError(error);
      });
  }

  invalidateQueries(queryKey) {
    const cacheKey = JSON.stringify(queryKey);
    this.cache.delete(cacheKey);
  }
}

const queryClient = new TanStackQueryEngine();

const CloudJSONStore = {
  async getGlobalCatalog() {
    const local = localStorage.getItem("global_catalog_v2");

    if (!local) {
      localStorage.setItem("global_catalog_v2", JSON.stringify(INITIAL_GLOBAL_CATALOG));
      return INITIAL_GLOBAL_CATALOG;
    }

    return JSON.parse(local);
  },

  async addGlobalMedia(item) {
    await fetch(`${BASE_API}/posts`, {
      method: "POST",
      body: JSON.stringify(item)
    });

    const catalog = await this.getGlobalCatalog();

    item.id = `m${Date.now()}`;
    catalog.push(item);

    localStorage.setItem("global_catalog_v2", JSON.stringify(catalog));

    return item;
  },

  async getUserData(userKey) {
    const data = localStorage.getItem(`user_profile_${userKey}`);

    return data
      ? JSON.parse(data)
      : {
          collection: [],
          avatar: "",
          themeMode: "dark",
          accentColor: "#d0bcff"
        };
  },

  async saveUserData(userKey, profileObj) {
    localStorage.setItem(`user_profile_${userKey}`, JSON.stringify(profileObj));
  }
};

class App {
  constructor() {
    this.user = null;
    this.currentRoute = "all";
    this.init();
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.setupRouter();
    this.checkSession();
  }

  cacheElements() {
    this.gridGlobal = document.getElementById("global-catalog-grid");
    this.gridMyCollection = document.getElementById("my-collection-grid");
    this.authWidget = document.getElementById("auth-widget-container");

    this.views = {
      catalog: document.getElementById("view-catalog"),
      "minha-colecao": document.getElementById("view-my-collection"),
      "config-perfil": document.getElementById("view-config-perfil")
    };

    this.btnOpenCreate = document.getElementById("btn-open-create-media");
    this.mediaTypeSelect = document.getElementById("media-type-select");
    this.dynamicFields = document.getElementById("dynamic-fields-container");
    this.statusIndicator = document.getElementById("query-status-indicator");
  }

  bindEvents() {
    this.mediaTypeSelect?.addEventListener("change", () => this.renderFields());

    this.btnOpenCreate?.addEventListener("click", () => {
      document.getElementById("create-media-modal")?.classList.remove("hidden");
    });

    document.getElementById("btn-close-create")?.addEventListener("click", () => {
      document.getElementById("create-media-modal")?.classList.add("hidden");
    });

    document.getElementById("btn-close-auth")?.addEventListener("click", () => {
      document.getElementById("auth-modal")?.classList.add("hidden");
    });

    document.getElementById("btn-close-details")?.addEventListener("click", () => {
      document.getElementById("media-details-modal")?.classList.add("hidden");
    });

    document.getElementById("create-media-form")?.addEventListener("submit", e => {
      this.handleCreateMedia(e);
    });

    document.getElementById("auth-form")?.addEventListener("submit", e => {
      this.handleAuth(e);
    });

    this.gridGlobal?.addEventListener("click", e => {
      const btn = e.target.closest(".btn-add-to-list");

      if (btn) {
        e.stopPropagation();
        this.addMediaToUserList(btn.dataset.id);
        return;
      }

      const card = e.target.closest(".md3-media-card");

      if (card) {
        this.openMediaDetails(card.dataset.id);
      }
    });

    this.gridMyCollection?.addEventListener("change", e => {
      if (e.target.classList.contains("md3-inline-input")) {
        this.updateProgress(e.target);
      }
    });
  }

  async openMediaDetails(mediaId) {
    const catalog = await CloudJSONStore.getGlobalCatalog();
    const media = catalog.find(item => item.id === mediaId);

    if (!media) return;

    const content = `
      <div class="md3-details-layout">
        <div class="md3-details-poster-wrapper">
          <img
            src="${media.poster}"
            alt="Capa de ${media.title}"
            class="md3-details-poster"
          />
        </div>

        <div class="md3-details-info">
          <span class="md3-details-chip">${formatMediaType(media.type)}</span>

          <h2 class="md3-details-title">${media.title}</h2>

          <div class="md3-details-metadata-grid">
            ${formatMediaMetadata(media)}
          </div>

          <p class="md3-details-description">
            ${media.description || "Nenhuma descrição cadastrada para esta mídia."}
          </p>
        </div>
      </div>
    `;

    document.getElementById("media-details-content").innerHTML = content;
    document.getElementById("media-details-modal").classList.remove("hidden");
  }

  checkSession() {
    const session = localStorage.getItem("active_session_v2");

    if (session) {
      this.user = JSON.parse(session);
      this.applyUserTheme();
    }

    this.syncAuthUI();
  }

  handleAuth(e) {
    e.preventDefault();

    const email = document.getElementById("auth-email").value;
    const passwordInput = document.getElementById("auth-password");
    const password = passwordInput ? passwordInput.value : "";

    queryClient.mutate(
      async () => {
        await fetch(`${BASE_API}/posts`, {
          method: "POST",
          body: JSON.stringify({ email, password })
        });

        const userKey = btoa(email).replace(/=/g, "");

        return {
          email,
          token: userKey
        };
      },
      {
        onSuccess: userData => {
          this.user = userData;
          localStorage.setItem("active_session_v2", JSON.stringify(userData));

          document.getElementById("auth-modal")?.classList.add("hidden");

          this.applyUserTheme();
          this.syncAuthUI();
        }
      }
    );
  }

  setupRouter() {
    const routeHandler = () => {
      const hash = window.location.hash || "#/";
      this.currentRoute = hash === "#/" ? "all" : hash.replace("#/", "");

      Object.values(this.views).forEach(view => {
        if (view) view.classList.add("hidden");
      });

      if (["minha-colecao", "config-perfil"].includes(this.currentRoute)) {
        const view = this.views[this.currentRoute];

        if (view) view.classList.remove("hidden");

        if (this.currentRoute === "minha-colecao") {
          this.fetchUserCollectionPage();
        }
      } else {
        if (this.views.catalog) this.views.catalog.classList.remove("hidden");

        this.fetchGlobalCatalog();
      }

      document.querySelectorAll(".md3-tab-link").forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === hash);
      });
    };

    window.addEventListener("hashchange", routeHandler);
    window.addEventListener("load", routeHandler);
  }

  async applyUserTheme() {
    if (!this.user) return;

    const profile = await CloudJSONStore.getUserData(this.user.token);

    if (profile.themeMode === "light") {
      document.documentElement.style.setProperty("--md-sys-color-surface", "#fef7ff");
      document.documentElement.style.setProperty("--md-sys-color-surface-container", "#f3edf7");
      document.documentElement.style.setProperty("--md-sys-color-on-surface", "#1d1b20");
    } else {
      document.documentElement.style.setProperty("--md-sys-color-surface", "#141218");
      document.documentElement.style.setProperty("--md-sys-color-surface-container", "#211f26");
      document.documentElement.style.setProperty("--md-sys-color-on-surface", "#e6e1e5");
    }

    document.documentElement.style.setProperty("--md-sys-color-primary", profile.accentColor || "#d0bcff");

    const avatarPreview = document.getElementById("profile-avatar-preview");
    const themeMode = document.getElementById("select-theme-mode");
    const themeAccent = document.getElementById("select-theme-accent");

    if (avatarPreview && profile.avatar) avatarPreview.src = profile.avatar;
    if (themeMode) themeMode.value = profile.themeMode;
    if (themeAccent) themeAccent.value = profile.accentColor;
  }

  fetchGlobalCatalog() {
    if (this.statusIndicator) {
      this.statusIndicator.textContent = "Carregando...";
    }

    queryClient.fetchQuery(
      ["catalog", this.currentRoute],
      async () => {
        const data = await CloudJSONStore.getGlobalCatalog();

        if (
          this.currentRoute !== "all" &&
          ["filmes", "musicas", "livros", "jogos"].includes(this.currentRoute)
        ) {
          return data.filter(item => item.type === this.currentRoute);
        }

        return data;
      },
      state => {
        if (state.isLoading && this.gridGlobal) {
          this.gridGlobal.innerHTML = "<p>Carregando catálogo...</p>";
        }

        if (state.data && this.gridGlobal) {
          this.gridGlobal.innerHTML = state.data
            .map(media => `
              <article class="md3-media-card" data-id="${media.id}">
                <div class="md3-card-poster-wrapper">
                  <img
                    src="${media.poster}"
                    alt="Capa de ${media.title}"
                    class="md3-card-poster"
                  />
                </div>

                <div class="md3-card-body">
                  <h3 class="md3-card-title">${media.title}</h3>

                  <p class="md3-card-metadata">
                    ${getMediaSummary(media)}
                  </p>

                  <div class="md3-card-actions">
                    <button
                      class="md3-btn md3-btn-filled btn-add-to-list"
                      data-id="${media.id}"
                    >
                      <span class="material-symbols-outlined">playlist_add</span>
                      Adicionar
                    </button>
                  </div>
                </div>
              </article>
            `)
            .join("");
        }

        if (state.isError && this.gridGlobal) {
          this.gridGlobal.innerHTML = "<p>Erro ao carregar catálogo.</p>";
        }

        if (!state.isFetching && this.statusIndicator) {
          this.statusIndicator.textContent = "Sincronizado";
        }
      }
    );
  }

  fetchUserCollectionPage() {
    if (!this.user || !this.gridMyCollection) return;

    queryClient.fetchQuery(
      ["user-collection-page", this.user.token],
      async () => {
        const profile = await CloudJSONStore.getUserData(this.user.token);
        return profile.collection;
      },
      state => {
        if (!state.data) return;

        this.gridMyCollection.innerHTML = state.data.length === 0
          ? "<p>Nenhum item na sua coleção.</p>"
          : state.data
              .map(media => `
                <div class="md3-media-card" style="padding:16px;">
                  <h4 class="md3-card-title">${media.title}</h4>

                  <div class="md3-progress-row">
                    <div>
                      <select data-id="${media.id}" data-field="user_status" class="md3-inline-input">
                        <option value="Não iniciado" ${media.user_status === "Não iniciado" ? "selected" : ""}>Não iniciado</option>
                        <option value="Consumindo" ${media.user_status === "Consumindo" ? "selected" : ""}>Consumindo</option>
                        <option value="Concluído" ${media.user_status === "Concluído" ? "selected" : ""}>Concluído</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        data-id="${media.id}"
                        data-field="user_rating"
                        value="${media.user_rating || 5}"
                        class="md3-inline-input"
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        data-id="${media.id}"
                        data-field="user_time"
                        value="${media.user_time || ""}"
                        placeholder="Tempo"
                        class="md3-inline-input"
                      />
                    </div>
                  </div>
                </div>
              `)
              .join("");
      }
    );
  }

  async addMediaToUserList(mediaId) {
    if (!this.user) {
      document.getElementById("auth-modal")?.classList.remove("hidden");
      return;
    }

    const catalog = await CloudJSONStore.getGlobalCatalog();
    const item = catalog.find(media => media.id === mediaId);

    if (!item) return;

    const profile = await CloudJSONStore.getUserData(this.user.token);

    if (!profile.collection.some(media => media.id === mediaId)) {
      profile.collection.push({
        ...item,
        user_status: "Não iniciado",
        user_rating: "5",
        user_time: ""
      });

      await CloudJSONStore.saveUserData(this.user.token, profile);
      queryClient.invalidateQueries(["user-collection-page", this.user.token]);
    }
  }

  async updateProgress(target) {
    if (!this.user) return;

    const profile = await CloudJSONStore.getUserData(this.user.token);
    const item = profile.collection.find(media => media.id === target.dataset.id);

    if (item) {
      item[target.dataset.field] = target.value;
      await CloudJSONStore.saveUserData(this.user.token, profile);
    }
  }

  renderFields() {
    const type = this.mediaTypeSelect.value;

    const fields = {
      filmes: [
        { id: "meta-director", label: "Diretor", key: "director" },
        { id: "meta-duration", label: "Duração", key: "duration" }
      ],
      musicas: [
        { id: "meta-artist", label: "Artista / Banda", key: "artist" },
        { id: "meta-album", label: "Álbum", key: "album" }
      ],
      livros: [
        { id: "meta-author", label: "Autor", key: "author" },
        { id: "meta-pages", label: "Páginas", key: "pages" }
      ],
      jogos: [
        { id: "meta-developer", label: "Desenvolvedora", key: "developer" },
        { id: "meta-time", label: "Tempo estimado", key: "time" }
      ]
    };

    const selectedFields = fields[type] || [];

    this.dynamicFields.innerHTML = selectedFields
      .map(field => `
        <div class="md3-text-field">
          <input
            type="text"
            id="${field.id}"
            data-meta-key="${field.key}"
            required
            placeholder=" "
          />
          <label for="${field.id}">${field.label}</label>
        </div>
      `)
      .join("");
  }

  handleCreateMedia(e) {
    e.preventDefault();

    const title = document.getElementById("media-title").value.trim();
    const poster = document.getElementById("media-poster").value.trim();
    const type = this.mediaTypeSelect.value;

    const metaData = {};

    document.querySelectorAll("[data-meta-key]").forEach(input => {
      metaData[input.dataset.metaKey] = input.value.trim();
    });

    queryClient.mutate(
      async () => {
        return await CloudJSONStore.addGlobalMedia({
          title,
          poster,
          type,
          meta_data: metaData
        });
      },
      {
        onSuccess: () => {
          document.getElementById("create-media-modal")?.classList.add("hidden");
          document.getElementById("create-media-form")?.reset();

          if (this.dynamicFields) {
            this.dynamicFields.innerHTML = "";
          }

          queryClient.invalidateQueries(["catalog", this.currentRoute]);
          this.fetchGlobalCatalog();
        }
      }
    );
  }

  syncAuthUI() {
    if (!this.authWidget) return;

    if (this.user) {
      this.authWidget.innerHTML = `
        <button id="btn-logout" class="md3-btn md3-btn-text">
          Sair (${this.user.email})
        </button>
      `;

      document.querySelectorAll(".private-route").forEach(route => {
        route.classList.remove("hidden");
      });

      document.getElementById("btn-logout").addEventListener("click", () => {
        localStorage.removeItem("active_session_v2");
        this.user = null;
        window.location.hash = "#/";
        this.syncAuthUI();
      });
    } else {
      this.authWidget.innerHTML = `
        <button id="btn-login" class="md3-btn md3-btn-filled">
          Entrar
        </button>
      `;

      document.querySelectorAll(".private-route").forEach(route => {
        route.classList.add("hidden");
      });

      document.getElementById("btn-login").addEventListener("click", () => {
        document.getElementById("auth-modal")?.classList.remove("hidden");
      });
    }
  }
}

function getMediaMetadata(media) {
  if (media.meta_data && Object.keys(media.meta_data).length > 0) {
    return media.meta_data;
  }

  switch (media.type) {
    case "filmes":
      return {
        director: media.director,
        duration: media.duration
      };

    case "musicas":
      return {
        artist: media.artist,
        album: media.album
      };

    case "livros":
      return {
        author: media.author,
        pages: media.pages
      };

    case "jogos":
      return {
        developer: media.developer,
        time: media.time
      };

    default:
      return {};
  }
}

function formatMetadataLabel(key) {
  const map = {
    director: "Diretor",
    duration: "Duração",
    artist: "Artista",
    album: "Álbum",
    author: "Autor",
    pages: "Páginas",
    developer: "Desenvolvedora",
    time: "Tempo estimado"
  };

  return map[key] || key;
}

function formatMediaType(type) {
  const map = {
    filmes: "Filme",
    musicas: "Música",
    livros: "Livro",
    jogos: "Jogo"
  };

  return map[type] || type;
}

function formatMediaMetadata(media) {
  const metadata = getMediaMetadata(media);

  const entries = Object.entries(metadata).filter(([, value]) => {
    return value !== undefined && value !== null && value !== "";
  });

  if (entries.length === 0) {
    return `
      <div class="md3-details-metadata-item">
        <span class="md3-details-label">Informações</span>
        <strong>Não informado</strong>
      </div>
    `;
  }

  return entries
    .map(([key, value]) => `
      <div class="md3-details-metadata-item">
        <span class="md3-details-label">${formatMetadataLabel(key)}</span>
        <strong>${value}</strong>
      </div>
    `)
    .join("");
}

function getMediaSummary(media) {
  const metadata = getMediaMetadata(media);

  switch (media.type) {
    case "filmes":
      return `Diretor: ${metadata.director || "—"} • ${metadata.duration || "—"}`;

    case "livros":
      return `Autor: ${metadata.author || "—"} • ${metadata.pages || "—"} páginas`;

    case "musicas":
      return `Artista: ${metadata.artist || "—"} • Álbum: ${metadata.album || "—"}`;

    case "jogos":
      return `Dev: ${metadata.developer || "—"} • ${metadata.time || "—"}`;

    default:
      return "Sem informações";
  }
}

new App();