"use strict";

const CATEGORIES = [
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

const state = {
  tools: [],
  category: "",
  search: "",
  sort: "name"
};

const $ = id => document.getElementById(id);

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function makeCard(tool) {
  const card = node("article", "card");

  const preview = node("a", "preview preview-access-link");
  preview.href = tool.url;
  preview.target = "_blank";
  preview.rel = "noopener noreferrer";
  preview.setAttribute("aria-label", "Abrir " + tool.nome);

  function fallback() {
    const placeholder = node("div", "preview-placeholder");
    placeholder.append(
      node("i", "bi bi-grid"),
      node("span", "", "Abrir ferramenta")
    );
    preview.replaceChildren(placeholder);
  }

  if (tool.preview) {
    const image = node("img");
    image.src = tool.preview;
    image.alt = "Previa de " + tool.nome;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", fallback, { once: true });
    preview.append(image);
  } else {
    fallback();
  }

  const body = node("div", "card-body");

  body.append(
    node("span", "card-category", tool.categoria),
    node("h3", "", tool.nome),
    node("p", "", tool.descricao || "")
  );

  const link = node("a", "card-link");
  link.href = tool.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  link.append(
    node("span", "", "Acessar ferramenta"),
    node("i", "bi bi-arrow-up-right")
  );

  body.append(link);
  card.append(preview, body);

  return card;
}

function filteredTools() {
  const query = normalize(state.search);

  return state.tools.filter(tool => {
    return (
      (!state.category || tool.categoria === state.category) &&
      normalize(
        [tool.nome, tool.descricao, tool.categoria].join(" ")
      ).includes(query)
    );
  });
}

function renderCategories() {
  const area = $("categories");
  area.replaceChildren();

  const counts = new Map();

  for (const tool of state.tools) {
    counts.set(
      tool.categoria,
      (counts.get(tool.categoria) || 0) + 1
    );
  }

  $("categoryCount").textContent = counts.size + " categorias";

  function add(label, value, count) {
    const button = node(
      "button",
      "category-button" + (
        state.category === value ? " active" : ""
      )
    );

    button.type = "button";
    button.setAttribute(
      "aria-pressed",
      String(state.category === value)
    );

    button.append(
      node("span", "", label),
      node("span", "category-count", String(count))
    );

    button.addEventListener("click", () => {
      state.category = value;
      render();
    });

    area.append(button);
  }

  add("Todas", "", state.tools.length);

  for (const category of CATEGORIES) {
    if (counts.has(category)) {
      add(category, category, counts.get(category));
    }
  }
}

function render() {
  renderCategories();

  const tools = filteredTools();
  const area = $("cards");

  area.replaceChildren();

  $("currentCategory").textContent =
    state.category || "Todas as ferramentas";

  $("resultCount").textContent =
    tools.length + " de " + state.tools.length + " ferramentas";

  const groups = new Map();

  for (const tool of tools) {
    if (!groups.has(tool.categoria)) {
      groups.set(tool.categoria, []);
    }

    groups.get(tool.categoria).push(tool);
  }

  for (const category of CATEGORIES) {
    if (!groups.has(category)) continue;

    const section = node("section", "tool-category-section");

    section.append(
      node("h2", "tool-category-title", category)
    );

    const grid = node("div", "tool-category-grid");

    const entries = groups.get(category).sort(
      (a, b) => a.nome.localeCompare(b.nome, "pt-BR")
    );

    if (state.sort === "reverse") entries.reverse();

    for (const tool of entries) {
      grid.append(makeCard(tool));
    }

    section.append(grid);
    area.append(section);
  }

  if (!tools.length) {
    area.append(
      node("div", "empty", "Nenhuma ferramenta encontrada.")
    );
  }
}

function reset() {
  state.category = "";
  state.search = "";
  state.sort = "name";

  $("search").value = "";
  $("sort").value = "name";

  render();
}

$("search").addEventListener("input", event => {
  state.search = event.target.value;
  render();
});

$("sort").addEventListener("change", event => {
  state.sort = event.target.value;
  render();
});

$("clearSearch").addEventListener("click", () => {
  state.search = "";
  $("search").value = "";
  render();
});

$("clearFilters").addEventListener("click", reset);

async function initialize() {
  try {
    const response = await fetch("/tools.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw Error("HTTP " + response.status);
    }

    const tools = await response.json();

    if (!Array.isArray(tools)) {
      throw Error("Formato JSON invalido");
    }

    state.tools = tools;
    render();
  } catch (error) {
    console.error(error);
    $("resultCount").textContent = "Erro ao carregar ferramentas";
  }
}

initialize();