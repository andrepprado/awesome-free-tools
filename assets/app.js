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

$("closePreview").addEventListener("click", () => {
  $("previewDialog").close();
});

$("previewDialog").addEventListener("click", e => {
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