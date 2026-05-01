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

// Utility: generate age for a given race using the active theme's age logic.
export function generateAgeForRace(race) {
  const theme = getCurrentTheme();

  // Helper: integer random inclusive
  function randInt(min, max) {
    const lo = Math.ceil(Number(min) || 0);
    const hi = Math.floor(Number(max) || 0);
    if (hi <= lo) return lo;
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  function getRussianYearWord(age) {
    const lastTwo = age % 100;
    const last = age % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return "лет";
    if (last === 1) return "год";
    if (last >= 2 && last <= 4) return "года";
    return "лет";
  }

  let numeric = null;

  try {
    if (theme && typeof theme.getAge === "function") {
      numeric = theme.getAge({ race, fallback: null });
    }
  } catch (e) {
    numeric = null;
  }

  if (numeric == null) {
    numeric = randInt(18, 60);
  }

  // If theme returned a range-like array, handle it
  if (Array.isArray(numeric) && numeric.length >= 2) {
    numeric = randInt(Number(numeric[0]) || 18, Number(numeric[1]) || 60);
  }

  // Ensure integer
  numeric = Number(numeric) || randInt(18, 60);

  return `${numeric} ${getRussianYearWord(numeric)}`;
}

// Generate dependent shelter resources using a bell-curve (weighted) random for food.
// Returns { duration: <months>, food: <months> }
export function generateShelterResources(options = {}) {
  const minDuration = Number(options.minDuration) || 6; // months
  const maxDuration = Number(options.maxDuration) || 60; // months

  // 1) Random total stay duration (inclusive)
  const stayDuration = Math.floor(Math.random() * (maxDuration - minDuration + 1)) + minDuration;

  // 2) Weighted random (approximate bell curve) helper
  function getWeightedRandom(min, max, iterations = 3) {
    let total = 0;
    for (let i = 0; i < iterations; i++) {
      total += Math.random();
    }
    const avg = total / iterations; // in [0,1]
    // Map to integer range [min, max]
    return Math.floor(avg * (max - min + 1) + min);
  }

  // Food supply: at least 1 month, at most the stay duration
  const foodSupply = Math.max(1, Math.min(stayDuration, getWeightedRandom(1, stayDuration, 3)));

  return {
    duration: stayDuration,
    food: foodSupply
  };
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
