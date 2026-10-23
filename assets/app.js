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
    const u = new URL(raw);
    return u.protocol === "https:" &&
      u.hostname.includes(".") &&
      !u.username &&
      !u.password &&
      !u.port &&
      u.hostname !== "localhost";
  } catch {
    return false;
  }
}

function approved(t) {
  return t.homologado === true &&
    t.nivelFirewall === 3 &&
    t.privacidadeVerificada === true &&
    t.loginVerificado === true &&
    t.gratuidadeVerificada === true &&
    safeUrl(t.url);
}

function safePreview(t) {
  return typeof t.preview === "string" &&
    /^\/assets\/previews\/[a-z0-9_-]+\.(png|webp|jpg)$/i.test(t.preview);
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

  content.replaceChildren();
  $("previewTitle").textContent = t.nome;

  const image = element("img");
  image.src = t.preview;
  image.alt = "Captura do site " + t.nome;
  image.referrerPolicy = "no-referrer";

  content.append(image);
  dialog.showModal();
}

function makeCard(t) {
  const symbol = ICONS[t.categoria] || "grid";
  const card = element("article", "card");

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
      preview.replaceChildren(placeholder(symbol, t.nome));
      preview.disabled = true;
    }, {once:true});

    preview.append(
      image,
      element("span", "preview-label", "Ampliar prévia")
    );

    preview.addEventListener("click", () => openPreview(t));
  } else {
    preview.append(placeholder(symbol, "Prévia ainda não disponível"));
    preview.disabled = true;
  }

  const body = element("div", "card-body");

  body.append(
    element("span", "card-category", t.categoria),
    element("h3", "", t.nome),
    element("p", "", t.descricao)
  );

  const ok = approved(t);

  body.append(
    element(
      "span",
      "card-status",
      ok ? "Acesso homologado" : "Pendente de homologação"
    )
  );

  if (ok) {
    const link = element("a", "card-link");
    link.href = t.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.referrerPolicy = "no-referrer";

    link.append(
      element("span", "", "Acessar ferramenta"),
      icon("arrow-up-right")
    );
    body.append(link);
  } else {
    const disabled = element("div", "card-link disabled");
    disabled.append(
      element("span", "", "Aguardando validação"),
      icon("lock")
    );
    body.append(disabled);
  }

  card.append(preview, body);
  return card;
}

function getCategories() {
  const counts = new Map();

  state.tools.forEach(t => {
    counts.set(t.categoria, (counts.get(t.categoria) || 0) + 1);
  });

  return [...counts.entries()].sort((a,b) =>
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

    b.setAttribute("aria-pressed", String(state.category === value));

    b.append(
      icon(symbol),
      element("span", "", label),
      element("span", "category-count", String(count))
    );

    b.addEventListener("click", () => {
      state.category = value;
      render();

      if (window.innerWidth < 700) {
        $("currentCategory").scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });

    container.append(b);
  }

  button("Todas", "", state.tools.length, "grid");

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
      !state.category || t.categoria === state.category;

    const textMatch = normalize(
      [t.nome, t.descricao, t.categoria].join(" ")
    ).includes(query);

    return categoryMatch && textMatch;
  });

  filtered.sort((a,b) => {
    const result = a.nome.localeCompare(b.nome,"pt-BR");
    return state.sort === "reverse" ? -result : result;
  });

  return filtered;
}

function render() {
  renderCategories();

  const filtered = getFiltered();

  $("currentCategory").textContent =
    state.category || "Todas as ferramentas";

  $("resultCount").textContent =
    filtered.length + " de " + state.tools.length + " ferramentas";

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
      throw new Error("Erro ao carregar tools.json");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Catalogo JSON invalido");
    }

    state.tools = data.filter(t =>
      t &&
      typeof t.nome === "string" &&
      typeof t.descricao === "string" &&
      typeof t.categoria === "string" &&
      typeof t.url === "string" &&
      safeUrl(t.url)
    );

    render();
  } catch (error) {
    $("resultCount").textContent = "Erro ao carregar catálogo";
    console.error(error);
  }
}

initialize();