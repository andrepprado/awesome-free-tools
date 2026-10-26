"use strict";

const ICONS = {
  "Automacao": "gear",
  "Automação": "gear",
  "Desenvolvimento": "code-slash",
  "Design e Mockups": "palette",
  "Documentos e PDF": "file-earmark-pdf",
  "Imagens": "image",
  "Inteligencia Artificial": "cpu",
  "Inteligência Artificial": "cpu",
  "Produtividade": "diagram-3",
  "Utilitarios": "tools",
  "Utilitários": "tools",
  "Video e Audio": "camera-video",
  "Vídeo e Áudio": "camera-video"
};

const state = {
  tools: [],
  category: "",
  search: "",
  sort: "name"
};

const $ = id => document.getElementById(id);

function element(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function icon(name) {
  const i = element("i", "bi bi-" + name);
  i.setAttribute("aria-hidden", "true");
  return i;
}

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function safeUrl(raw) {
  try {
    if (typeof raw !== "string") return false;

    const u = new URL(raw);

    if (u.protocol !== "https:") return false;
    if (u.username || u.password) return false;
    if (u.port && u.port !== "443") return false;
    if (!u.hostname.includes(".")) return false;

    const host = u.hostname.toLowerCase();

    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".test") ||
      host.endsWith(".invalid") ||
      host.endsWith(".arpa") ||
      host.includes(":") ||
      host.includes("[")
    ) return false;

    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const p = host.split(".").map(Number);

      if (
        p.some(n => n < 0 || n > 255) ||
        p[0] === 0 ||
        p[0] === 10 ||
        p[0] === 127 ||
        p[0] >= 224 ||
        (p[0] === 169 && p[1] === 254) ||
        (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
        (p[0] === 192 && p[1] === 168) ||
        (p[0] === 100 && p[1] >= 64 && p[1] <= 127)
      ) return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isApproved(t) {
  return t.homologado === true &&
    t.nivelFirewall === 3 &&
    t.privacidadeVerificada === true &&
    t.loginVerificado === true &&
    t.gratuidadeVerificada === true;
}

function safePreview(t) {
  return typeof t.preview === "string" &&
    /^\/assets\/previews\/[a-z0-9_-]+\.(png|webp|jpg|jpeg)$/i.test(t.preview);
}

function placeholder(symbol, title) {
  const box = element("div", "preview-placeholder");
  box.append(icon(symbol), element("span", "", title));
  return box;
}

function openPreview(t) {
  if (!safePreview(t)) return;

  const dialog = $("previewDialog");
  const content = $("previewContent");

  if (!dialog || !content) return;

  content.replaceChildren();

  $("previewTitle").textContent = t.nome;

  const image = element("img");
  image.src = t.preview;
  image.alt = "Captura do site " + t.nome;
  image.referrerPolicy = "no-referrer";

  content.append(image);

  if (!dialog.open) dialog.showModal();
}

function makeCard(t) {
  const symbol = ICONS[t.categoria] || "grid";
  const card = element("article", "card");

  // ========================================================
  // PREVIEW LOCAL
  // ========================================================

  const preview = element("button", "preview");
  preview.type = "button";

  if (safePreview(t)) {
    const image = element("img");

    image.src = t.preview;
    image.alt = "Prévia do site " + t.nome;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";

    image.addEventListener("error", () => {
      preview.replaceChildren(
        placeholder(symbol, t.nome)
      );
      preview.disabled = true;
    }, { once: true });

    preview.append(
      image,
      element("span", "preview-label", "Ampliar prévia")
    );

    preview.addEventListener("click", () => openPreview(t));
  } else {
    preview.append(
      placeholder(symbol, "Prévia não cadastrada")
    );
    preview.disabled = true;
  }

  // ========================================================
  // INFORMACOES
  // ========================================================

  const body = element("div", "card-body");

  body.append(
    element("span", "card-category", t.categoria),
    element("h3", "", t.nome),
    element("p", "", t.descricao || "")
  );

  // ========================================================
  // STATUS DE HOMOLOGACAO
  // NAO BLOQUEIA O LINK POR SI SO
  // ========================================================

  const approved = isApproved(t);

  const status = element(
    "span",
    "card-status",
    approved
      ? "Homologação registrada"
      : "Homologação corporativa pendente"
  );

  body.append(status);

  // ========================================================
  // LINK REAL DA FERRAMENTA
  // ========================================================

  if (safeUrl(t.url)) {
    const link = element("a", "card-link");

    link.href = t.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.referrerPolicy = "no-referrer";

    link.setAttribute(
      "aria-label",
      "Abrir " + t.nome + " em nova aba"
    );

    link.append(
      element("span", "", "Acessar ferramenta"),
      icon("arrow-up-right")
    );

    body.append(link);
  } else {
    const disabled = element("div", "card-link disabled");

    disabled.append(
      element("span", "", "URL inválida"),
      icon("exclamation-triangle")
    );

    body.append(disabled);
  }

  card.append(preview, body);

  return card;
}

function getCategories() {
  const counts = new Map();

  state.tools.forEach(t => {
    counts.set(
      t.categoria,
      (counts.get(t.categoria) || 0) + 1
    );
  });

  return [...counts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "pt-BR")
  );
}

function renderCategories() {
  const container = $("categories");

  container.replaceChildren();

  const categories = getCategories();

  $("categoryCount").textContent =
    categories.length + " categorias";

  function button(label, value, count, symbol) {
    const b = element("button", "category-button");

    b.type = "button";

    if (state.category === value) {
      b.classList.add("active");
    }

    b.setAttribute(
      "aria-pressed",
      String(state.category === value)
    );

    b.append(
      icon(symbol),
      element("span", "", label),
      element("span", "category-count", String(count))
    );

    b.addEventListener("click", () => {
      state.category = value;
      render();
    });

    container.append(b);
  }

  button(
    "Todas",
    "",
    state.tools.length,
    "grid"
  );

  for (const [category, count] of categories) {
    button(
      category,
      category,
      count,
      ICONS[category] || "grid"
    );
  }
}

function getFiltered() {
  const query = normalize(state.search);

  const filtered = state.tools.filter(t => {
    const categoryMatch =
      !state.category ||
      t.categoria === state.category;

    const textMatch = normalize(
      [t.nome, t.descricao, t.categoria].join(" ")
    ).includes(query);

    return categoryMatch && textMatch;
  });

  filtered.sort((a, b) => {
    const result = a.nome.localeCompare(b.nome, "pt-BR");
    return state.sort === "reverse"
      ? -result
      : result;
  });

  return filtered;
}

function render() {
  renderCategories();

  const filtered = getFiltered();

  $("currentCategory").textContent =
    state.category || "Todas as ferramentas";

  $("resultCount").textContent =
    filtered.length +
    " de " +
    state.tools.length +
    " ferramentas";

  const cards = $("cards");

  cards.replaceChildren();

  if (!filtered.length) {
    const empty = element("div", "empty");

    empty.append(
      icon("search"),
      element("strong", "", "Nenhuma ferramenta encontrada"),
      element("p", "", "Altere a pesquisa ou limpe os filtros.")
    );

    cards.append(empty);
    return;
  }

  for (const tool of filtered) {
    cards.append(makeCard(tool));
  }
}

function clearFilters() {
  state.category = "";
  state.search = "";
  state.sort = "name";

  $("search").value = "";
  $("sort").value = "name";

  render();
}

$("search").addEventListener("input", e => {
  state.search = e.target.value;
  render();
});

$("sort").addEventListener("change", e => {
  state.sort = e.target.value;
  render();
});

$("clearSearch").addEventListener("click", () => {
  state.search = "";
  $("search").value = "";
  render();
  $("search").focus();
});

$("clearFilters").addEventListener("click", clearFilters);

$("closePreview")?.addEventListener("click", () => {
  $("previewDialog").close();
});

$("previewDialog")?.addEventListener("click", e => {
  if (e.target === $("previewDialog")) {
    $("previewDialog").close();
  }
});

async function initialize() {
  try {
    const response = await fetch("/tools.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Erro HTTP " + response.status);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Catálogo JSON inválido");
    }

    state.tools = data.filter(t =>
      t &&
      typeof t.nome === "string" &&
      typeof t.descricao === "string" &&
      typeof t.categoria === "string" &&
      typeof t.url === "string"
    );

    render();
  } catch (error) {
    $("resultCount").textContent =
      "Erro ao carregar catálogo";

    console.error(error);
  }
}

initialize();

/* AWESOME LINKS E PREVIEWS V2 */
(function () {
    "use strict";

    const linkSelector = "a.card-link[href], a[href].card-link";
    const previewSelector = ".preview, .card-preview, .preview-image";
    const iconSelector = ".bi.bi-arrow-up-right";

    function validUrl(link) {
        if (!link) return null;
        try {
            const url = new URL(link.getAttribute("href"), document.baseURI);
            return ["https:", "http:"].includes(url.protocol) ? url.href : null;
        } catch (_) {
            return null;
        }
    }

    function getLink(node) {
        const card = node.closest(".card, .tool-card, .tool-item, article");
        return card ? card.querySelector(linkSelector) : null;
    }

    document.addEventListener("click", function (event) {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const directLink = target.closest(linkSelector);
        if (directLink) {
            if (!validUrl(directLink)) {
                event.preventDefault();
                return;
            }
            directLink.setAttribute("target", "_blank");
            directLink.setAttribute("rel", "noopener noreferrer");
            return;
        }

        const preview = target.closest(previewSelector);
        const icon = target.closest(iconSelector);

        if (!preview && !icon) return;

        const link = getLink(preview || icon);
        const url = validUrl(link);

        if (!url) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        window.open(url, "_blank", "noopener,noreferrer");
    }, true);

    function configureLinks() {
        document.querySelectorAll(linkSelector).forEach(link => {
            if (!validUrl(link)) return;
            link.setAttribute("target", "_blank");
            link.setAttribute("rel", "noopener noreferrer");
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", configureLinks, { once: true });
    } else {
        configureLinks();
    }
})();
/* FIM AWESOME LINKS E PREVIEWS V2 */

/* INICIO CORRECAO GRID V8 */
(function () {
  "use strict";

  const CATEGORY_ORDER = [
    "01 - Documentos, PDF e Contratos",
    "02 - Planilhas, Dados e Relatórios",
    "03 - Automação e Integrações",
    "04 - Processos, Fluxos e Projetos",
    "05 - Comunicação e Apresentações",
    "06 - Inteligência Artificial Local",
    "07 - Imagens e Materiais Visuais",
    "08 - Compartilhamento e Utilitários",
    "09 - Desenvolvimento e Suporte TI",
    "10 - Vídeo e Áudio"
  ];

  let catalog = [];
  let observer = null;
  let scheduled = false;
  let updating = false;

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function canonicalCategory(value) {
    const number = String(value || "").match(
      /^\s*(\d{1,2})\s*[-–—.]/
    );

    if (number) {
      return CATEGORY_ORDER[Number(number[1]) - 1] || value;
    }

    return CATEGORY_ORDER.find(item =>
      normalize(item) === normalize(value)
    ) || value;
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ""));

      return ["https:", "http:"].includes(url.protocol)
        ? url.href
        : "";
    } catch (_) {
      return "";
    }
  }

  function getTools() {
    try {
      if (
        typeof state !== "undefined" &&
        Array.isArray(state.tools) &&
        state.tools.length > 0
      ) {
        return state.tools;
      }
    } catch (_) {}

    return catalog;
  }

  function findTool(card) {
    const name = (
      card.querySelector("h3")?.textContent || ""
    ).trim();

    return getTools().find(tool =>
      normalize(tool.nome) === normalize(name)
    ) || catalog.find(tool =>
      normalize(tool.nome) === normalize(name)
    );
  }

  function statusText(tool) {
    const status = String(tool.status_publico || "");

    if (status === "ACESSO_RESTRITO") {
      return "Bloqueado na rede Corporativo/Colaborador";
    }

    if (status === "PAGINA_NAO_ENCONTRADA") {
      return "Página não encontrada";
    }

    if (status === "LIMITE_REQUISICOES") {
      return "Limite temporário de requisições";
    }

    return "";
  }

  function enhanceCard(card) {
    const tool = findTool(card);

    if (!tool) return;

    const url = safeUrl(tool.url);

    if (!url) return;

    const body = card.querySelector(".card-body") || card;

    let access = Array.from(
      card.querySelectorAll("a")
    ).find(anchor =>
      /acessar ferramenta|abrir ferramenta/i.test(
        anchor.textContent || ""
      )
    );

    if (!access) {
      access = document.createElement("a");
      access.className = "card-link";
      access.textContent = "Acessar ferramenta";
      body.append(access);
    }

    access.href = url;
    access.target = "_blank";
    access.rel = "noopener noreferrer";
    access.classList.add("card-link");

    const preview =
      card.querySelector(".preview") ||
      card.querySelector(".preview-unavailable") ||
      card.querySelector(".card-preview");

    if (preview) {
      let previewLink = preview.closest("a.preview-access-link");

      if (!previewLink) {
        previewLink = document.createElement("a");
        previewLink.className = "preview-access-link";

        preview.parentNode.insertBefore(previewLink, preview);
        previewLink.appendChild(preview);
      }

      previewLink.href = url;
      previewLink.target = "_blank";
      previewLink.rel = "noopener noreferrer";
      previewLink.title = "Abrir " + tool.nome;
      previewLink.setAttribute(
        "aria-label",
        "Abrir ferramenta " + tool.nome
      );
    }

    const label = statusText(tool);
    let badge = card.querySelector(".access-status");

    if (label) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "access-status";
        body.insertBefore(badge, body.firstChild);
      }

      badge.textContent = label;
    } else if (badge) {
      badge.remove();
    }

    if (tool.alternativa_de) {
      let alternative = card.querySelector(
        ".alternative-card-label"
      );

      if (!alternative) {
        alternative = document.createElement("span");
        alternative.className = "alternative-card-label";
        body.insertBefore(alternative, body.firstChild);
      }

      alternative.textContent =
        "Alternativa gratuita a " + tool.alternativa_de;
    }

    card.querySelectorAll(".alternative-link").forEach(el =>
      el.remove()
    );
  }

  function makeSection(category, cards) {
    const section = document.createElement("section");
    section.className = "tool-category-section";
    section.dataset.category = category;

    const heading = document.createElement("h2");
    heading.className = "tool-category-title";
    heading.textContent = category;

    const grid = document.createElement("div");
    grid.className = "tool-category-grid";

    cards.forEach(card => {
      card.style.width = "";
      card.style.maxWidth = "";
      card.style.gridColumn = "";
      grid.append(card);
    });

    section.append(heading, grid);

    return section;
  }

  function arrangeCards() {
    const container = document.querySelector("#cards");

    if (!container || updating) return;

    const cards = Array.from(
      container.querySelectorAll("article.card")
    );

    if (!cards.length) return;

    updating = true;

    if (observer) observer.disconnect();

    try {
      cards.forEach(enhanceCard);

      const grouped = new Map();

      for (const card of cards) {
        const tool = findTool(card);

        if (!tool) continue;

        const category = canonicalCategory(tool.categoria);

        if (!grouped.has(category)) {
          grouped.set(category, []);
        }

        grouped.get(category).push(card);
      }

      if (grouped.size === 0) return;

      const fragment = document.createDocumentFragment();

      for (const category of CATEGORY_ORDER) {
        const items = grouped.get(category);

        if (!items || !items.length) continue;

        items.sort((a, b) => {
          const nameA = findTool(a)?.nome || "";
          const nameB = findTool(b)?.nome || "";

          return nameA.localeCompare(nameB, "pt-BR");
        });

        fragment.append(makeSection(category, items));
      }

      container.replaceChildren(fragment);
    } finally {
      updating = false;

      if (observer) {
        observer.observe(container, {
          childList: true
        });
      }
    }
  }

  function schedule() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      arrangeCards();
    });
  }

  function installObserver() {
    const container = document.querySelector("#cards");

    if (!container) return;

    observer = new MutationObserver(records => {
      const externalRender = records.some(record =>
        Array.from(record.addedNodes).some(node =>
          node.nodeType === 1 &&
          (
            node.matches?.("article.card") ||
            node.querySelector?.("article.card")
          )
        )
      );

      if (externalRender) schedule();
    });

    observer.observe(container, {
      childList: true
    });

    schedule();
  }

  // Intercepta apenas links de acesso e de preview.
  // Nao executa scrollTo, nao utiliza href="#".
  document.addEventListener("click", event => {
    const anchor = event.target.closest?.("a");

    if (!anchor) return;

    const card = anchor.closest("article.card");

    if (!card) return;

    const isAccess =
      anchor.classList.contains("card-link") ||
      anchor.classList.contains("preview-access-link") ||
      /^(acessar ferramenta|abrir ferramenta)$/i.test(
        (anchor.textContent || "").trim()
      );

    if (!isAccess) return;

    const tool = findTool(card);
    const url = safeUrl(tool?.url);

    if (!url) return;

    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    // Bloqueia listeners antigos, preservando a navegacao nativa.
    event.stopImmediatePropagation();
  }, true);

  async function install() {
    try {
      const response = await fetch(
        "tools.json",
        { cache: "no-store" }
      );

      if (response.ok) {
        const data = await response.json();

        catalog = Array.isArray(data)
          ? data
          : Array.isArray(data.tools)
            ? data.tools
            : Array.isArray(data.ferramentas)
              ? data.ferramentas
              : [];
      }
    } catch (error) {
      console.warn("Catalogo auxiliar:", error.message);
    }

    installObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, {
      once: true
    });
  } else {
    install();
  }
})();
/* FIM CORRECAO GRID V8 */
