const THEME_MODULES = {
  classic: "../themes/classic/theme.js",
  fantasy: "../themes/fantasy/theme.js"
};

const THEME_STYLES = {
  classic: "",
  fantasy: "/themes/fantasy/style.css"
};

const fallbackTheme = {
  id: "classic",
  name: "Classic",
  isFallback: true,
  getAge: (context = {}) => context.fallback ?? null,
  getGender: (context = {}) => context.fallback ?? null,
  calculateSurvival: () => null,
  getThemeStyles: () => "",
  loadCards: async () => null,
  loadData: async () => null
};

let currentTheme = fallbackTheme;
const themeCache = new Map();
let loadSequence = 0;
let currentLoadPromise = Promise.resolve(currentTheme);

function normalizeThemeId(themeId) {
  return THEME_MODULES[themeId] ? themeId : "classic";
}

function setCurrentTheme(theme) {
  currentTheme = theme || fallbackTheme;
  window.currentTheme = currentTheme;
  setThemeStyle(currentTheme.id);
  console.log(`[theme] currentTheme set: ${currentTheme.id}`);
  window.dispatchEvent(new CustomEvent("hope:theme-loaded", { detail: { theme: currentTheme } }));
  return currentTheme;
}

export function setThemeStyle(themeId = "classic") {
  const resolvedThemeId = normalizeThemeId(themeId);
  let link = document.querySelector("#theme-style");

  if (!link) {
    link = document.createElement("link");
    link.id = "theme-style";
    link.rel = "stylesheet";
    document.head.append(link);
  }

  const href = THEME_STYLES[resolvedThemeId] || "";

  if (!href) {
    link.removeAttribute("href");
    console.log(`[theme] style cleared: ${resolvedThemeId}`);
    return "";
  }

  if (link.getAttribute("href") !== href) {
    link.setAttribute("href", href);
  }

  console.log(`[theme] style set: ${href}`);
  return href;
}

// Step 2: dynamically import the selected theme plugin without reloading the page.
export async function loadTheme(themeId = "classic") {
  const resolvedThemeId = normalizeThemeId(themeId);
  const sequence = ++loadSequence;

  if (currentTheme?.id === resolvedThemeId && !currentTheme.isFallback) {
    console.log(`[theme] already loaded: ${resolvedThemeId}`);
    return currentTheme;
  }

  console.log(`[theme] loading: ${resolvedThemeId}`);
  currentLoadPromise = (async () => {
    try {
      let theme = themeCache.get(resolvedThemeId);

      if (!theme) {
        const module = await import(THEME_MODULES[resolvedThemeId]);
        const ThemeClass = module.default;
        theme = new ThemeClass();
        themeCache.set(resolvedThemeId, theme);
      }

      if (sequence === loadSequence) {
        console.log(`[theme] loaded: ${resolvedThemeId}`);
        return setCurrentTheme(theme);
      }

      return currentTheme;
    } catch (error) {
      console.error(`[theme] failed to load ${resolvedThemeId}; falling back to classic.`, error);
      if (sequence === loadSequence) {
        return setCurrentTheme(themeCache.get("classic") || fallbackTheme);
      }

      return currentTheme;
    }
  })();

  return currentLoadPromise;
}

export function getCurrentTheme() {
  return currentTheme;
}

export function whenThemeReady() {
  return currentLoadPromise.catch(() => fallbackTheme);
}

export function attachThemeSelect(select = document.querySelector("#themeSelect")) {
  if (!select || select.dataset.themeEngineAttached === "true") {
    return;
  }

  select.dataset.themeEngineAttached = "true";
  select.addEventListener("change", async () => {
    await loadTheme(select.value);
  });

  loadTheme(select.value || "classic").catch((error) => {
    console.error("Initial theme module failed to load.", error);
  });
}

window.HopeThemeEngine = {
  attachThemeSelect,
  getCurrentTheme,
  loadTheme,
  setThemeStyle,
  whenThemeReady,
  get currentTheme() {
    return currentTheme;
  }
};

setCurrentTheme(fallbackTheme);
window.dispatchEvent(new CustomEvent("hope:theme-engine-ready", { detail: window.HopeThemeEngine }));

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => attachThemeSelect(), { once: true });
} else {
  attachThemeSelect();
}
