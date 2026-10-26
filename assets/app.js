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

/* INICIO CATALOGO ADMINISTRATIVO V4 */
(function () {
  "use strict";

  const ORDER = [
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

  let busy = false;
  let pending = false;

  function getTools() {
    if (typeof state !== "undefined" && Array.isArray(state.tools)) {
      return state.tools;
    }
    return [];
  }

  function nameOf(card) {
    return (card.querySelector("h3")?.textContent || "").trim();
  }

  function toolOf(card) {
    const name = nameOf(card);
    return getTools().find(t => String(t.nome || "").trim() === name);
  }

  function safeLink(value) {
    try {
      const url = new URL(String(value || ""), location.href);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function createLink(text, url, className) {
    const a = document.createElement("a");
    a.className = className;
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = text;
    return a;
  }

  function enhanceCard(card) {
    const tool = toolOf(card);
    if (!tool) return;

    const url = safeLink(tool.url);
    const body = card.querySelector(".card-body") || card;

    const category = String(tool.categoria || "Sem categoria");

    let categoryElement = card.querySelector(".card-category");

    if (!categoryElement) {
      categoryElement = document.createElement("span");
      categoryElement.className = "card-category";
      body.insertBefore(categoryElement, body.firstChild);
    }

    categoryElement.textContent = category;

    // A preview continua simples, sem modal.
    const preview = card.querySelector(".preview");

    if (preview && url) {
      let anchor = preview;

      if (preview.tagName !== "A") {
        anchor = document.createElement("a");
        anchor.className = preview.className;
        anchor.innerHTML = preview.innerHTML;
        preview.replaceWith(anchor);
      }

      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.removeAttribute("disabled");
      anchor.removeAttribute("aria-disabled");
      anchor.style.pointerEvents = "auto";
      anchor.style.cursor = "pointer";
    }

    let link = card.querySelector("a.card-link");

    if (!link && url) {
      link = createLink("Acessar ferramenta", url, "card-link");
      body.append(link);
    }

    if (link && url) {
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    // Remover indicadores antigos e criar um status discreto.
    card.querySelectorAll(".card-status, .preview-label").forEach(el => {
      el.remove();
    });

    const previous = card.querySelector(".access-status");
    if (previous) previous.remove();

    const status = String(tool.acesso || "NAO_VERIFICADO");

    if (status !== "HTTP_OK") {
      const badge = document.createElement("span");
      badge.className = "access-status";

      if (status === "HTTP_403") {
        badge.textContent = "Acesso restrito (HTTP 403)";
        badge.classList.add("access-warning");
      } else if (status === "HTTP_404") {
        badge.textContent = "Página não encontrada (404)";
        badge.classList.add("access-error");
      } else if (status === "HTTP_429") {
        badge.textContent = "Verificação limitada (429)";
        badge.classList.add("access-warning");
      } else {
        badge.textContent = "Acesso não confirmado";
        badge.classList.add("access-neutral");
      }

      body.insertBefore(badge, body.firstChild);
    }


    // Nunca desabilitar o hiperlink por falta de preview.
    if (!preview && url) {
      const a = createLink(
        "Abrir ferramenta",
        url,
        "preview preview-simple"
      );
      card.insertBefore(a, card.firstChild);
    }
  }

  function organize() {
    const container = document.querySelector("#cards");
    if (!container || busy) return;

    const cards = Array.from(container.querySelectorAll("article.card"));

    if (!cards.length) return;

    busy = true;

    try {
      const groups = new Map();

      for (const card of cards) {
        enhanceCard(card);

        const tool = toolOf(card);
        const category = String(tool?.categoria || "Sem categoria");

        if (!groups.has(category)) {
          groups.set(category, []);
        }

        groups.get(category).push(card);
      }

      const categories = [...groups.keys()].sort((a, b) => {
        const ia = ORDER.indexOf(a);
        const ib = ORDER.indexOf(b);

        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) ||
          a.localeCompare(b, "pt-BR");
      });

      const fragment = document.createDocumentFragment();

      for (const category of categories) {
        const section = document.createElement("section");
        section.className = "tool-category-section";

        const title = document.createElement("h2");
        title.className = "tool-category-title";
        title.textContent = category;

        const grid = document.createElement("div");
        grid.className = "tool-category-grid";

        groups.get(category)
          .sort((a, b) => nameOf(a).localeCompare(nameOf(b), "pt-BR"))
          .forEach(card => grid.append(card));

        section.append(title, grid);
        fragment.append(section);
      }

      container.replaceChildren(fragment);
    } finally {
      busy = false;
    }
  }

  function schedule() {
    if (pending || busy) return;

    pending = true;

    requestAnimationFrame(() => {
      pending = false;
      organize();
    });
  }

  function install() {
    const container = document.querySelector("#cards");
    if (!container) return;

    const observer = new MutationObserver(records => {
      if (busy) return;

      const relevant = records.some(record =>
        Array.from(record.addedNodes).some(node =>
          node.nodeType === 1 &&
          (
            node.matches?.("article.card, .tool-category-section") ||
            node.querySelector?.("article.card")
          )
        )
      );

      if (relevant) schedule();
    });

    observer.observe(container, {
      childList: true,
      subtree: true
    });

    document.addEventListener("input", schedule);
    document.addEventListener("change", schedule);

    document.addEventListener("click", event => {
      if (event.target.closest?.("button")) {
        schedule();
      }
    });

    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
/* FIM CATALOGO ADMINISTRATIVO V4 */

/* INICIO IDENTIFICACAO CARDS ALTERNATIVOS */
(function () {
  "use strict";

  function getTools() {
    try {
      if (typeof state !== "undefined" && Array.isArray(state.tools)) {
        return state.tools;
      }
    } catch (_) {}

    return [];
  }

  function updateAlternativeCards() {
    const cards = document.querySelectorAll("#cards article.card");

    for (const card of cards) {
      const name = (card.querySelector("h3")?.textContent || "").trim();

      const tool = getTools().find(
        item => String(item.nome || "").trim() === name
      );

      if (!tool) continue;

      const old = card.querySelector(".alternative-card-label");

      if (old) old.remove();

      const oldLink = card.querySelector(".alternative-link");

      if (oldLink) oldLink.remove();

      if (!tool.alternativa_de) continue;

      const body = card.querySelector(".card-body");

      if (!body) continue;

      const label = document.createElement("span");
      label.className = "alternative-card-label";
      label.textContent = "Alternativa gratuita a " + tool.alternativa_de;

      body.insertBefore(label, body.firstChild);
    }
  }

  function install() {
    const container = document.querySelector("#cards");

    if (!container) return;

    let scheduled = false;

    const schedule = () => {
      if (scheduled) return;

      scheduled = true;

      requestAnimationFrame(() => {
        scheduled = false;
        updateAlternativeCards();
      });
    };

    const observer = new MutationObserver(records => {
      const changed = records.some(record =>
        Array.from(record.addedNodes).some(node =>
          node.nodeType === 1 &&
          (
            node.matches?.("article.card") ||
            node.querySelector?.("article.card")
          )
        )
      );

      if (changed) schedule();
    });

    observer.observe(container, {
      childList: true,
      subtree: true
    });

    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
/* FIM IDENTIFICACAO CARDS ALTERNATIVOS */
