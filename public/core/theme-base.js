// Base class for theme plugins.
// Step 1 keeps these methods safe and simple so old game logic can continue to run.
export class ThemeEngine {
  constructor(options = {}) {
    this.id = options.id || "base";
    this.name = options.name || "Base Theme";
  }

  getAge(context = {}) {
    return context.fallback ?? null;
  }

  getGender(context = {}) {
    return context.fallback ?? null;
  }

  calculateSurvival() {
    return null;
  }

  getThemeStyles() {
    return "";
  }

  async loadCards() {
    return null;
  }

  async loadData() {
    return null;
  }
}

export default ThemeEngine;
