import ThemeEngine from "../../core/theme-base.js";

function getRandomInt(min, max) {
  const lo = Math.ceil(Number(min) || 0);
  const hi = Math.floor(Number(max) || 0);

  if (hi <= lo) {
    return lo;
  }

  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

// Fantasy-specific gender logic moved out of script.js in Step 2.
export function getGenderByRace(race) {
  const rand = Math.random() * 100;
  const r = String(race || "").trim();

  if (["Фея", "Гарпия"].includes(r)) {
    return "Женщина";
  }

  if (r === "Тёмный эльф (дроу)") {
    if (rand < 91) return "Женщина";
    return "Мужчина";
  }

  if (["Эльф", "Лесной эльф", "Высший эльф"].includes(r)) {
    if (rand < 80) return "Женщина";
    if (rand < 98) return "Мужчина";
    return "Бесполый";
  }

  if (r === "Нимфа") {
    if (rand < 80) return "Женщина";
    if (rand < 90) return "Мужчина";
    return "Бесполый";
  }

  if (rand < 50) return "Женщина";
  if (rand < 92) return "Мужчина";
  return "Бесполый";
}

// Fantasy-specific age logic moved out of script.js in Step 2.
export function getAgeByRace(race) {
  const r = String(race || "").trim();
  const ranges = {
    "Высший эльф": [100, 700],
    "Эльф": [100, 600],
    "Лесной эльф": [80, 550],
    "Тёмный эльф (дроу)": [80, 500],
    "Гном": [40, 450],
    "Дворф": [40, 350],
    "Орк": [15, 140],
    "Нимфа": [20, 400],
    "Сатир": [20, 400],
    "Аасимар": [18, 120],
    "Кобольд": [10, 90],
    "Тролль": [15, 90],
    "Тифлинг": [16, 80],
    "Драконорожденный": [15, 75],
    "Ламия": [15, 70],
    "Гарпия": [15, 70],
    "Гоблин": [8, 50],
    "Фея": [10, 100],
    "Младший Демон": [10, 1000],
    "Суккуб/Инкуб": [100, 10000]
  };

  const pair = ranges[r] || [18, 60];
  return getRandomInt(pair[0], pair[1]);
}

export default class FantasyTheme extends ThemeEngine {
  constructor() {
    super({ id: "fantasy", name: "Fantasy" });
  }

  getAge(context = {}) {
    return getAgeByRace(context.race ?? context.fallback);
  }

  getGender(context = {}) {
    return getGenderByRace(context.race ?? context.fallback);
  }
}
