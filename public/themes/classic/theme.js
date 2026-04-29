import ThemeEngine from "../../core/theme-base.js";

// Classic uses the base behavior for now.
// Existing script.js generation and card loading still own the real game logic.
export default class ClassicTheme extends ThemeEngine {
  constructor() {
    super({ id: "classic", name: "Classic" });
  }

  getAge(context = {}) {
    return context.fallback ?? null;
  }

  getGender(context = {}) {
    return context.fallback ?? null;
  }
}
