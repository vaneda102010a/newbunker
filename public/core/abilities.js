import { generateAgeForRace } from "./engine.js";

function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function applyPolymorph(targetPlayerId) {
  const pack = window.currentPack;

  if (!pack || !Array.isArray(pack.players)) return;

  const player = pack.players.find((p) => Number(p.number) === Number(targetPlayerId));
  if (!player) return;

  const cardDb = window.cardDatabase || {};

  // Choose new race from the theme's `Пол` section when available, otherwise reuse current value
  const raceCandidates = cardDb["Пол"] && cardDb["Пол"].length ? cardDb["Пол"] : [player.race || player.gender];
  const newRace = pickRandom(raceCandidates) || (player.race || player.gender || "Не указано");

  // Determine new gender: prefer theme logic if available
  let newGender = Math.random() > 0.5 ? "Мужчина" : "Женщина";

  if (typeof window.getThemeGenderByRace === "function") {
    try {
      const g = window.getThemeGenderByRace(newRace, newGender);
      if (g) newGender = g;
    } catch (e) {
      // ignore and keep random
    }
  }

  // New body type
  const bodyCandidates = cardDb["Тип тела"] && cardDb["Тип тела"].length ? cardDb["Тип тела"] : [player.bodyType || "Не указано"];
  const newBody = pickRandom(bodyCandidates) || player.bodyType || "Не указано";

  // New age using theme-aware helper (returns formatted string like '123 лет')
  const newAge = typeof generateAgeForRace === "function" ? generateAgeForRace(newRace) : String(new Date().getFullYear() - 1990) + " лет";

  // Apply changes to player object
  player.race = newRace;
  player.gender = newGender;
  player.bodyType = newBody;
  player.age = newAge;

  // Refresh UI and log
  if (typeof window.addGameLog === "function") {
    window.addGameLog(`Игрок ${player.number} превратился в: ${newRace} (${newGender}), ${newAge}`);
  }

  if (typeof window.renderPack === "function") {
    window.renderPack(pack);
  }

  if (typeof window.renderGameLog === "function") {
    window.renderGameLog();
  }

  // Notify server if socket exists
  if (window.socket && typeof window.socket.emit === "function") {
    try {
      window.socket.emit("abilityUsed", {
        type: "polymorph",
        target: player.number,
        details: `превратился в: ${newRace} (${newGender}), ${newAge}`
      });
    } catch (e) {
      // ignore emit errors
    }
  }
}

// Expose for legacy callers
if (!window.CoreAbilities) window.CoreAbilities = {};
window.CoreAbilities.applyPolymorph = applyPolymorph;

export default { applyPolymorph };
