const cardColors = ["#9b5cff", "#32aaf3", "#3bd26f", "#ff8b25", "#ffc928", "#ff477d", "#4fd1c5", "#f97316"];
const ROLE_HOST = "host";
const ROLE_PLAYER = "player";
const VIEW_CARDS = "cards";
const VIEW_TABLE = "table";
const CHARACTER_VIEW_STORAGE_KEY = "bunkerCharacterView";
const START_PLAYER_NAME_STORAGE_KEY = "bunkerPlayerName";
const PUBLIC_APP_URL = "http://198.211.104.191:3000";
const DEFAULT_THEME_ID = "classic";
const themes = [
  { id: "classic", name: "Классическая" },
  { id: "fantasy", name: "Фэнтези" }
];
const themeCardSources = {
  classic: { path: "/api/cards/classic", fileName: "classic/cards.txt", allowFallback: true },
  fantasy: { path: "/api/cards/fantasy", fileName: "fantasy/cards.txt", allowFallback: false }
};
const characterTraits = [
  { key: "gender", label: "Пол" },
  { key: "bodyType", label: "Тип тела" },
  { key: "trait", label: "Черта" },
  { key: "age", label: "Возраст" },
  { key: "profession", label: "Профессия" },
  { key: "health", label: "Здоровье" },
  { key: "hobby", label: "Хобби" },
  { key: "phobia", label: "Фобия" },
  { key: "largeInventory", label: "Крупное" },
  { key: "backpack", label: "Рюкзак" },
  { key: "additionalInfo", label: "Инфо" },
  { key: "specialAbility", label: "Способн." }
];

const tableTraits = [
  { key: "gender", label: "Пол" },
  { key: "age", label: "Возраст" },
  { key: "health", label: "Здоровье" },
  { key: "trait", label: "Черта" },
  { key: "bodyType", label: "Тип тела" },
  { key: "profession", label: "Профессия" },
  { key: "hobby", label: "Хобби" },
  { key: "phobia", label: "Фобия" },
  { key: "largeInventory", label: "Крупное" },
  { key: "backpack", label: "Рюкзак" },
  { key: "additionalInfo", label: "Инфо" },
  { key: "specialAbility", label: "Спец. воз." }
];

const traitIcons = {
  gender: "👤",
  bodyType: "▣",
  trait: "✦",
  age: "⏳",
  profession: "🛠",
  health: "❤️",
  hobby: "🎯",
  phobia: "😱",
  largeInventory: "📦",
  backpack: "🎒",
  additionalInfo: "ℹ",
  specialAbility: "⚡"
};

const traitToneKeywords = {
  good: [
    "врач",
    "инженер",
    "механик",
    "фермер",
    "электрик",
    "первая помощь",
    "выживание",
    "сильный иммунитет",
    "идеальное здоровье",
    "абсолютно здоров"
  ],
  bad: [
    "рак",
    "психоз",
    "шизофрения",
    "наркомания",
    "инсульт",
    "инфаркт",
    "алкоголизм",
    "хрупкие кости",
    "тяжелые болезни"
  ],
  rare: [
    "тайный агент",
    "знает другой бункер",
    "выживал в катастрофе",
    "уникальные способности"
  ]
};

const cardSections = {
  gender: "Пол",
  bodyType: "Тип тела",
  trait: "Черта",
  profession: "Профессия",
  health: "Здоровье",
  hobby: "Хобби",
  phobia: "Фобия",
  largeInventory: "Крупное",
  backpack: "Рюкзак",
  additionalInfo: "Инфо",
  specialAbility: "Способность"
};
const requiredCardSections = Object.values(cardSections);
const repeatAllowedSections = new Set(["Пол", "Тип тела", "Здоровье"]);
const ABILITY_TARGET_TYPES = {
  SELF: "self",
  OTHER_PLAYER: "otherPlayer",
  ANY_PLAYER: "anyPlayer",
  NO_TARGET: "noTarget"
};
const ABILITY_EFFECT_TYPES = {
  REVEAL: "reveal",
  PROTECT: "protect",
  SWAP: "swap",
  SWAP_IDENTITY: "swapIdentity",
  STEAL: "steal",
  REROLL: "reroll",
  COPY_TRAIT: "copyTrait",
  SET_HEALTH: "setHealth",
  POLYMORPH: "polymorph",
  NOOP: "noop",
  UNSUPPORTED: "unsupported"
};

const themeSelect = document.querySelector("#themeSelect");
const playerCountSelect = document.querySelector("#playerCountSelect");
const styleSelect = document.querySelector("#styleSelect");
const difficultySelect = document.querySelector("#difficultySelect");
const generateButton = document.querySelector("#generateButton");
const randomThemeButton = document.querySelector("#randomThemeButton");
const statusMessage = document.querySelector("#statusMessage");
const packSummary = document.querySelector("#packSummary");
const characterGrid = document.querySelector("#characterGrid");
const cardViewButton = document.querySelector("#cardViewButton");
const tableViewButton = document.querySelector("#tableViewButton");
const survivalButton = document.querySelector("#survivalButton");
const gameLogList = document.querySelector("#gameLogList");
const gameLogPanel = gameLogList?.closest(".game-log-panel");
const helpButton = document.querySelector("#helpButton");
const settingsPanelButton = document.querySelector("#settingsPanelButton");
const roomPanelButton = document.querySelector("#roomPanelButton");
const rolePanelButton = document.querySelector("#rolePanelButton");
const votingButton = document.querySelector("#votingButton");
const setupModals = document.querySelectorAll("[data-setup-modal]");
const helpModal = document.querySelector("#helpModal");
const helpCloseButton = document.querySelector("#helpCloseButton");
const votingModal = document.querySelector("#votingModal");
const votingCloseButton = document.querySelector("#votingCloseButton");
const votingTimer = document.querySelector("#votingTimer");
const votingStatus = document.querySelector("#votingStatus");
const votingSetup = document.querySelector("#votingSetup");
const votingList = document.querySelector("#votingList");
const votingParticipants = document.querySelector("#votingParticipants");
const votingResults = document.querySelector("#votingResults");
const votingFinishButton = document.querySelector("#votingFinishButton");
const votingResetButton = document.querySelector("#votingResetButton");
const survivalModal = document.querySelector("#survivalModal");
const survivalCloseButton = document.querySelector("#survivalCloseButton");
const survivalOkButton = document.querySelector("#survivalOkButton");
const survivalResult = document.querySelector("#survivalResult");
const createRoomButton = document.querySelector("#createRoomButton");
const joinRoomButton = document.querySelector("#joinRoomButton");
const roomNameInput = document.querySelector("#roomNameInput");
const roomCodeInput = document.querySelector("#roomCodeInput");
const startScreen = document.querySelector("#startScreen");
const startCreateButton = document.querySelector("#startCreateButton");
const startJoinButton = document.querySelector("#startJoinButton");
const startDevTestButton = document.querySelector("#startDevTestButton");
const startCreateModal = document.querySelector("#startCreateModal");
const startJoinModal = document.querySelector("#startJoinModal");
const startCreateNameInput = document.querySelector("#startCreateNameInput");
const startJoinNameInput = document.querySelector("#startJoinNameInput");
const startJoinRoomCodeInput = document.querySelector("#startJoinRoomCodeInput");
const startCreateThemeSelect = document.querySelector("#startCreateThemeSelect");
const startCreatePlayerCountSelect = document.querySelector("#startCreatePlayerCountSelect");
const startCreateStyleSelect = document.querySelector("#startCreateStyleSelect");
const startCreateDifficultySelect = document.querySelector("#startCreateDifficultySelect");
const startCreateConfirmButton = document.querySelector("#startCreateConfirmButton");
const startJoinConfirmButton = document.querySelector("#startJoinConfirmButton");
const startStatus = document.querySelector("#startStatus");
const roomInfo = document.querySelector("#roomInfo");
const roomCodeDisplay = document.querySelector("#roomCodeDisplay");
const roomInviteLink = document.querySelector("#roomInviteLink");
const roomPlayersList = document.querySelector("#roomPlayersList");
const startGameButton = document.querySelector("#startGameButton");
const hostRoleButton = document.querySelector("#hostRoleButton");
const playerRoleButton = document.querySelector("#playerRoleButton");
const playerSetup = document.querySelector("#playerSetup");
const playerNumberSelect = document.querySelector("#playerNumberSelect");
const playerNameInput = document.querySelector("#playerNameInput");

const catastropheTabTitle = document.querySelector("#catastropheTabTitle");
const catastropheTabText = document.querySelector("#catastropheTabText");
const bunkerTabText = document.querySelector("#bunkerTabText");
const confirmModal = document.querySelector("#confirmModal");
const confirmTitle = document.querySelector("#confirmTitle");
const confirmMessage = document.querySelector("#confirmMessage");
const confirmYesButton = document.querySelector("#confirmYesButton");
const confirmNoButton = document.querySelector("#confirmNoButton");
const abilityModal = document.querySelector("#abilityModal");
const abilityPlayerLabel = document.querySelector("#abilityPlayerLabel");
const abilityTitle = document.querySelector("#abilityTitle");
const abilityDescription = document.querySelector("#abilityDescription");
const abilityTargetField = document.querySelector("#abilityTargetField");
const abilityTargetSelect = document.querySelector("#abilityTargetSelect");
const abilityTargetHint = document.querySelector("#abilityTargetHint");
const abilityTraitField = document.querySelector("#abilityTraitField");
const abilityTraitSelect = document.querySelector("#abilityTraitSelect");
const abilityAdminNote = document.querySelector("#abilityAdminNote");
const abilityConfirmButton = document.querySelector("#abilityConfirmButton");
const abilityCancelButton = document.querySelector("#abilityCancelButton");
const appContainer = document.querySelector("#appContainer, .app-container, .page");

let cardDatabase = createEmptyCardDatabase();
let currentPack = null;
let excludedPlayers = new Set();
let revealedTraits = {};
let newlyRevealedTraitKeys = new Set();
let confirmAction = null;
let usedAbilities = {};
let protectedPlayers = new Set();
let gameLog = [];
let pendingAbility = null;
let appRole = "";
let currentPlayerNumber = 1;
let currentPlayerName = "";
let cardsAreReady = false;
let socket = null;
let currentRoomCode = "";
let currentSocketId = "";
let roomPlayers = [];
let localPlayerId = null;
let currentLobby = null;
let localTurnPlayerNumber = 1;
let localRoundNumber = 1;
let lastChangedCell = null;
let isKicked = false;
let characterView = getSavedCharacterView();
let pendingCreateRoomName = "";
let votingState = null;
let votingSetupOpen = false;
let localVotingCandidates = new Set();
let votingCountdownTimer = null;
let dismissedVotingId = "";
const cardDatabaseCache = new Map();
const fallbackThemeEngine = {
  id: DEFAULT_THEME_ID,
  name: "Classic",
  isFallback: true,
  getAge: (context = {}) => context.fallback ?? null,
  getGender: (context = {}) => context.fallback ?? null,
  calculateSurvival: () => null,
  getThemeStyles: () => "",
  loadCards: async () => null,
  loadData: async () => null
};
let currentTheme = fallbackThemeEngine;
let themeIsLoading = false;
let themeEngineWaitPromise = null;
let themeLoadSequence = 0;

window.currentTheme = window.currentTheme || currentTheme;
console.log(`[theme] script fallback currentTheme set: ${currentTheme.id}`);

function getSavedCharacterView() {
  try {
    return localStorage.getItem(CHARACTER_VIEW_STORAGE_KEY) === VIEW_CARDS ? VIEW_CARDS : VIEW_TABLE;
  } catch (error) {
    return VIEW_TABLE;
  }
}

function getSelectedText(select) {
  return select.options[select.selectedIndex].textContent.trim();
}

function renderThemeOptions() {
  if (!themeSelect) {
    return;
  }

  const options = themes
    .map((theme) => `<option value="${theme.id}" ${theme.id === DEFAULT_THEME_ID ? "selected" : ""}>${theme.name}</option>`)
    .join("");

  themeSelect.innerHTML = options;

  if (startCreateThemeSelect) {
    startCreateThemeSelect.innerHTML = options;
  }
}

function getThemeById(themeId) {
  return themes.find((theme) => theme.id === themeId) || themes[0];
}

function getSelectedTheme() {
  return getThemeById(themeSelect?.value || DEFAULT_THEME_ID);
}

function setActiveTheme(themeId) {
  const isFantasy = getThemeById(themeId).id === "fantasy";
  document.body.classList.toggle("theme-fantasy", isFantasy);
  appContainer?.classList.toggle("theme-fantasy", isFantasy);

  let particles = document.querySelector(".fantasy-particles");
  if (isFantasy && !particles) {
    particles = document.createElement("div");
    particles.className = "fantasy-particles";
    particles.setAttribute("aria-hidden", "true");
    document.body.append(particles);
  } else if (!isFantasy && particles) {
    particles.remove();
  }
}

function applySelectedTheme() {
  const selectedThemeId = getSelectedTheme().id;
  setActiveTheme(selectedThemeId);
  loadThemeEngine(selectedThemeId);
}

// Step 2 bridge: the ES module engine owns plugin imports, while script.js keeps the old game flow.
function setCurrentThemeEngine(theme) {
  currentTheme = theme || fallbackThemeEngine;
  window.currentTheme = currentTheme;
  console.log(`[theme] script currentTheme set: ${currentTheme.id}`);
  return currentTheme;
}

function setThemeLoading(isLoading) {
  themeIsLoading = Boolean(isLoading);
  updateControlAvailability();
}

function waitForThemeEngineApi() {
  if (typeof window.HopeThemeEngine?.loadTheme === "function") {
    return Promise.resolve(window.HopeThemeEngine);
  }

  if (themeEngineWaitPromise) {
    return themeEngineWaitPromise;
  }

  themeEngineWaitPromise = new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) {
        return;
      }

      resolved = true;
      window.removeEventListener("hope:theme-engine-ready", finish);
      resolve(window.HopeThemeEngine || null);
    };

    window.addEventListener("hope:theme-engine-ready", finish, { once: true });
    window.setTimeout(finish, 2000);
  });

  return themeEngineWaitPromise;
}

async function loadThemeEngine(themeId = DEFAULT_THEME_ID) {
  const requestedThemeId = getThemeById(themeId).id;
  const sequence = ++themeLoadSequence;
  setThemeLoading(true);

  try {
    const api = await waitForThemeEngineApi();

    if (typeof api?.loadTheme !== "function") {
      console.warn("[theme] ES module engine is not ready; using classic fallback.");
      return setCurrentThemeEngine(fallbackThemeEngine);
    }

    const theme = await api.loadTheme(requestedThemeId);
    return setCurrentThemeEngine(theme || fallbackThemeEngine);
  } catch (error) {
    console.error("[theme] Theme engine failed to load; using classic fallback.", error);
    return setCurrentThemeEngine(fallbackThemeEngine);
  } finally {
    if (sequence === themeLoadSequence) {
      setThemeLoading(false);
    }
  }
}

function getCurrentThemeEngine() {
  return currentTheme || window.HopeThemeEngine?.currentTheme || window.currentTheme || fallbackThemeEngine;
}

function getThemeAgeByRace(race, fallback = null) {
  const theme = getCurrentThemeEngine();

  if (typeof theme?.getAge === "function") {
    const age = theme.getAge({ race, fallback });
    return age ?? fallback;
  }

  return fallback;
}

function getThemeGenderByRace(race, fallback = null) {
  const theme = getCurrentThemeEngine();

  if (typeof theme?.getGender === "function") {
    const gender = theme.getGender({ race, fallback });
    return gender ?? fallback;
  }

  return fallback;
}

window.addEventListener("hope:theme-loaded", (event) => {
  setCurrentThemeEngine(event.detail?.theme || fallbackThemeEngine);
});

function getSettings() {
  const selectedTheme = getSelectedTheme();

  return {
    theme: selectedTheme.id,
    themeName: selectedTheme.name,
    playerCount: Number(getSelectedText(playerCountSelect)),
    style: getSelectedText(styleSelect),
    difficulty: getSelectedText(difficultySelect)
  };
}

function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

function setStartStatus(message, type = "") {
  if (!startStatus) {
    return;
  }

  startStatus.textContent = message || "";
  startStatus.dataset.type = type;
}

function getSavedPlayerName() {
  try {
    return localStorage.getItem(START_PLAYER_NAME_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function savePlayerName(playerName) {
  const cleanedName = cleanText(playerName, "").trim();

  if (!cleanedName) {
    return;
  }

  try {
    localStorage.setItem(START_PLAYER_NAME_STORAGE_KEY, cleanedName);
  } catch (error) {
    // localStorage can be unavailable in private or restricted contexts.
  }
}

function syncStartPlayerName(playerName) {
  const cleanedName = cleanText(playerName, "").trim();

  if (startCreateNameInput) {
    startCreateNameInput.value = cleanedName;
  }

  if (startJoinNameInput) {
    startJoinNameInput.value = cleanedName;
  }

  if (roomNameInput) {
    roomNameInput.value = cleanedName;
  }

  if (playerNameInput) {
    playerNameInput.value = cleanedName;
  }

  currentPlayerName = cleanedName;
}

function normalizeStartRoomCode(roomCode) {
  return cleanText(roomCode, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function syncStartRoomCode(roomCode) {
  const normalizedCode = normalizeStartRoomCode(roomCode);

  if (startJoinRoomCodeInput) {
    startJoinRoomCodeInput.value = normalizedCode;
  }

  if (roomCodeInput) {
    roomCodeInput.value = normalizedCode;
  }
}

function showGameShell() {
  if (startScreen) {
    startScreen.hidden = true;
  }

  if (appContainer) {
    appContainer.hidden = false;
  }
}

function showStartScreen() {
  if (startScreen) {
    startScreen.hidden = false;
  }

  if (appContainer) {
    appContainer.hidden = true;
  }
}

function openStartCreateModal() {
  setStartStatus("", "");
  const savedName = getSavedPlayerName();

  if (savedName) {
    syncStartPlayerName(savedName);
  }

  if (startCreateThemeSelect && themeSelect) {
    startCreateThemeSelect.value = themeSelect.value || DEFAULT_THEME_ID;
  }

  if (startCreatePlayerCountSelect && playerCountSelect) {
    startCreatePlayerCountSelect.value = playerCountSelect.value;
  }

  if (startCreateStyleSelect && styleSelect) {
    startCreateStyleSelect.value = styleSelect.value;
  }

  if (startCreateDifficultySelect && difficultySelect) {
    startCreateDifficultySelect.value = difficultySelect.value;
  }

  if (startCreateModal) {
    startCreateModal.hidden = false;
    startCreateNameInput?.focus();
  }
}

function openStartJoinModal() {
  setStartStatus("", "");
  const savedName = getSavedPlayerName();

  if (savedName) {
    syncStartPlayerName(savedName);
  }

  if (startJoinModal) {
    startJoinModal.hidden = false;
    startJoinNameInput?.focus();
  }
}

function closeStartModals() {
  if (startCreateModal) {
    startCreateModal.hidden = true;
  }

  if (startJoinModal) {
    startJoinModal.hidden = true;
  }
}

function applyStartCreateSettings() {
  if (startCreateThemeSelect && themeSelect) {
    themeSelect.value = startCreateThemeSelect.value || DEFAULT_THEME_ID;
  }

  if (startCreatePlayerCountSelect && playerCountSelect) {
    playerCountSelect.value = startCreatePlayerCountSelect.value;
  }

  if (startCreateStyleSelect && styleSelect) {
    styleSelect.value = startCreateStyleSelect.value;
  }

  if (startCreateDifficultySelect && difficultySelect) {
    difficultySelect.value = startCreateDifficultySelect.value;
  }

  currentPlayerNumber = clampPlayerNumber(currentPlayerNumber);
  updatePlayerNumberOptions();
  applySelectedTheme();
}

function startCreateGame() {
  const playerName = cleanText(startCreateNameInput?.value || roomNameInput?.value, "").trim();

  if (!playerName) {
    setStartStatus("Введите имя игрока.", "error");
    startCreateNameInput?.focus();
    return;
  }

  appRole = ROLE_HOST;
  syncStartPlayerName(playerName);
  applyStartCreateSettings();
  savePlayerName(playerName);
  setStartStatus("Создаем комнату...", "");
  closeStartModals();
  updateRoleControls();
  updateControlAvailability();
  createOnlineRoomAfterConfirm(playerName);
}

function startJoinGame() {
  const playerName = cleanText(startJoinNameInput?.value || roomNameInput?.value, "").trim();
  const roomCode = normalizeStartRoomCode(startJoinRoomCodeInput?.value || roomCodeInput?.value);

  if (!playerName) {
    setStartStatus("Введите имя игрока.", "error");
    startJoinNameInput?.focus();
    return;
  }

  if (!roomCode) {
    setStartStatus("Введите код комнаты.", "error");
    startJoinRoomCodeInput?.focus();
    return;
  }

  appRole = ROLE_PLAYER;
  syncStartPlayerName(playerName);
  syncStartRoomCode(roomCode);
  savePlayerName(playerName);
  setStartStatus("Подключаемся к комнате...", "");
  closeStartModals();
  updateRoleControls();
  updateControlAvailability();
  joinOnlineRoom();
}

function startDevTestGame() {
  appRole = ROLE_HOST;
  syncStartPlayerName("Test");
  savePlayerName("Test");
  setStartStatus("Запуск быстрого теста...", "");
  closeStartModals();
  updateRoleControls();
  updateControlAvailability();
  createOnlineRoomAfterConfirm("Test");
}

function initializeStartScreen() {
  const savedName = getSavedPlayerName();
  const params = getUrlParams();
  const inviteCode = params.get("room");

  if (savedName) {
    syncStartPlayerName(savedName);
  }

  if (inviteCode) {
    syncStartRoomCode(inviteCode);
  }

  showStartScreen();
}

function shouldRunDevShortcut() {
  return getUrlParams().get("dev") === "1";
}

function isHostView() {
  return appRole === ROLE_HOST;
}

function isPlayerView() {
  return appRole === ROLE_PLAYER;
}

function isOwnPlayer(playerNumber) {
  return Boolean(appRole) && Number(playerNumber) === Number(currentPlayerNumber);
}

function isOnlineRoom() {
  return Boolean(currentRoomCode && socket?.connected);
}

function isTurnModeActive() {
  return Boolean(currentPack?.players?.length) && (!isOnlineRoom() || currentLobby?.isGameStarted);
}

function getActiveTurnNumbers() {
  if (!currentPack?.players?.length) {
    return [];
  }

  return currentPack.players
    .map((player) => Number(player.number))
    .filter(Boolean)
    .filter((number) => !excludedPlayers.has(number))
    .sort((a, b) => a - b);
}

function normalizeLocalTurn() {
  const activeNumbers = getActiveTurnNumbers();
  if (!activeNumbers.length) {
    localTurnPlayerNumber = null;
    return null;
  }

  if (!activeNumbers.includes(Number(localTurnPlayerNumber))) {
    localTurnPlayerNumber = activeNumbers[0];
  }

  return localTurnPlayerNumber;
}

function advanceLocalTurn(fromPlayerNumber = localTurnPlayerNumber) {
  const activeNumbers = getActiveTurnNumbers();
  if (!activeNumbers.length) {
    localTurnPlayerNumber = null;
    return;
  }

  const previousNumber = Number(fromPlayerNumber);
  const currentIndex = activeNumbers.indexOf(previousNumber);
  let nextIndex;

  if (currentIndex === -1) {
    nextIndex = activeNumbers.findIndex((number) => number > previousNumber);
    if (nextIndex === -1) {
      nextIndex = 0;
      localRoundNumber += 1;
    }
  } else {
    nextIndex = (currentIndex + 1) % activeNumbers.length;
    if (nextIndex === 0) {
      localRoundNumber += 1;
    }
  }

  localTurnPlayerNumber = activeNumbers[nextIndex];
}

function getCurrentTurnPlayerNumber() {
  if (isOnlineRoom() && currentLobby?.isGameStarted) {
    const number = Number(currentLobby?.currentTurnPlayerNumber);
    if (number) {
      return number;
    }

    const currentPlayer = (currentLobby?.players || []).find((player) => player.id === currentLobby?.currentPlayerId);
    return Number(currentPlayer?.playerNumber) || null;
  }

  return normalizeLocalTurn();
}

function isCurrentTurnPlayer(playerNumber) {
  const currentTurnNumber = getCurrentTurnPlayerNumber();
  return Boolean(currentTurnNumber) && Number(playerNumber) === Number(currentTurnNumber);
}

function getCurrentTurnRoomPlayer() {
  const currentNumber = getCurrentTurnPlayerNumber();
  if (!currentNumber) {
    return null;
  }

  return roomPlayers.find((player) => Number(player.playerNumber) === Number(currentNumber)) || null;
}

function canRevealTrait(playerNumber) {
  const number = Number(playerNumber);
  if (excludedPlayers.has(number)) {
    return false;
  }

  if (isOnlineRoom() && currentLobby?.isGameStarted) {
    return isOwnPlayer(number) && isCurrentTurnPlayer(number);
  }

  if (isHostView()) {
    return isCurrentTurnPlayer(number);
  }

  return isOwnPlayer(number) && isCurrentTurnPlayer(number);
}

function canUseAbility(playerNumber) {
  const number = Number(playerNumber);
  return isOwnPlayer(number) && !excludedPlayers.has(number);
}

function getConfiguredPlayerCount() {
  return currentPack?.players?.length || Number(getSelectedText(playerCountSelect)) || 6;
}

function setRole(role) {
  appRole = role;
  currentPlayerNumber = clampPlayerNumber(currentPlayerNumber);
  updateRoleControls();
  updateControlAvailability();

  if (currentPack) {
    renderPack(currentPack);
  }

  setStatus(role === ROLE_HOST ? "Режим ведущего включен." : "Режим игрока включен.", "");
}

function clampPlayerNumber(playerNumber) {
  const playerCount = getConfiguredPlayerCount();
  const number = Number(playerNumber) || 1;
  return Math.min(Math.max(number, 1), playerCount);
}

function updateRoleControls() {
  const isHost = isHostView();
  const isPlayer = isPlayerView();

  hostRoleButton?.classList.toggle("active", isHost);
  playerRoleButton?.classList.toggle("active", isPlayer);

  if (playerSetup) {
    playerSetup.hidden = isOnlineRoom() || (!isHost && !isPlayer);
  }

  if (hostRoleButton) {
    hostRoleButton.disabled = isOnlineRoom();
  }

  if (playerRoleButton) {
    playerRoleButton.disabled = isOnlineRoom();
  }

  if (!isOnlineRoom()) {
    updatePlayerNumberOptions();
  }

  renderGameLog();
}

function updatePlayerNumberOptions() {
  if (!playerNumberSelect) {
    return;
  }

  const playerCount = getConfiguredPlayerCount();
  const selectedNumber = clampPlayerNumber(currentPlayerNumber);
  playerNumberSelect.innerHTML = Array.from({ length: playerCount }, (_, index) => {
    const number = index + 1;
    return `<option value="${number}" ${number === selectedNumber ? "selected" : ""}>Игрок ${number}</option>`;
  }).join("");
  currentPlayerNumber = selectedNumber;
}

function updateControlAvailability() {
  const hostCanGenerate = cardsAreReady && !themeIsLoading && isHostView();
  generateButton.disabled = !hostCanGenerate;
  randomThemeButton.disabled = !hostCanGenerate;
  if (votingButton) {
    votingButton.hidden = !isHostView();
    votingButton.disabled = !isHostView() || !isOnlineRoom() || !currentPack?.players?.length;
  }
  if (settingsPanelButton) {
    settingsPanelButton.disabled = !isHostView();
  }
  playerCountSelect.disabled = !isHostView();
  themeSelect.disabled = !isHostView();
  styleSelect.disabled = !isHostView();
  difficultySelect.disabled = !isHostView();

  // In online turn mode, reveals are turn-bound. Abilities stay available out of turn.
  if (isOnlineRoom()) {
    document.querySelectorAll('[data-action]').forEach((btn) => {
      try {
        const action = btn.dataset.action;
        if (action === 'use-ability') {
          btn.disabled = btn.classList.contains("used")
            || btn.classList.contains("locked")
            || !canUseAbility(Number(btn.dataset.player));
        } else if (action === 'reveal-trait') {
          btn.disabled = !canRevealTrait(Number(btn.dataset.player));
        } else if (action === "reveal-all") {
          btn.disabled = isTurnModeActive();
        } else {
          btn.disabled = false;
        }
      } catch (e) {}
    });
  }
}

function initializeSocket() {
  if (typeof io !== "function") {
    setStatus("Socket.IO не загружен. Онлайн-комнаты недоступны.", "error");
    return;
  }

  socket = io();

  socket.on("connect", () => {
    currentSocketId = socket.id;
    console.log("Connected:", socket.id);

    if (pendingCreateRoomName) {
      const playerName = pendingCreateRoomName;
      pendingCreateRoomName = "";
      emitCreateRoom(playerName);
    }

    const inviteCode = getUrlParams().get("room");

    if (inviteCode && roomCodeInput && !currentRoomCode) {
      syncStartRoomCode(inviteCode);
      setStatus("Введите имя и нажмите «Присоединиться к комнате».", "");
      setStartStatus("Введите имя и нажмите «Присоединиться».", "");
    }
  });

  socket.on("room-state", applyRoomState);
  socket.on("lobby-state-update", ({ lobby, publicUrl } = {}) => {
    applyLobbyState(lobby);
  });
  socket.on("roomCreated", ({ roomCode } = {}) => {
    if (!roomCode) {
      return;
    }

    console.log("Room created:", roomCode);
    currentRoomCode = roomCode;

    if (roomCodeInput) {
      roomCodeInput.value = roomCode;
    }

    window.history.replaceState(
      {},
      "",
      `?room=${roomCode}`
    );
  });
  socket.on("nextTurn", (data) => {
    try {
      console.log("Next turn:", data);
      // Optionally request fresh lobby state or rely on lobby-state-update
    } catch (e) {
      // ignore
    }
  });
  socket.on("abilityApplied", (payload) => {
    // payload: { actorName, abilityText, targetNumber, traitKey, newValue }
    try {
      const actor = payload?.actorName || `Игрок ${payload?.actorNumber || '?'}`;
      const ability = payload?.abilityText || 'способность';
      const target = payload?.targetNumber ? `Игрок ${payload.targetNumber}` : 'вас';
      const newVal = payload?.newValue || '';
      // show toast
      showNotification(`${actor} применил ${ability} против ${target}. Теперь: ${payload.traitKey || 'характеристика'} = ${newVal}`, 'info');
      // add to journal
      addGameLog(`${actor} -> ${ability} -> ${target}. Результат: ${payload.traitKey || 'характеристика'} изменена на ${newVal}`);
      renderGameLog();
      // highlight changed cell
      if (payload?.targetNumber && payload?.traitKey) {
        highlightTraitCell(payload.targetNumber, payload.traitKey);
      }
    } catch (e) {}
  });
  // server kick -> clear storage and redirect home
  socket.on('you_are_kicked', ({ roomCode } = {}) => {
    try {
      isKicked = true;
      if (roomCode) {
        try { localStorage.setItem(`bunker_kicked_${roomCode}`, '1'); } catch (e) {}
        try { localStorage.removeItem(`bunker_player_${roomCode}`); } catch (e) {}
      }
      // stop audio if any
      const audios = document.querySelectorAll('audio');
      audios.forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} });
      // notify and redirect to home
      alert('Вы были исключены из комнаты ведущим. Вы будете перенаправлены на главную.');
      window.location.href = '/';
    } catch (e) {}
  });

  socket.on('turnChanged', (payload) => {
    try {
      applyTurnPayload(payload);
      updateControlAvailability();
    } catch (e) {}
  });
  socket.on("disconnect", () => {
    setStatus("Соединение с комнатой потеряно. Переподключение...", "error");
  });
}

function createOnlineRoom() {
  const playerName = roomNameInput?.value.trim() || "";

  if (!playerName) {
    alert("Введите имя");
    return;
  }

  showConfirm(
    "Создать новую комнату?",
    "Вы точно хотите создать новую комнату, а не присоединиться к существующей?",
    () => createOnlineRoomAfterConfirm(playerName),
    {
      confirmLabel: "Создать комнату",
      cancelLabel: "Отмена"
    }
  );
}

function createOnlineRoomAfterConfirm(playerName) {
  console.log("Creating room as:", playerName);

  if (!socket?.connected) {
    pendingCreateRoomName = playerName;
    setStatus("Нет соединения с сервером комнат. Комната создастся после подключения.", "error");
    socket?.connect?.();
    return;
  }

  emitCreateRoom(playerName);
}

function emitCreateRoom(playerName) {
  if (isKicked || (currentRoomCode && localStorage.getItem(`bunker_kicked_${currentRoomCode}`))) {
    setStatus("Вы были исключены и не можете создать новую комнату без перезагрузки.", "error");
    return;
  }

  if (!socket?.connected) {
    pendingCreateRoomName = playerName;
    return;
  }

  console.log("Emit createRoom");
  socket.emit("createRoom", { playerName }, handleRoomReply);
}

function joinOnlineRoom() {
  if (isKicked || (roomCodeInput && localStorage.getItem(`bunker_kicked_${roomCodeInput.value.toUpperCase()}`))) {
    setStatus("Вы были исключены и не можете присоединиться без перезагрузки.", "error");
    return;
  }
  if (!socket?.connected) {
    setStatus("Нет соединения с сервером комнат.", "error");
    return;
  }

  const roomCode = cleanText(roomCodeInput?.value, "").toUpperCase();

  if (!roomCode) {
    setStatus("Введите код комнаты.", "error");
    return;
  }

  socket.emit("join-room", { roomCode, name: getRoomPlayerName() }, handleRoomReply);
}

function handleRoomReply(response) {
  if (!response?.ok) {
    setStatus(response?.error || "Не удалось подключиться к комнате.", "error");
    setStartStatus(response?.error || "Не удалось подключиться к комнате.", "error");
    return;
  }

  currentRoomCode = response.roomCode;
  if (response.playerId) {
    localPlayerId = response.playerId;
    try { localStorage.setItem(`bunker_player_${currentRoomCode}`, localPlayerId); } catch (e) {}
  }
  savePlayerName(getRoomPlayerName());
  showGameShell();
  setStartStatus("", "");
  setStatus(`Комната ${currentRoomCode} подключена.`, "success");
  // Try to join/reconnect to lobby using persistent playerId
  try {
    const saved = localStorage.getItem(`bunker_player_${currentRoomCode}`);
    if (saved) {
      localPlayerId = saved;
      socket.emit("reconnect-lobby", { roomCode: currentRoomCode, playerId: localPlayerId }, (res) => {
        if (!res?.ok) {
          // fallback to join
          socket.emit("join-lobby", { roomCode: currentRoomCode, playerName: getRoomPlayerName() }, (r2) => {
            if (r2?.ok) {
              localPlayerId = r2.playerId;
              try { localStorage.setItem(`bunker_player_${currentRoomCode}`, localPlayerId); } catch (e) {}
            }
          });
        }
      });
    } else {
      socket.emit("join-lobby", { roomCode: currentRoomCode, playerName: getRoomPlayerName() }, (r2) => {
        if (r2?.ok) {
          localPlayerId = r2.playerId;
          try { localStorage.setItem(`bunker_player_${currentRoomCode}`, localPlayerId); } catch (e) {}
        }
      });
    }
  } catch (err) {
    // ignore localStorage errors
  }
}

function applyLobbyState(lobby) {
  if (!lobby) return;
  currentLobby = lobby;
  currentRoomCode = lobby.roomCode || currentRoomCode;

  // Render players with kick buttons for host
  roomPlayersList.innerHTML = (lobby.players || [])
    .map((p) => {
      const name = escapeHtml(p.name || "Игрок");
      const number = Number(p.playerNumber) || null;
      const roleLabel = p.isHost ? "Ведущий" : `Игрок ${number || "-"}`;
      const isCurrent = lobby.currentPlayerId && lobby.currentPlayerId === p.id;
      const stateLabel = p.isExcluded ? " · выбыл" : isCurrent ? " · ход" : "";
      let kickButton = "";
      if (localPlayerId && lobby.hostId === localPlayerId && p.id !== localPlayerId) {
        kickButton = ` <button class="kick-button" data-player-id="${p.id}" data-socket-id="${p.socketId || ''}">Кик</button>`;
      }

      return `<li${isCurrent ? ' class="current-turn"' : ''}><span>${name}</span> <strong>${roleLabel}${stateLabel}</strong>${kickButton}</li>`;
    })
    .join("");

  // Show start button only for host and while waiting
  if (startGameButton) {
    if (localPlayerId && lobby.hostId === localPlayerId && !lobby.isGameStarted) {
      startGameButton.hidden = false;
    } else {
      startGameButton.hidden = true;
    }
  }
  // Update controls based on new lobby/turn state
  if (currentPack?.players?.length) {
    renderPack(currentPack);
  }
  updateControlAvailability();
}

function applyTurnPayload(payload = {}) {
  if (!currentLobby || !payload) {
    return;
  }

  const nextPlayerNumber = Number(payload.nextPlayerNumber);
  if (nextPlayerNumber) {
    currentLobby.currentTurnPlayerNumber = nextPlayerNumber;
  }

  if (payload.nextPlayerId) {
    currentLobby.currentPlayerId = payload.nextPlayerId;
  } else if (nextPlayerNumber) {
    const nextPlayer = (currentLobby.players || []).find((player) => Number(player.playerNumber) === nextPlayerNumber);
    currentLobby.currentPlayerId = nextPlayer?.id || currentLobby.currentPlayerId;
  }

  if (Number.isFinite(Number(payload.nextPlayerIndex))) {
    currentLobby.currentTurnIndex = Number(payload.nextPlayerIndex);
  }

  if (Number(payload.roundNumber)) {
    currentLobby.roundNumber = Number(payload.roundNumber);
  }

  currentLobby.isGameStarted = true;
  currentLobby.state = "IN_GAME";

  if (currentPack?.players?.length) {
    renderPack(currentPack);
  }
}

// Notifications (simple toast)
function ensureToastContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.style.position = 'fixed';
    container.style.right = '18px';
    container.style.top = '18px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  return container;
}

function showNotification(message, type = 'info') {
  const container = ensureToastContainer();
  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.style.marginTop = '8px';
  div.style.padding = '10px 14px';
  div.style.borderRadius = '10px';
  div.style.background = type === 'error' ? 'rgba(255,100,100,0.95)' : type === 'success' ? 'rgba(0,160,80,0.95)' : 'rgba(30,30,30,0.9)';
  div.style.color = '#fff';
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => {
    div.style.transition = 'opacity 0.3s ease';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 350);
  }, 5000);
}

// Highlight a table cell for a player trait
function highlightTraitCell(playerNumber, traitKey) {
  try {
    // remove previous
    if (lastChangedCell) {
      lastChangedCell.classList.remove('last-changed');
      lastChangedCell = null;
    }

    const table = document.querySelector('.players-table');
    if (!table) return;
    const row = table.querySelector(`tr[data-player="${playerNumber}"]`);
    if (!row) return;
    const cell = row.querySelector(`.players-table-cell.trait-${traitKey}`);
    if (!cell) return;
    cell.classList.add('last-changed');
    lastChangedCell = cell;
  } catch (e) {
    // ignore
  }
}

function isCharacterActive(characterNumber) {
  if (!currentLobby) return false;
  const currentPlayerId = currentLobby.currentPlayerId;
  if (!currentPlayerId) return false;
  const lobbyPlayer = (currentLobby.players || []).find((p) => p.id === currentPlayerId);
  if (!lobbyPlayer) return false;
  // find corresponding room player by socketId
  const slotPlayer = roomPlayers.find((rp) => rp.socketId === lobbyPlayer.socketId);
  if (!slotPlayer) return false;
  return Number(slotPlayer.playerNumber) === Number(characterNumber);
}

// Handle kick button clicks
roomPlayersList?.addEventListener("click", (e) => {
  const btn = e.target.closest(".kick-button");
  if (!btn) return;
  const playerId = btn.getAttribute("data-player-id");
  const targetSocketId = btn.getAttribute("data-socket-id");
  if ((!playerId && !targetSocketId) || !currentRoomCode) return;
  if (!confirm("Исключить этого игрока?")) return;
  // Prefer kicking by socketId when available (admin API expects targetSocketId)
  const payload = targetSocketId ? { roomCode: currentRoomCode, targetSocketId } : { roomCode: currentRoomCode, playerId };
  socket.emit("kickPlayer", payload, (res) => {
    if (!res?.ok) {
      alert(res?.error || "Не удалось кикнуть игрока");
    }
  });
});

startGameButton?.addEventListener("click", () => {
  if (!currentRoomCode) return;
  socket.emit("start-game", { roomCode: currentRoomCode }, (res) => {
    if (!res?.ok) {
      alert(res?.error || "Не удалось начать игру");
    }
  });
});

function getRoomPlayerName() {
  return cleanText(roomNameInput?.value || playerNameInput?.value, "Игрок");
}

function applyRoomState({ room, currentUser }) {
  if (!room || !currentUser) {
    return;
  }

  showGameShell();
  markNewlyRevealedTraits(room.revealedTraits || {});
  currentRoomCode = room.roomCode;
  currentSocketId = socket?.id || currentUser.socketId || currentSocketId;
  roomPlayers = room.players || [];
  appRole = currentUser.isHost ? ROLE_HOST : ROLE_PLAYER;
  currentPlayerNumber = Number(currentUser.playerNumber) || 0;
  currentPlayerName = currentUser.name || "";
  revealedTraits = room.revealedTraits || {};
  excludedPlayers = new Set(room.excludedPlayers || []);
  usedAbilities = room.usedAbilities || {};
  protectedPlayers = new Set(room.protectedPlayers || []);
  gameLog = room.gameLog || [];
  votingState = room.voting || null;

  if (room.generatedPack) {
    currentPack = room.generatedPack;
    renderPack(currentPack);
  } else {
    currentPack = null;
    characterGrid.innerHTML = "";
    updatePackSummary(null);
    updateSurvivalButton();
    updateRoleControls();
    updateControlAvailability();
    renderGameLog();
  }

  renderRoomInfo(room);
  renderGameLog();
  renderVotingFromState();
}

function renderRoomInfo(room) {
  if (!roomInfo) {
    return;
  }

  roomInfo.hidden = false;
  roomCodeDisplay.textContent = room.roomCode;

  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(room.roomCode)}`;
  roomInviteLink.href = inviteUrl;
  roomInviteLink.textContent = inviteUrl;

  roomPlayersList.innerHTML = (room.players || [])
    .map((player) => {
      const playerNumber = Number(player.playerNumber);
      const isCurrent = currentLobby?.isGameStarted && Number(getCurrentTurnPlayerNumber()) === playerNumber;
      const isExcluded = excludedPlayers.has(playerNumber);
      return `
      <li${isCurrent ? ' class="current-turn"' : ''}>
        <span>${escapeHtml(player.name || `Игрок ${player.playerNumber || "?"}`)}</span>
        <strong>${player.isHost ? "Ведущий" : `Игрок ${player.playerNumber || "-"}`}${isExcluded ? " · выбыл" : isCurrent ? " · ход" : ""}</strong>
      </li>
    `;
    })
    .join("");
}

function collectSharedState() {
  return {
    generatedPack: currentPack,
    revealedTraits,
    excludedPlayers: Array.from(excludedPlayers),
    usedAbilities,
    protectedPlayers: Array.from(protectedPlayers),
    gameLog
  };
}

function syncHostState() {
  if (!isOnlineRoom() || !isHostView()) {
    return;
  }

  socket.emit("host-sync-state", {
    roomCode: currentRoomCode,
    state: collectSharedState()
  });
}

function createEmptyCardDatabase() {
  return requiredCardSections.reduce((database, section) => {
    database[section] = [];
    return database;
  }, {});
}

function createFallbackCardDatabase() {
  const database = {
    "Пол": ["Мужчина", "Женщина", "Небинарный"],
    "Тип тела": ["Худощавый", "Крепкое телосложение", "Атлетическое", "Полный"],
    "Черта": ["Оптимист", "Скептик", "Лидер", "Миротворец", "Паникер", "Практичный"],
    "Профессия": ["Врач", "Инженер", "Повар", "Механик", "Учитель", "Охранник"],
    "Здоровье": ["Здоров", "Легкая близорукость", "Хроническая усталость", "Астма легкой формы"],
    "Хобби": ["Садоводство", "Шахматы", "Ремонт", "Первая помощь", "Кулинария", "Радиолюбительство"],
    "Фобия": ["Страх темноты", "Клаустрофобия", "Акрофобия", "Страх насекомых", "Без фобий", "Социофобия"],
    "Крупное": ["Набор инструментов", "Аптечка", "Генератор", "Ящик консервов", "Фильтр воды", "Спальный мешок"],
    "Рюкзак": ["Фонарик и батарейки", "Веревка", "Нож", "Рация", "Семена овощей", "Термос"],
    "Инфо": ["Знает план бункера", "Умеет чинить вентиляцию", "Проходил курсы выживания", "Знает местность", "Хорошо готовит", "Умеет договариваться"],
    "Способность": [
      "Поменяться рюкзаком с выбранным игроком",
      "Украсть крупный инвентарь у выбранного игрока",
      "Заставить выбранного игрока раскрыть здоровье",
      "Перегенерировать здоровье одному выбранному игроку",
      "Защититься от одной спец. возможности",
      "Один раз избежать исключения (1 раунд)"
    ]
  };

  validateCardDatabase(database, "fallback cards");
  return database;
}

function getThemeCardSource(themeId) {
  return themeCardSources[getThemeById(themeId).id] || themeCardSources[DEFAULT_THEME_ID];
}

async function loadCardsForTheme(themeId) {
  const resolvedThemeId = getThemeById(themeId).id;

  if (cardDatabaseCache.has(resolvedThemeId)) {
    return cardDatabaseCache.get(resolvedThemeId);
  }

  const database = await loadCardDatabase(resolvedThemeId);
  cardDatabaseCache.set(resolvedThemeId, database);
  return database;
}

async function loadCardDatabase(themeId = DEFAULT_THEME_ID) {
  const source = getThemeCardSource(themeId);
  const requestedUrl = new URL(source.path, window.location.href).href;
  let response;

  try {
    response = await fetch(source.path);
  } catch (error) {
    logCardsLoadError(error, requestedUrl, source.fileName, response);
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`${source.fileName} returned ${response.status} ${response.statusText}`);
    logCardsLoadError(error, requestedUrl, source.fileName, response);
    throw error;
  }

  try {
    return parseCardsText(await response.text(), source.fileName);
  } catch (error) {
    logCardsLoadError(error, requestedUrl, source.fileName, response);
    throw error;
  }
}

function logCardsLoadError(error, requestedUrl, fileName, response = null) {
  console.error(`Не удалось загрузить ${fileName}`, {
    currentUrl: window.location.href,
    requestedUrl,
    status: response ? `${response.status} ${response.statusText}` : "нет ответа",
    error
  });
}

function parseCardsText(text, fileName = "cards.txt") {
  const database = createEmptyCardDatabase();
  let currentSection = "";

  text.replace(/^\uFEFF/, "").split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      return;
    }

    const header = line.match(/^\[(.+)]$/);
    if (header) {
      currentSection = header[1].trim();
      if (!database[currentSection]) {
        database[currentSection] = [];
      }
      return;
    }

    if (currentSection) {
      database[currentSection].push(line);
    }
  });

  validateCardDatabase(database, fileName);
  return database;
}

function validateCardDatabase(database, fileName = "cards.txt") {
  const missing = requiredCardSections.filter((section) => !database[section]?.length);

  if (missing.length > 0) {
    throw new Error(`${fileName} missing cards for: ${missing.join(", ")}`);
  }
}

function setGenerationReady(isReady) {
  cardsAreReady = Boolean(isReady);
  updateControlAvailability();
}

async function generateLocalPack() {
  if (!isHostView()) {
    setStatus("Генерировать пак может только ведущий.", "error");
    return false;
  }

  if (!cardsAreReady) {
    setStatus("Карты еще загружаются.", "error");
    return false;
  }

  const settings = getSettings();
  const source = getThemeCardSource(settings.theme);

  setGenerationReady(false);
  await loadThemeEngine(settings.theme);

  try {
    cardDatabase = await loadCardsForTheme(settings.theme);
  } catch (error) {
    console.error(error);
    setStatus(`Не удалось загрузить ${source.fileName}. Проверь, что файл существует и называется точно «${source.fileName}».`, "error");
    setGenerationReady(true);
    return false;
  }

  const pack = createLocalPack(settings);
  pack.settings = settings;

  resetGameState(pack);
  renderPack(pack);

  if (isOnlineRoom()) {
    socket.emit("host-generate-pack", { roomCode: currentRoomCode, pack });
    setStatus("", "");
    setGenerationReady(true);
    return true;
  }

  setStatus("", "");
  setGenerationReady(true);
  return true;
}

function createLocalPack(settings) {
  const playerCount = Number(settings.playerCount || 6);
  const themeId = getThemeById(settings.theme || DEFAULT_THEME_ID).id;
  const availableSlots = Math.floor(playerCount / 2);
  const catastrophe = { ...pickRandom(window.BUNKER_DATA.catastrophes) };
  const bunker = createRandomizedBunker(pickRandom(window.BUNKER_DATA.bunkers), availableSlots);
  const drawState = createDrawState();
  const specialAbilityHands = createSpecialAbilityHands(playerCount, drawState);

  const players = Array.from({ length: playerCount }, (_, index) => createLocalPlayer(index, specialAbilityHands[index], drawState));

  // Для темы Фэнтези: если в разделе "Пол" хранятся расы — генерируем итоговый пол на основании расы
  if (themeId === "fantasy") {
    players.forEach((p) => {
      p.gender = getThemeGenderByRace(cleanText(p.race || p.gender, ""), p.gender);
    });
  } else if (themeId === "classic" || !themeId) {
    // For Classic theme, enforce strict gender selection and avoid malformed entries from cards.txt
    const classicGenders = ["Мужской", "Женский"];
    players.forEach((p) => {
      p.gender = pickRandom(classicGenders);
    });
  }

  return {
    themeId,
    catastrophe,
    bunker,
    players
  };
}

function createRandomizedBunker(template, availableSlots) {
  const size = randomInt(50, 300);
  const years = randomInt(3, 30);
  const resources = getBunkerResources(template, years);

  return {
    ...template,
    name: resources.name,
    description: resources.description,
    duration: resources.duration,
    food: resources.food,
    foodDescription: template.food,
    size: `${size} ${getRussianSquareMeterWord(size)}`,
    stayTime: `${years} ${getRussianYearWord(years)}`,
    availableSlots
  };
}

function getBunkerResources(template, duration) {
  if (typeof window.generateShelterResources === "function") {
    return window.generateShelterResources({
      name: template.buildTime || "Бункер",
      description: template.location || "",
      minDuration: duration,
      maxDuration: duration
    });
  }

  return {
    name: template.buildTime || "Бункер",
    description: template.location || "",
    duration,
    food: Math.max(1, Math.min(duration, randomInt(1, duration)))
  };
}

function createLocalPlayer(index, abilityCards, drawState) {
  const health = drawCard(cardSections.health, drawState);
  const race = drawCard("Раса", drawState);
  const age = getThemeAgeByRace(race, randomInt(18, 60));

  return {
    number: index + 1,
    race,
    gender: drawCard(cardSections.gender, drawState),
    age: age,
    bodyType: drawCard(cardSections.bodyType, drawState),
    trait: drawCard(cardSections.trait, drawState),
    profession: drawCard(cardSections.profession, drawState),
    health,
    healthSeverity: getHealthSeverity(health),
    healthExplanation: getHealthExplanation(health),
    hobby: drawCard(cardSections.hobby, drawState),
    phobia: drawCard(cardSections.phobia, drawState),
    largeInventory: drawCard(cardSections.largeInventory, drawState),
    backpack: drawCard(cardSections.backpack, drawState),
    additionalInfo: drawCard(cardSections.additionalInfo, drawState),
    // split abilities into two separate fields for table columns
    specialAbility: abilityCards[0] || "",
    specialAbility2: abilityCards[1] || "",
    accent: cardColors[index % cardColors.length]
  };
}

function createDrawState() {
  return {
    usedBySection: new Map()
  };
}

function drawCard(section, drawState, excluded = new Set()) {
  // sanitize card list: remove empty or whitespace-only entries
  const rawCards = cardDatabase[section] || [];
  const cards = rawCards.filter((c) => {
    try {
      return String(c).trim().length > 0;
    } catch (e) {
      return false;
    }
  });

  if (cards.length === 0) {
    return "Не указано";
  }

  if (repeatAllowedSections.has(section)) {
    return pickRandom(cards);
  }

  if (!drawState.usedBySection.has(section)) {
    drawState.usedBySection.set(section, new Set());
  }

  const used = drawState.usedBySection.get(section);
  const freshCards = cards.filter((card) => !used.has(card) && !excluded.has(card));
  const fallbackCards = cards.filter((card) => !excluded.has(card));
  const candidates = freshCards.length > 0 ? freshCards : fallbackCards;

  if (candidates.length === 0) {
    return "Не указано";
  }

  const card = pickRandom(candidates);
  used.add(card);
  return card;
}

function createSpecialAbilityHands(playerCount, drawState) {
  const hands = [];

  for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
    const hand = [];

    while (hand.length < 2) {
      const ability = drawCard(cardSections.specialAbility, drawState, new Set(hand));

      if (ability === "Не указано") {
        break;
      }

      hand.push(ability);
    }

    hands.push(hand);
  }

  return hands;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAge() {
  const age = randomInt(18, 80);
  return `${age} ${getRussianYearWord(age)}`;
}

function getRussianYearWord(age) {
  const lastTwoDigits = age % 100;
  const lastDigit = age % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "лет";
  }

  if (lastDigit === 1) {
    return "год";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "года";
  }

  return "лет";
}

function getRussianSquareMeterWord(value) {
  const lastTwoDigits = value % 100;
  const lastDigit = value % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "квадратных метров";
  }

  if (lastDigit === 1) {
    return "квадратный метр";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "квадратных метра";
  }

  return "квадратных метров";
}

function cleanText(value, fallback = "Не указано") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`.trim();
}

function updatePackSummary(pack) {
  if (!packSummary) {
    return;
  }

  if (!pack?.players?.length) {
    packSummary.hidden = true;
    packSummary.textContent = "";
    return;
  }

  const playerCount = pack.players.length;
  const bunkerSlots = pack.bunker?.availableSlots ?? Math.floor(playerCount / 2);
  const theme = pack.settings?.themeName || getThemeById(pack.settings?.theme || pack.themeId || themeSelect?.value).name;
  const style = pack.settings?.style || getSelectedText(styleSelect);

  packSummary.textContent = `Пак сгенерирован | Игроков: ${playerCount} | Мест в бункере: ${bunkerSlots} | Тема: ${theme} | Стиль: ${style}`;
  packSummary.hidden = false;
}

function createPlaceholderImage(character) {
  const title = escapeSvgText(canViewTrait(character.number, "profession") ? character.profession : `Игрок ${character.number}`);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#151b25"/>
          <stop offset="0.55" stop-color="#10131a"/>
          <stop offset="1" stop-color="${character.accent}"/>
        </linearGradient>
      </defs>
      <rect width="420" height="300" fill="url(#bg)"/>
      <circle cx="210" cy="118" r="56" fill="${character.accent}" opacity="0.85"/>
      <rect x="118" y="174" width="184" height="86" rx="34" fill="#05070b" opacity="0.74"/>
      <text x="210" y="276" fill="#edf0f5" font-family="Arial" font-size="22" font-weight="700" text-anchor="middle">${title}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function setCharacterView(view) {
  if (![VIEW_CARDS, VIEW_TABLE].includes(view) || characterView === view) {
    updateViewToggle();
    return;
  }

  characterView = view;

  try {
    localStorage.setItem(CHARACTER_VIEW_STORAGE_KEY, characterView);
  } catch (error) {
    // Keep the selected view for this session when storage is blocked.
  }

  updateViewToggle();

  if (currentPack?.players) {
    renderCharacters(currentPack.players);
  }
}

function updateViewToggle() {
  cardViewButton?.classList.toggle("active", characterView === VIEW_CARDS);
  tableViewButton?.classList.toggle("active", characterView === VIEW_TABLE);
  cardViewButton?.setAttribute("aria-pressed", String(characterView === VIEW_CARDS));
  tableViewButton?.setAttribute("aria-pressed", String(characterView === VIEW_TABLE));
}

function renderPack(pack) {
  currentPack = pack;
  const packThemeId = getThemeById(pack.settings?.theme || pack.themeId || themeSelect?.value || DEFAULT_THEME_ID).id;
  if (themeSelect && themeSelect.value !== packThemeId) {
    themeSelect.value = packThemeId;
  }
  setActiveTheme(packThemeId);
  updatePackSummary(pack);
  if (!isOnlineRoom()) {
    currentPlayerNumber = clampPlayerNumber(currentPlayerNumber);
    updatePlayerNumberOptions();
  }
  renderCharacters(pack.players);
  updateSurvivalButton();

  catastropheTabTitle.textContent = pack.catastrophe.title;
  catastropheTabText.innerHTML = formatCatastrophe(pack.catastrophe);
  bunkerTabText.innerHTML = formatBunker(pack.bunker, pack.themeId);
}

function updateSurvivalButton() {
  if (!survivalButton) {
    return;
  }

  survivalButton.hidden = !canCalculateSurvival();
}

function renderCharacters(characters) {
  characterGrid.innerHTML = "";
  characterGrid.classList.toggle("cards-view", characterView === VIEW_CARDS);
  characterGrid.classList.toggle("table-view", characterView === VIEW_TABLE);
  characterGrid.dataset.playerCount = String(characters.length);
  updateViewToggle();
  renderTurnBanner();

  if (characterView === VIEW_TABLE) {
    renderPlayersTable(characters);
    return;
  }

  characterGrid.style.setProperty("--player-columns", Math.min(characters.length, 6));
  const gameIsOver = isGameOver();

  characters.forEach((character) => {
    const card = document.createElement("article");
    const isExcluded = excludedPlayers.has(character.number);
    const isOwn = isOwnPlayer(character.number);
    const isTurn = isCurrentTurnPlayer(character.number);
    card.className = `character-card${isExcluded ? " excluded" : ""}${isOwn ? " own-card" : ""}${isTurn ? " current-turn-card" : ""}`;
    card.style.setProperty("--accent", character.accent);

    card.innerHTML = `
      <span class="number-badge">${character.number}</span>
      ${isOwn ? `<span class="own-card-badge">${escapeHtml(getOwnCardBadgeText())}</span>` : ""}
      <img class="portrait" src="${createPlaceholderImage(character)}" alt="Игрок ${character.number}">
      <div class="card-body">
        <h3 class="profession">${renderCardTitle(character)}</h3>
        <dl class="stats">
          ${characterTraits.map((trait) => renderTraitRow(character, trait)).join("")}
        </dl>
        ${isHostView() ? `
          <button class="reveal-all-button" type="button" data-action="force-reveal-all" data-player="${character.number}">
            Открыть все
          </button>
          <button class="exclude-button${isExcluded ? " active" : ""}" type="button" data-action="exclude" data-player="${character.number}" ${gameIsOver && !isExcluded ? "disabled" : ""}>
            ${isExcluded ? "Вернуть" : "Исключить"}
          </button>
        ` : ""}
      </div>
    `;

    characterGrid.append(card);
  });

  if (newlyRevealedTraitKeys.size > 0) {
    window.setTimeout(() => {
      newlyRevealedTraitKeys.clear();
    }, 980);
  }
}

function renderPlayersTable(characters) {
  const gameIsOver = isGameOver();

  const visibleTableTraits = [];
  for (const trait of tableTraits) {
    if (trait.key === "specialAbility" || trait.key === "specialAbility2") continue;
    visibleTableTraits.push(trait);
  }
  const table = document.createElement("div");
  table.className = "players-table-wrap table-container";
  table.innerHTML = `
    <div class="table-wrapper">
      <table class="players-table">
        <colgroup>
          <col class="players-table-player-col">
          ${visibleTableTraits.map((trait) => `<col class="players-table-data-col players-table-${trait.key}-col">`).join("")}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Игрок</th>
            ${visibleTableTraits.map((trait) => `<th scope="col">${getTableTraitLabel(trait)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${characters.map((character) => renderPlayerTableRow(character, gameIsOver, visibleTableTraits)).join("")}
        </tbody>
      </table>
    </div>
  `;

  characterGrid.append(table);
  const abilitiesHtml = `
    <div class="abilities-panel-wrap table-container">
      <div class="abilities-panel">
        ${characters.map((character) => renderAbilitiesPanelCard(character)).join("")}
      </div>
    </div>
  `;

  characterGrid.insertAdjacentHTML("beforeend", abilitiesHtml);
}

function renderPlayerTableRow(character, gameIsOver, visibleTableTraits = tableTraits) {
  const isExcluded = excludedPlayers.has(character.number);
  const isOwn = isOwnPlayer(character.number);
  const isTurn = isCurrentTurnPlayer(character.number);
  const playerTitle = getTablePlayerTitle(character);

  return `
    <tr class="${isExcluded ? "excluded" : ""}${isOwn ? " own-row" : ""}${isTurn ? " current-turn-row" : ""}" style="--accent: ${character.accent}" data-player="${character.number}">
      <td class="players-table-player" title="${escapeHtml(playerTitle)}">${renderPlayerTableSlot(character, isExcluded, gameIsOver)}</td>
      ${visibleTableTraits.map((trait, columnIndex) => {
        return `
          <td class="players-table-cell trait-${trait.key}${isNewlyRevealedTrait(character.number, trait.key) ? " revealed-now-cell" : ""}" data-column="${columnIndex + 1}" title="${escapeHtml(getTableTraitTitle(character, trait))}">
            ${renderTraitValue(character, trait, { view: VIEW_TABLE })}
          </td>
        `;
      }).join("")}
    </tr>
  `;
}

function getTablePlayerTitle(character) {
  const slotPlayer = getRoomPlayerForSlot(character.number);
  return slotPlayer?.name || (isOwnPlayer(character.number) && currentPlayerName) || `Игрок ${character.number}`;
}

function getTableTraitTitle(character, trait) {
  if (!canViewTrait(character.number, trait.key)) {
    return "🔒";
  }

  if (trait.key === "specialAbility") {
    const abilities = getPlayerAbilities(character);
    return abilities.join(" / ") || "Не указано";
  }

  if (trait.key === "specialAbility2") {
    const abilities = getPlayerAbilities(character);
    return abilities[1] || "Не указано";
  }

  if (shouldShowFantasyRaceWithGender(character, trait)) {
    return getFantasyRaceGenderLines(character).join(" / ");
  }

  return cleanText(character[trait.key], "");
}

function getTableTraitLabel(trait) {
  if (trait.key === "gender" && isFantasyPackActive()) {
    return "Пол / Раса";
  }

  return trait.label;
}

function renderPlayerTableSlot(character, isExcluded, gameIsOver) {
  const slotPlayer = getRoomPlayerForSlot(character.number);
  const isOwn = isOwnPlayer(character.number);
  const playerName = slotPlayer?.name || (isOwn && currentPlayerName) || `Игрок ${character.number}`;
  const statusClass = isOwn ? "own" : slotPlayer ? "occupied" : "free";
  const statusText = isOwn ? "Мой слот" : slotPlayer ? "Занято" : "Занять слот";

  return `
    <div class="players-table-slot">
      <div class="players-table-player-main">
        <span class="players-table-player-name">${escapeHtml(playerName)}</span>
        <span class="players-table-slot-status ${statusClass}">${statusText}</span>
      </div>
      ${isHostView() ? `
        <div class="players-table-host-actions">
          <button class="trait-mini-action" type="button" data-action="force-reveal-all" data-player="${character.number}" aria-label="Принудительно открыть все Игроку ${character.number}">◎</button>
          <button class="trait-mini-action exclude-table-action${isExcluded ? " active" : ""}" type="button" data-action="exclude" data-player="${character.number}" aria-label="${isExcluded ? "Вернуть" : "Исключить"} Игрока ${character.number}" ${gameIsOver && !isExcluded ? "disabled" : ""}>${isExcluded ? "↩" : "×"}</button>
        </div>
      ` : ""}
    </div>
  `;
}

function getRoomPlayerForSlot(playerNumber) {
  return roomPlayers.find((player) => Number(player.playerNumber) === Number(playerNumber)) || null;
}

function getOwnCardBadgeText() {
  return "Мой слот";
}

function renderCardTitle(character) {
  if (canViewTrait(character.number, "profession")) {
    return escapeHtml(character.profession);
  }

  return `Игрок ${character.number}`;
}

function renderTraitRow(character, trait) {
  const value = renderTraitValue(character, trait);
  const icon = traitIcons[trait.key] || "•";
  const revealClass = isNewlyRevealedTrait(character.number, trait.key) ? " revealed-now-row" : "";

  return `
    <div class="trait-row trait-${trait.key}${revealClass}">
      <dt><span class="trait-label-icon" aria-hidden="true">${icon}</span><span>${trait.label}</span></dt>
      <dd>${value}</dd>
    </div>
  `;
}

function renderTraitValue(character, trait, options = {}) {
  const isPublic = isTraitRevealed(character.number, trait.key);

  if (!canViewTrait(character.number, trait.key)) {
    return renderHiddenTraitValue(character.number, trait);
  }

  return renderVisibleTraitValue(character, trait, isPublic, options);
}

function canViewTrait(playerNumber, traitKey) {
  return isOwnPlayer(playerNumber) || isTraitRevealed(playerNumber, traitKey);
}

function renderHiddenTraitValue(playerNumber, trait) {
  if (isHostView()) {
    return renderHostHiddenTraitControls(playerNumber, trait);
  }

  return `
    <div class="trait-value-box hidden-player-controls">
      <div class="trait-value-line">
      </div>
    </div>
  `;
}

function renderHostHiddenTraitControls(playerNumber, trait) {
  const revealAction = renderTraitRevealAction(playerNumber, trait.key, trait.label);
  const forceRevealAction = renderHostForceRevealAction(playerNumber, trait.key, trait.label);
  const rerollAction = renderTraitRerollAction(playerNumber, trait.key, trait.label);

  return `
    <div class="trait-value-box hidden-host-controls">
      <div class="trait-value-line">
        <span class="trait-row-actions">${revealAction}${forceRevealAction}${rerollAction}</span>
      </div>
    </div>
  `;
}

function renderVisibleTraitValue(character, trait, isPublic, options = {}) {
  let value;
  const tone = getTraitTone(character, trait);
  const revealClass = isNewlyRevealedTrait(character.number, trait.key)
    ? " revealed-now"
    : "";

  if (trait.key === "health") {
    value = renderHealthValue(character, tone);
  } else if (trait.key === "specialAbility") {
    value = renderTraitSignal(renderSpecialAbilities(character), tone);
  } else if (trait.key === "specialAbility2") {
    const second = cleanText(character?.specialAbility2, "");
    value = renderTraitSignal(second ? renderAbilityCard(character.number, second, 1) : `<span class="trait-value">Не указано</span>`, tone);
  } else if (options.view === VIEW_TABLE && shouldShowFantasyRaceWithGender(character, trait)) {
    value = renderTraitSignal(renderFantasyRaceGenderValue(character), tone);
  } else {
    value = renderTraitSignal(`<span class="trait-value">${escapeHtml(character[trait.key])}</span>`, tone);
  }

  const revealAction = !isPublic && canRevealTrait(character.number)
    ? renderTraitRevealAction(character.number, trait.key, trait.label)
    : "";
  const forceRevealAction = isHostView() && !isPublic
    ? renderHostForceRevealAction(character.number, trait.key, trait.label)
    : "";
  const rerollAction = isHostView()
    ? renderTraitRerollAction(character.number, trait.key, trait.label)
    : "";
  const ownStateIndicator = options.view === VIEW_TABLE && isOwnPlayer(character.number)
    ? renderOwnTraitStateIndicator(isPublic, Boolean(revealAction))
    : "";

  return `
    <div class="trait-value-box${revealClass}">
      <div class="trait-value-line">
        ${value}
        <span class="trait-row-actions">${ownStateIndicator}${revealAction}${forceRevealAction}${rerollAction}</span>
      </div>
      ${renderVisibilityBadge(character.number, isPublic)}
    </div>
  `;
}

function renderOwnTraitStateIndicator(isPublic, revealActionVisible = false) {
  if (!isPublic && revealActionVisible) {
    return "";
  }

  const icon = isPublic ? "✓" : "🔒";
  const label = isPublic ? "Характеристика открыта" : "Характеристика скрыта";
  const stateClass = isPublic ? "revealed" : "hidden";

  return `<span class="own-trait-state ${stateClass}" aria-label="${label}" title="${label}">${icon}</span>`;
}

function renderVisibilityBadge(playerNumber, isPublic) {
  return "";
}

function isFantasyPackActive() {
  const themeId = currentPack?.settings?.theme || currentPack?.themeId || themeSelect?.value || DEFAULT_THEME_ID;
  return getThemeById(themeId).id === "fantasy";
}

function getFantasyRaceGenderLines(character) {
  const race = cleanText(character?.race, "");
  const gender = cleanText(character?.gender, "");

  if (!race || race === "Не указано") {
    return gender ? [gender] : [];
  }

  return gender ? [gender, race] : [race];
}

function shouldShowFantasyRaceWithGender(character, trait) {
  return trait.key === "gender" && isFantasyPackActive() && getFantasyRaceGenderLines(character).length > 1;
}

function renderFantasyRaceGenderValue(character) {
  const lines = getFantasyRaceGenderLines(character);

  if (lines.length === 0) {
    return `<span class="trait-value">Не указано</span>`;
  }

  return `
    <span class="trait-value trait-value-stacked">
      ${lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
    </span>
  `;
}

function renderTraitSignal(content, tone) {
  return `
    <span class="trait-signal">
      ${content}
    </span>
  `;
}

function renderAbilitiesPanelCard(character) {
  const playerName = getTablePlayerTitle(character);
  const abilityItems = getPlayerAbilityItems(character);
  const isOwn = isOwnPlayer(character.number);

  return `
    <article class="ability-player-card${isOwn ? " own-ability-card" : ""}" style="--accent: ${character.accent}" data-player="${character.number}">
      <header class="ability-player-header">
        <span class="ability-player-number">${character.number}</span>
        <h3>${escapeHtml(playerName)}</h3>
      </header>
      <div class="ability-player-list">
        ${abilityItems.map((ability) => renderAbilityPanelRow(character.number, ability)).join("")}
      </div>
    </article>
  `;
}

function renderAbilityPanelRow(playerNumber, ability) {
  const label = `Способность ${ability.index + 1}`;
  const isLocked = !ability.name || !canViewTrait(playerNumber, "specialAbility") || ability.locked;

  if (isLocked) {
    const lockText = ability.name && ability.lockReason ? ability.lockReason : "Откроется позже";
    return `
      <div class="ability-panel-row locked" title="${escapeHtml(lockText)}">
        <span class="ability-panel-label">${label}</span>
        <button class="ability-panel-button locked" type="button" data-tooltip="${escapeHtml(lockText)}" disabled>
          <span class="ability-panel-icon" aria-hidden="true">&#128274;</span>
          <span class="ability-panel-name">${escapeHtml(lockText)}</span>
        </button>
      </div>
    `;
  }

  const canUse = canUseAbility(playerNumber);
  const isDisabled = ability.used || !canUse;
  const actionAttrs = !isDisabled
    ? `data-action="use-ability" data-player="${playerNumber}" data-ability-index="${ability.index}"`
    : "";
  const tooltip = ability.used ? "Уже использовано" : ability.name;

  return `
    <div class="ability-panel-row${ability.used ? " used" : ""}">
      <span class="ability-panel-label">${label}</span>
      <button class="ability-panel-button${ability.used ? " used" : ""}" type="button" ${actionAttrs} data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(ability.name)}" ${isDisabled ? "disabled" : ""}>
        <span class="ability-panel-icon" aria-hidden="true">${ability.used ? "&#10003;" : "&#9889;"}</span>
        <span class="ability-panel-name">${escapeHtml(ability.used ? "Использовано" : ability.name)}</span>
      </button>
    </div>
  `;
}

function getTraitTone(character, trait) {
  const value = cleanText(character?.[trait.key], "");
  const normalizedValue = normalizeTraitText(value);

  if (!normalizedValue) {
    return "neutral";
  }

  if (trait.key === "hobby" || trait.key === "phobia" || trait.key === "bodyType" || trait.key === "gender" || trait.key === "age") {
    return "neutral";
  }

  if (matchesToneKeywords(normalizedValue, traitToneKeywords.rare)) {
    return "rare";
  }

  if (matchesToneKeywords(normalizedValue, traitToneKeywords.bad)) {
    return "bad";
  }

  if (matchesToneKeywords(normalizedValue, traitToneKeywords.good)) {
    return "good";
  }

  if (trait.key === "health") {
    return character.healthSeverity === "good" ? "good" : character.healthSeverity === "critical" || character.healthSeverity === "danger" ? "bad" : "neutral";
  }

  return "neutral";
}

function matchesToneKeywords(value, keywords) {
  return keywords.some((keyword) => value.includes(normalizeTraitText(keyword)));
}

function normalizeTraitText(value) {
  return cleanText(value, "").toLowerCase().replaceAll("ё", "е");
}

function renderSpecialAbilities(character) {
  const abilities = getPlayerAbilities(character);

  if (abilities.length === 0) {
    return `<span class="trait-value">Не указано</span>`;
  }

  // Ensure we always render two slots (top and bottom).
  const slot0 = abilities[0] || "";
  const slot1 = abilities[1] || "";

  const used0 = Boolean(usedAbilities[`${character.number}:0`]);
  const used1 = Boolean(usedAbilities[`${character.number}:1`]);

  const slot0Class = used0 ? "ability-slot opened" : "ability-slot closed";
  const slot1Class = used1 ? "ability-slot opened" : "ability-slot closed";

  return `
    <div class="special-abilities-container">
      <div class="ability-slot-top ${slot0Class}" data-slot="1" data-player="${character.number}" data-ability-index="0">
        <div class="ability-text">
          ${slot0 ? renderAbilityCard(character.number, slot0, 0) : ""}
        </div>
      </div>
      <div class="ability-slot-bottom ${slot1Class}" data-slot="2" data-player="${character.number}" data-ability-index="1">
        <div class="ability-text">
          ${slot1 ? renderAbilityCard(character.number, slot1, 1) : ""}
        </div>
      </div>
    </div>
  `;
}

function renderAbilityCard(playerNumber, ability, abilityIndex) {
  const abilityKey = getAbilityKey(playerNumber, abilityIndex);
  const isUsed = Boolean(usedAbilities[abilityKey]);
  const analysis = analyzeAbility(ability, playerNumber);
  const presentation = getAbilityPresentation(ability);
  const tooltip = escapeHtml(ability);
  const isLocked = analysis.effectType === ABILITY_EFFECT_TYPES.UNSUPPORTED;
  const isDisabled = isUsed || isLocked || !canUseAbility(playerNumber);

  return `
    <button class="ability-btn ability-use-button ability-type-${presentation.visualType}${isUsed ? " used" : ""}${isLocked ? " locked" : ""}" type="button" ${!isDisabled ? `data-action="use-ability" data-player="${playerNumber}" data-ability-index="${abilityIndex}"` : ""} data-tooltip="${isLocked ? "Эта способность пока недоступна" : tooltip}" aria-label="${tooltip}" ${isDisabled ? "disabled" : ""}>
      ${isUsed
        ? `<span class="ability-used-mark" aria-hidden="true">✓</span><span class="ability-label">Использовано</span>`
        : `<span class="ability-icon" aria-hidden="true">${presentation.icon}</span><span class="ability-label">${escapeHtml(isLocked ? "Недоступно" : presentation.label)}</span>`}
    </button>
  `;
}

function getAbilityPresentation(abilityText) {
  const text = cleanText(abilityText, "");
  const lowerText = text.toLowerCase();
  const logicType = detectAbilityType(lowerText);
  const visualType = getAbilityVisualType(logicType, lowerText);
  const icons = {
    swap: "🔄",
    swapIdentity: "🔄",
    steal: "👜",
    reveal: "👁",
    reroll: "🎲",
    protect: "🛡",
    copyTrait: "⧉",
    setHealth: "✚",
    polymorph: "✦",
    noop: "•",
    unsupported: "⊘",
    global: "🌐"
  };

  return {
    icon: icons[visualType] || icons.global,
    label: getAbilityShortLabel(lowerText, logicType),
    visualType
  };
}

function getAbilityVisualType(logicType, lowerText) {
  if (lowerText.includes("все характеристики") || logicType === ABILITY_EFFECT_TYPES.UNSUPPORTED || logicType === ABILITY_EFFECT_TYPES.NOOP) {
    return "global";
  }

  return logicType;
}

function getAbilityShortLabel(lowerText, logicType) {
  const traitKey = inferTraitKey(lowerText);

  if (logicType === ABILITY_EFFECT_TYPES.PROTECT) {
    return lowerText.includes("избежать") ? "Иммунитет" : "Щит";
  }

  if (logicType === ABILITY_EFFECT_TYPES.STEAL) {
    if (traitKey === "backpack") {
      return "Украсть рюкзак";
    }

    if (traitKey === "largeInventory") {
      return "Украсть инвентарь";
    }

    return "Украсть";
  }

  if (logicType === ABILITY_EFFECT_TYPES.SWAP) {
    return `Обмен ${getAbilityTraitGenitiveLabel(traitKey)}`;
  }

  if (logicType === ABILITY_EFFECT_TYPES.SWAP_IDENTITY) {
    return "Обмен пола/расы";
  }

  if (logicType === ABILITY_EFFECT_TYPES.REROLL) {
    return `Переген ${getAbilityTraitGenitiveLabel(traitKey)}`;
  }

  if (logicType === ABILITY_EFFECT_TYPES.REVEAL) {
    if (lowerText.includes("все характеристики")) {
      return "Открыть все";
    }

    if (lowerText.includes("слева")) {
      return "Открыть слева";
    }

    if (lowerText.includes("справа")) {
      return "Открыть справа";
    }

    return `Раскрыть ${getTraitAccusative(traitKey)}`;
  }

  if (logicType === ABILITY_EFFECT_TYPES.COPY_TRAIT) {
    return "Скопировать";
  }

  if (logicType === ABILITY_EFFECT_TYPES.SET_HEALTH) {
    return "Исцелить";
  }

  if (logicType === ABILITY_EFFECT_TYPES.POLYMORPH) {
    return "Полиморф";
  }

  if (logicType === ABILITY_EFFECT_TYPES.NOOP) {
    return "Пустышка";
  }

  return "Способность";
}

function getAbilityTraitGenitiveLabel(traitKey) {
  const labels = {
    profession: "профессии",
    health: "здоровья",
    phobia: "фобии",
    largeInventory: "инвентаря",
    backpack: "рюкзака",
    specialAbility: "способности"
  };

  return labels[traitKey] || "карты";
}

function renderHealthValue(character, tone = "neutral") {
  const severity = ["good", "medium", "danger", "critical"].includes(character.healthSeverity)
    ? character.healthSeverity
    : "medium";
  const explanation = character.healthExplanation || "Состояние влияет на ресурс организма и шансы выжить.";

  // Render only the health value and marker; remove redundant tooltip/question-mark element.
  return `
    <span class="health-value health-${severity} trait-signal">
      <span class="health-text">
        <span class="trait-value">${escapeHtml(character.health)}</span>
      </span>
    </span>
  `;
}

function getHealthSeverity(health) {
  const value = health.toLowerCase();

  if (value.includes("иммунитет") || value.includes("здоров")) {
    return "good";
  }

  if (value.includes("крит") || value.includes("рак") || value.includes("хрупкие кости")) {
    return "critical";
  }

  if (value.includes("тяжел") || value.includes("психоз")) {
    return "danger";
  }

  return "medium";
}

function getHealthExplanation(health) {
  const value = health.toLowerCase();

  if (value.includes("иммунитет")) {
    return "Высокая устойчивость к болезням. Повышает шансы на выживание.";
  }

  if (value.includes("здоров")) {
    return "Стабильное состояние. Может функционировать долго, не снижает выживаемость.";
  }

  if (value.includes("рак")) {
    return "Критическое состояние. Без лечения проживет ограниченное время, сильно снижает выживаемость.";
  }

  if (value.includes("вирус")) {
    return "Может ухудшиться со временем. Работоспособен, но есть риск заражения других.";
  }

  if (value.includes("булим")) {
    return "Ослабляет организм и питание. Не критично при контроле, но снижает устойчивость.";
  }

  if (value.includes("псих") || value.includes("шиз")) {
    return "Нестабильное состояние. Стресс может быстро снизить надежность и шансы.";
  }

  if (value.includes("хрупкие")) {
    return "Очень высокая травмоопасность. Без нагрузок может жить долго, но травма опасна.";
  }

  return "Состояние влияет на ресурс организма и шансы выжить.";
}

function renderLockButton(playerNumber, traitKey, label, isDisabled = false) {
  return `
    <button class="trait-lock" type="button" data-action="reveal-trait" data-player="${playerNumber}" data-trait="${traitKey}" aria-label="Открыть ${label}" ${isDisabled ? "disabled" : ""}>
      🔒
    </button>
  `;
}

function renderTraitRevealAction(playerNumber, traitKey, label) {
  const disabled = !canRevealTrait(playerNumber);
  return `
    <button class="trait-lock" type="button" data-action="reveal-trait" data-player="${playerNumber}" data-trait="${traitKey}" aria-label="Открыть ${label}" ${disabled ? "disabled" : ""}>
      🔒
    </button>
  `;
}

function renderHostForceRevealAction(playerNumber, traitKey, label) {
  if (!isHostView()) {
    return "";
  }

  return `
    <button class="trait-lock force-reveal-action" type="button" data-action="force-reveal-trait" data-player="${playerNumber}" data-trait="${traitKey}" aria-label="Принудительно открыть ${label}">
      👁
    </button>
  `;
}

function renderTraitRerollAction(playerNumber, traitKey, label) {
  return `
    <button class="trait-mini-action" type="button" data-action="reroll-trait" data-player="${playerNumber}" data-trait="${traitKey}" aria-label="Перегенерировать ${label}">
      ↻
    </button>
  `;
}

function getPlayerAbilities(player) {
  const first = cleanText(player?.specialAbility, "").trim();
  const second = cleanText(player?.specialAbility2, "").trim();
  const list = [];
  if (first) list.push(first);
  if (second) list.push(second);
  return list;
}

function getAbilityKey(playerNumber, abilityIndex) {
  return `${playerNumber}:${abilityIndex}`;
}

function getPlayerAbilityItems(player) {
  const playerNumber = Number(player?.number);

  return [player?.specialAbility, player?.specialAbility2].map((rawAbility, index) => {
    const id = getAbilityKey(playerNumber, index);
    const name = cleanText(rawAbility, "").trim();
    const analysis = analyzeAbility(name, playerNumber);

    return {
      id,
      index,
      name,
      description: name,
      targetType: analysis.targetType,
      effectType: analysis.effectType,
      used: Boolean(usedAbilities[id]),
      locked: !name || analysis.effectType === ABILITY_EFFECT_TYPES.UNSUPPORTED,
      lockReason: analysis.effectType === ABILITY_EFFECT_TYPES.UNSUPPORTED
        ? "Эта способность пока недоступна"
        : ""
    };
  });
}

function renderTurnBanner() {
  const shouldShowTurn = currentPack?.players?.length
    && (!isOnlineRoom() || currentLobby?.isGameStarted);

  if (!shouldShowTurn) {
    return;
  }

  const currentNumber = getCurrentTurnPlayerNumber();
  const currentPlayer = getCurrentTurnRoomPlayer();
  const playerName = currentPlayer?.name || (currentNumber ? `Игрок ${currentNumber}` : "Игрок");
  const roundNumber = isOnlineRoom() ? Number(currentLobby?.roundNumber) || 1 : localRoundNumber;
  const isMine = currentNumber && Number(currentNumber) === Number(currentPlayerNumber);

  const banner = document.createElement("div");
  banner.className = `turn-banner${isMine ? " own-turn" : ""}`;
  banner.innerHTML = `
    <span>Раунд ${roundNumber}</span>
    <strong>Ход: Игрок ${currentNumber || "-"}${playerName ? ` · ${escapeHtml(playerName)}` : ""}</strong>
    <em>${isMine ? "Можно открыть одну характеристику" : "Ожидание хода"}</em>
  `;
  characterGrid.append(banner);
}

function getPlayerByNumber(playerNumber) {
  return currentPack?.players?.find((player) => player.number === Number(playerNumber)) || null;
}

function analyzeAbility(abilityText, actorNumber) {
  const text = cleanText(abilityText, "");
  const lowerText = text.toLowerCase();
  const direction = lowerText.includes("рядом")
    ? "nearby"
    : lowerText.includes("слева")
      ? "left"
      : lowerText.includes("справа") || lowerText.includes("с права")
        ? "right"
        : "";
  const autoTargetNumber = ["left", "right"].includes(direction) ? getNeighborPlayerNumber(actorNumber, direction) : null;
  const traitKey = inferTraitKey(lowerText);
  const revealAll = lowerText.includes("все характеристики");
  const explicitTarget = lowerText.includes("выбран")
    || lowerText.includes("другим игроком")
    || lowerText.includes("другого игрока")
    || lowerText.includes("одного игрока")
    || lowerText.includes("одному")
    || lowerText.includes("двух игроков")
    || lowerText.includes("игрока")
    || lowerText.includes("игроком");
  const type = detectAbilityType(lowerText);
  const targetType = inferAbilityTargetType(type, lowerText, explicitTarget, autoTargetNumber);
  const needsTarget = !autoTargetNumber && [ABILITY_TARGET_TYPES.OTHER_PLAYER, ABILITY_TARGET_TYPES.ANY_PLAYER].includes(targetType);
  const needsTrait = shouldAbilityAskForTrait(type, traitKey, revealAll);

  return {
    id: normalizeAbilityId(text),
    raw: text,
    text,
    type,
    effectType: type,
    traitKey,
    revealAll,
    direction,
    autoTargetNumber,
    targetType,
    needsTarget,
    needsTrait,
    explicitTarget
  };
}

function detectAbilityType(lowerText) {
  if (!lowerText) {
    return ABILITY_EFFECT_TYPES.UNSUPPORTED;
  }

  if (includesAny(lowerText, ["бесполез"])) {
    return ABILITY_EFFECT_TYPES.NOOP;
  }

  if (includesAny(lowerText, ["скопировать"])) {
    return ABILITY_EFFECT_TYPES.COPY_TRAIT;
  }

  if (includesAny(lowerText, ["исцеление", "до состояния здоров", "меняет здоровье"])) {
    return ABILITY_EFFECT_TYPES.SET_HEALTH;
  }

  if (includesAny(lowerText, ["полиморф", "возрастом и типом тела"])) {
    return ABILITY_EFFECT_TYPES.POLYMORPH;
  }

  if (includesAny(lowerText, ["превращение", "меняется пол", "пол и расу"])) {
    return ABILITY_EFFECT_TYPES.SWAP_IDENTITY;
  }

  if (includesAny(lowerText, ["защитить выбран", "защитить игрок"])) {
    return ABILITY_EFFECT_TYPES.PROTECT;
  }

  if (includesAny(lowerText, ["защититься", "избежать"])) {
    return ABILITY_EFFECT_TYPES.PROTECT;
  }

  if (includesAny(lowerText, ["украсть"])) {
    return ABILITY_EFFECT_TYPES.STEAL;
  }

  if (includesAny(lowerText, ["обменяться", "поменяться", "обменять", "поменять"])) {
    return ABILITY_EFFECT_TYPES.SWAP;
  }

  if (includesAny(lowerText, ["перегенерировать"])) {
    return ABILITY_EFFECT_TYPES.REROLL;
  }

  if (includesAny(lowerText, ["заставить", "раскрыть", "открыть", "открывашка"])) {
    return ABILITY_EFFECT_TYPES.REVEAL;
  }

  return ABILITY_EFFECT_TYPES.UNSUPPORTED;
}

function normalizeAbilityId(abilityText) {
  return cleanText(abilityText, "")
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferAbilityTargetType(effectType, lowerText, explicitTarget, autoTargetNumber) {
  if (autoTargetNumber) {
    return ABILITY_TARGET_TYPES.OTHER_PLAYER;
  }

  if (effectType === ABILITY_EFFECT_TYPES.PROTECT) {
    return includesAny(lowerText, ["защитить выбран", "защитить игрок"])
      ? ABILITY_TARGET_TYPES.ANY_PLAYER
      : ABILITY_TARGET_TYPES.SELF;
  }

  if ([ABILITY_EFFECT_TYPES.STEAL, ABILITY_EFFECT_TYPES.SWAP, ABILITY_EFFECT_TYPES.SWAP_IDENTITY, ABILITY_EFFECT_TYPES.REVEAL, ABILITY_EFFECT_TYPES.COPY_TRAIT, ABILITY_EFFECT_TYPES.POLYMORPH].includes(effectType)) {
    return ABILITY_TARGET_TYPES.OTHER_PLAYER;
  }

  if ([ABILITY_EFFECT_TYPES.REROLL, ABILITY_EFFECT_TYPES.SET_HEALTH].includes(effectType)) {
    return explicitTarget ? ABILITY_TARGET_TYPES.ANY_PLAYER : ABILITY_TARGET_TYPES.SELF;
  }

  return ABILITY_TARGET_TYPES.NO_TARGET;
}

function shouldAbilityAskForTrait(effectType, traitKey, revealAll) {
  if (effectType === ABILITY_EFFECT_TYPES.COPY_TRAIT) {
    return true;
  }

  return !revealAll && !traitKey && [ABILITY_EFFECT_TYPES.REVEAL, ABILITY_EFFECT_TYPES.REROLL, ABILITY_EFFECT_TYPES.SWAP].includes(effectType);
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferTraitKey(lowerText) {
  if (lowerText.includes("професс")) {
    return "profession";
  }

  if (lowerText.includes("рюкзак")) {
    return "backpack";
  }

  if (lowerText.includes("крупн")) {
    return "largeInventory";
  }

  if (lowerText.includes("здоров")) {
    return "health";
  }

  if (lowerText.includes("фоби")) {
    return "phobia";
  }

  if (lowerText.includes("хобби")) {
    return "hobby";
  }

  if (lowerText.includes("черта")) {
    return "trait";
  }

  if (lowerText.includes("возраст")) {
    return "age";
  }

  if (lowerText.includes("пол") && !lowerText.includes("полиморф")) {
    return "gender";
  }

  if (lowerText.includes("тип тела") || lowerText.includes("телослож")) {
    return "bodyType";
  }

  if (lowerText.includes("инфо") || lowerText.includes("информац")) {
    return "additionalInfo";
  }

  if (lowerText.includes("способност") || lowerText.includes("спец.")) {
    return "specialAbility";
  }

  return "";
}

function getNeighborPlayerNumber(actorNumber, direction) {
  const players = currentPack?.players || [];
  const actorIndex = players.findIndex((player) => player.number === Number(actorNumber));

  if (actorIndex === -1 || players.length < 2) {
    return null;
  }

  const offset = direction === "left" ? -1 : 1;
  const targetIndex = (actorIndex + offset + players.length) % players.length;
  return players[targetIndex].number;
}

function getAbilityTitle(type) {
  const titles = {
    [ABILITY_EFFECT_TYPES.SWAP]: "Обмен",
    [ABILITY_EFFECT_TYPES.SWAP_IDENTITY]: "Превращение",
    [ABILITY_EFFECT_TYPES.STEAL]: "Кража",
    [ABILITY_EFFECT_TYPES.REVEAL]: "Раскрытие",
    [ABILITY_EFFECT_TYPES.REROLL]: "Перегенерация",
    [ABILITY_EFFECT_TYPES.PROTECT]: "Защита",
    [ABILITY_EFFECT_TYPES.COPY_TRAIT]: "Копирование",
    [ABILITY_EFFECT_TYPES.SET_HEALTH]: "Лечение",
    [ABILITY_EFFECT_TYPES.POLYMORPH]: "Полиморф",
    [ABILITY_EFFECT_TYPES.NOOP]: "Способность",
    [ABILITY_EFFECT_TYPES.UNSUPPORTED]: "Недоступно"
  };

  return titles[type] || "Способность";
}

function isTraitRevealed(playerNumber, traitKey) {
  return Boolean(revealedTraits[playerNumber]?.[traitKey]);
}

function getTraitRevealKey(playerNumber, traitKey) {
  return `${playerNumber}:${traitKey}`;
}

function isNewlyRevealedTrait(playerNumber, traitKey) {
  return newlyRevealedTraitKeys.has(getTraitRevealKey(playerNumber, traitKey));
}

function markNewlyRevealedTraits(nextRevealedTraits) {
  Object.entries(nextRevealedTraits).forEach(([playerNumber, traits]) => {
    Object.keys(traits || {}).forEach((traitKey) => {
      if (traits[traitKey] && !revealedTraits[playerNumber]?.[traitKey]) {
        newlyRevealedTraitKeys.add(getTraitRevealKey(playerNumber, traitKey));
      }
    });
  });
}

function revealTrait(playerNumber, traitKey) {
  if (isOnlineRoom()) {
    socket.emit("reveal-trait", { roomCode: currentRoomCode, playerNumber, traitKey }, (response) => {
      if (response && !response.ok) {
        setStatus(response.error || "Сейчас нельзя открыть характеристику.", "error");
        return;
      }

      if (response?.turn) {
        applyTurnPayload(response.turn);
      }
    });
    return;
  }

  const wasOpened = setTraitRevealed(playerNumber, traitKey);
  if (wasOpened) {
    addGameLog(`Открыта характеристика Игрока ${playerNumber}: ${getTraitAccusative(traitKey)}`);
    advanceLocalTurn(playerNumber);
    renderGameLog();
  }
  normalizeLocalTurn();
  renderPack(currentPack);
}

function revealAllTraits(playerNumber) {
  if (isTurnModeActive()) {
    setStatus("В пошаговом режиме можно открыть только одну характеристику за ход.", "error");
    return;
  }

  if (isOnlineRoom()) {
    socket.emit("reveal-all", {
      roomCode: currentRoomCode,
      playerNumber,
      traitKeys: characterTraits.map((trait) => trait.key)
    });
    return;
  }

  setAllTraitsRevealed(playerNumber);
  addGameLog(`Открыты все характеристики Игрока ${playerNumber}`);
  renderGameLog();
  renderPack(currentPack);
}

function forceRevealTrait(playerNumber, traitKey) {
  if (!isHostView()) {
    return;
  }

  if (isOnlineRoom()) {
    socket.emit("force-reveal-trait", { roomCode: currentRoomCode, playerNumber, traitKey }, (response) => {
      if (!response?.ok) {
        setStatus(response?.error || "Не удалось открыть характеристику.", "error");
      }
    });
    return;
  }

  const wasOpened = setTraitRevealed(playerNumber, traitKey);
  if (wasOpened) {
    addGameLog(`Ведущий принудительно открыл ${getTraitAccusative(traitKey)} Игрока ${playerNumber}`);
    renderGameLog();
  }
  renderPack(currentPack);
}

function forceRevealAllTraits(playerNumber) {
  if (!isHostView()) {
    return;
  }

  const traitKeys = characterTraits.map((trait) => trait.key);
  if (isOnlineRoom()) {
    socket.emit("force-reveal-all", {
      roomCode: currentRoomCode,
      playerNumber,
      traitKeys
    }, (response) => {
      if (!response?.ok) {
        setStatus(response?.error || "Не удалось открыть характеристики.", "error");
      }
    });
    return;
  }

  setAllTraitsRevealed(playerNumber);
  addGameLog(`Ведущий принудительно открыл все характеристики Игрока ${playerNumber}`);
  renderGameLog();
  renderPack(currentPack);
}

function setTraitRevealed(playerNumber, traitKey) {
  const wasHidden = !revealedTraits[playerNumber]?.[traitKey];

  if (!revealedTraits[playerNumber]) {
    revealedTraits[playerNumber] = {};
  }

  if (wasHidden) {
    newlyRevealedTraitKeys.add(getTraitRevealKey(playerNumber, traitKey));
  }

  revealedTraits[playerNumber][traitKey] = true;
  return wasHidden;
}

function setAllTraitsRevealed(playerNumber) {
  characterTraits.forEach((trait) => {
    setTraitRevealed(playerNumber, trait.key);
  });
}

function toggleExcluded(playerNumber) {
  if (!isHostView()) {
    return;
  }

  if (isOnlineRoom()) {
    socket.emit("exclude-player", {
      roomCode: currentRoomCode,
      playerNumber,
      excluded: !excludedPlayers.has(playerNumber)
    });
    return;
  }

  if (excludedPlayers.has(playerNumber)) {
    excludedPlayers.delete(playerNumber);
  } else if (!isGameOver()) {
    if (protectedPlayers.has(playerNumber)) {
      protectedPlayers.delete(playerNumber);
      addGameLog(`Игрок ${playerNumber} избежал исключения`);
      setStatus(`Игрок ${playerNumber} использовал защиту от исключения.`, "success");
      renderGameLog();
      return;
    }

    excludedPlayers.add(playerNumber);
    if (Number(localTurnPlayerNumber) === Number(playerNumber)) {
      advanceLocalTurn(playerNumber);
    } else {
      normalizeLocalTurn();
    }
  }

  normalizeLocalTurn();
  renderPack(currentPack);

  if (isGameOver()) {
    setStatus("Игра остановлена: осталось игроков ровно по количеству мест в бункере.", "success");
  }
}

function rerollTrait(playerNumber, traitKey) {
  if (!isHostView()) {
    return;
  }

  const player = getPlayerByNumber(playerNumber);

  if (!player || !cardSections[traitKey]) {
    return;
  }
  // Special handling for special abilities (two separate slots)
  if (traitKey === "specialAbility") {
    const abilities = [];
    const drawState = createDrawState();

    while (abilities.length < 2) {
      const ability = drawCard(cardSections.specialAbility, drawState, new Set(abilities));

      if (ability === "Не указано") {
        break;
      }

      abilities.push(ability);
    }

    player.specialAbility = abilities[0] || player.specialAbility || "";
    player.specialAbility2 = abilities[1] || "";

    // clear used flags for this player
    Object.keys(usedAbilities)
      .filter((abilityKey) => abilityKey.startsWith(`${player.number}:`))
      .forEach((abilityKey) => {
        delete usedAbilities[abilityKey];
      });

    addGameLog(`Ведущий перегенерировал способности Игроку ${player.number}`);
    renderPack(currentPack);
    renderGameLog();

    if (isOnlineRoom()) {
      syncHostState();
    }

    setStatus(`Игрок ${player.number}: способности перегенерированы.`, "success");
    return;
  }

  // Default handling for other traits
  player[traitKey] = drawReplacementTrait(traitKey, player[traitKey]);
  refreshDerivedTraitData(player, traitKey);
  addGameLog(`Ведущий перегенерировал ${getTraitAccusative(traitKey)} Игроку ${player.number}`);
  renderPack(currentPack);
  renderGameLog();

  if (isOnlineRoom()) {
    syncHostState();
  }

  setStatus(`Игрок ${player.number}: ${getTraitAccusative(traitKey)} перегенерировано.`, "success");
}



function formatBunker(bunker, themeId = "classic") {
  const durationValue = Number(bunker.duration) || 0;
  const foodValue = Number(bunker.food) || 0;
  const resourceRatio = durationValue > 0 ? Math.min(100, Math.round((foodValue / durationValue) * 100)) : 0;
  const lowResourceWarning = durationValue > 0 && foodValue / durationValue < 0.2;
  const foodDescription = bunker.foodDescription ?? String(bunker.food);

  const resourceSection = themeId === "classic"
    ? `
      <div class="bunker-resources bunker-resources--classic">
        <h4>Ресурсы</h4>
        <ul class="detail-list">
          <li><strong>Срок внутри:</strong> ${escapeHtml(String(durationValue))} мес.</li>
          <li><strong>Еда:</strong> ${escapeHtml(String(foodValue))} мес.</li>
        </ul>
      </div>
    `
    : `
      <div class="bunker-resources ${lowResourceWarning ? "low-resource" : ""}">
        <h4>Ресурсы</h4>
        <div class="resource-row"><span>Срок внутри:</span> <strong>${escapeHtml(String(durationValue))} мес.</strong></div>
        <div class="resource-row"><span>Еда:</span> <strong>${escapeHtml(String(foodValue))} / ${escapeHtml(String(durationValue))} мес.</strong></div>
        <div class="resource-bar">
          <div class="resource-bar__fill" style="width:${resourceRatio}%;"></div>
        </div>
      </div>
    `;

  return `
    <ul class="detail-list">
      <li><strong>Постройка:</strong> ${escapeHtml(bunker.buildTime)}</li>
      <li><strong>Локация:</strong> ${escapeHtml(bunker.location)}</li>
      <li><strong>Размер:</strong> ${escapeHtml(bunker.size)}</li>
      <li><strong>Срок внутри:</strong> ${escapeHtml(bunker.stayTime)}</li>
      <li><strong>Еда:</strong> ${escapeHtml(foodDescription)}</li>
      <li><strong>Полезные предметы:</strong> ${escapeHtml(bunker.items.join(", "))}</li>
      <li><strong>Мест в бункере:</strong> ${escapeHtml(bunker.availableSlots)}</li>
    </ul>
    ${resourceSection}
  `;
}

function formatCatastrophe(catastrophe) {
  const paragraphs = Array.isArray(catastrophe.description)
    ? catastrophe.description
    : [catastrophe.description];

  return `
    ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
  `;
}

function resetGameState(pack) {
  currentPack = pack;
  excludedPlayers = new Set();
  revealedTraits = {};
  usedAbilities = {};
  protectedPlayers = new Set();
  gameLog = [];
  pendingAbility = null;
  localTurnPlayerNumber = 1;
  localRoundNumber = 1;
  votingState = null;
  votingSetupOpen = false;
  localVotingCandidates = new Set();
  dismissedVotingId = "";
  closeVotingModal();
  closeSurvivalModal();
  closeAbilityModal();
  renderGameLog();
}

function isGameOver() {
  if (!currentPack?.players?.length) {
    return false;
  }

  return getRemainingPlayers().length <= currentPack.bunker.availableSlots;
}

function canCalculateSurvival() {
  if (!currentPack?.players?.length) {
    return false;
  }

  return isHostView() && getRemainingPlayers().length === Number(currentPack.bunker?.availableSlots);
}

function getRemainingPlayers() {
  return currentPack.players.filter((player) => !excludedPlayers.has(player.number));
}

function openAbilityModal(playerNumber, abilityIndex) {
  if (!canUseAbility(playerNumber)) {
    return;
  }

  const player = getPlayerByNumber(playerNumber);
  const ability = getPlayerAbilityItems(player)[abilityIndex];
  const abilityText = ability?.name;

  if (!player || !abilityText) {
    return;
  }

  if (ability.locked) {
    setStatus(ability.lockReason || "Эта способность недоступна.", "error");
    return;
  }

  if (ability.used) {
    setStatus("Эта способность уже использована.", "error");
    return;
  }

  const analysis = analyzeAbility(abilityText, playerNumber);
  pendingAbility = {
    actorNumber: playerNumber,
    abilityIndex,
    abilityText,
    analysis
  };

  abilityPlayerLabel.textContent = `Игрок ${playerNumber} · ${getAbilityTitle(analysis.type)}`;
  abilityTitle.textContent = abilityText;
  abilityDescription.textContent = abilityText;
  abilityAdminNote.textContent = "";

  renderAbilityTargetControls();
  updateAbilityTraitOptions();
  updateAbilityConfirmState();

  abilityModal.hidden = false;

  if (!abilityTargetField.hidden) {
    abilityTargetSelect.focus();
  } else if (!abilityTraitField.hidden) {
    abilityTraitSelect.focus();
  } else {
    abilityConfirmButton.focus();
  }
}

function renderAbilityTargetControls() {
  const { analysis, actorNumber } = pendingAbility;
  const autoTargetNumber = analysis.autoTargetNumber;
  const selfTargetNumber = analysis.targetType === ABILITY_TARGET_TYPES.SELF ? actorNumber : null;
  const showAutoTarget = Boolean(autoTargetNumber || selfTargetNumber);

  abilityTargetField.hidden = !analysis.needsTarget;
  abilityTargetHint.hidden = !showAutoTarget;
  abilityTargetSelect.innerHTML = "";

  if (showAutoTarget) {
    abilityTargetHint.textContent = `Цель: Игрок ${autoTargetNumber || selfTargetNumber}`;
  }

  if (!analysis.needsTarget) {
    return;
  }

  const options = getTargetOptions(actorNumber, analysis);
  abilityTargetSelect.innerHTML = [
    `<option value="">Выберите игрока</option>`,
    ...options.map((player) => `<option value="${player.number}">Игрок ${player.number}</option>`)
  ].join("");
}

function getTargetOptions(actorNumber, analysis) {
  const players = currentPack?.players || [];

  if (analysis.direction === "nearby") {
    const left = getNeighborPlayerNumber(actorNumber, "left");
    const right = getNeighborPlayerNumber(actorNumber, "right");
    const allowed = new Set([left, right].filter(Boolean).map(Number));
    return players.filter((player) => allowed.has(Number(player.number)));
  }

  if (analysis.targetType === ABILITY_TARGET_TYPES.OTHER_PLAYER) {
    return players.filter((player) => player.number !== Number(actorNumber));
  }

  return players;
}

function updateAbilityTraitOptions() {
  if (!pendingAbility) {
    return;
  }

  const { analysis } = pendingAbility;
  abilityTraitField.hidden = !analysis.needsTrait;
  abilityTraitSelect.innerHTML = "";

  if (!analysis.needsTrait) {
    return;
  }

  const targetNumber = getPendingTargetNumber();
  const options = getTraitOptionsForAbility(analysis, targetNumber);

  abilityTraitSelect.innerHTML = [
    `<option value="">Выберите характеристику</option>`,
    ...options.map((trait) => `<option value="${trait.key}">${trait.label}</option>`)
  ].join("");
}

function getTraitOptionsForAbility(analysis, targetNumber) {
  if (analysis.type === ABILITY_EFFECT_TYPES.COPY_TRAIT) {
    if (!targetNumber) {
      return [];
    }

    return characterTraits
      .filter((trait) => trait.key !== "specialAbility" && cardSections[trait.key])
      .filter((trait) => isTraitRevealed(targetNumber, trait.key));
  }

  if (analysis.type === ABILITY_EFFECT_TYPES.REVEAL && targetNumber) {
    const hiddenTraits = characterTraits.filter((trait) => !isTraitRevealed(targetNumber, trait.key));
    return hiddenTraits.length > 0 ? hiddenTraits : characterTraits;
  }

  return characterTraits.filter((trait) => trait.key !== "specialAbility" && cardSections[trait.key]);
}

function updateAbilityConfirmState() {
  if (!pendingAbility) {
    abilityConfirmButton.disabled = true;
    return;
  }

  const { analysis } = pendingAbility;
  const needsTargetValue = analysis.needsTarget && !abilityTargetSelect.value;
  const needsTraitValue = analysis.needsTrait && !abilityTraitSelect.value;
  abilityConfirmButton.disabled = needsTargetValue || needsTraitValue;
}

function getPendingTargetNumber() {
  if (!pendingAbility) {
    return null;
  }

  const { analysis, actorNumber } = pendingAbility;

  if (analysis.autoTargetNumber) {
    return analysis.autoTargetNumber;
  }

  if (analysis.targetType === ABILITY_TARGET_TYPES.SELF) {
    return actorNumber;
  }

  if (analysis.targetType === ABILITY_TARGET_TYPES.NO_TARGET) {
    return null;
  }

  if (analysis.needsTarget) {
    return Number(abilityTargetSelect.value) || null;
  }

  return actorNumber;
}

function prepareAbilityContext(context) {
  const actorNumber = Number(context.actorNumber);
  const abilityIndex = Number(context.abilityIndex);
  const player = getPlayerByNumber(actorNumber);
  const abilityText = getPlayerAbilityItems(player)[abilityIndex]?.name || cleanText(context.abilityText, "");
  const analysis = analyzeAbility(abilityText, actorNumber);

  return {
    ...context,
    actorNumber,
    abilityIndex,
    abilityText,
    analysis,
    targetNumber: Number(context.targetNumber) || null,
    traitKey: analysis.traitKey || context.traitKey || ""
  };
}

function validateAbilityContext(context) {
  const actor = getPlayerByNumber(context.actorNumber);
  const target = context.targetNumber ? getPlayerByNumber(context.targetNumber) : null;
  const ability = getPlayerAbilityItems(actor)[context.abilityIndex];
  const abilityKey = getAbilityKey(context.actorNumber, context.abilityIndex);
  const analysis = context.analysis;

  if (!actor || !ability?.name) {
    return "Способность не найдена.";
  }

  if (ability.locked || analysis.effectType === ABILITY_EFFECT_TYPES.UNSUPPORTED) {
    return ability.lockReason || "Эта способность недоступна.";
  }

  if (usedAbilities[abilityKey]) {
    return "Эта способность уже использована.";
  }

  if (analysis.targetType === ABILITY_TARGET_TYPES.SELF && context.targetNumber !== context.actorNumber) {
    return "Эта способность применяется только к себе.";
  }

  if (analysis.targetType === ABILITY_TARGET_TYPES.NO_TARGET && context.targetNumber) {
    return "Этой способности не нужна цель.";
  }

  if ([ABILITY_TARGET_TYPES.OTHER_PLAYER, ABILITY_TARGET_TYPES.ANY_PLAYER].includes(analysis.targetType)) {
    if (!target) {
      return "Выберите корректную цель.";
    }

    if (analysis.targetType === ABILITY_TARGET_TYPES.OTHER_PLAYER && Number(target.number) === Number(context.actorNumber)) {
      return "Эта способность не может выбрать самого себя.";
    }

    const allowedTargets = getTargetOptions(context.actorNumber, analysis).map((player) => Number(player.number));
    if (!allowedTargets.includes(Number(target.number))) {
      return "Эта цель недоступна для способности.";
    }
  }

  if (analysis.needsTrait) {
    const allowedTraits = getTraitOptionsForAbility(analysis, context.targetNumber).map((trait) => trait.key);
    if (!context.traitKey || !allowedTraits.includes(context.traitKey)) {
      return "Выберите корректную характеристику.";
    }
  }

  return "";
}

function confirmAbilityUse() {
  if (!pendingAbility || abilityConfirmButton.disabled) {
    return;
  }

  const context = prepareAbilityContext({
    ...pendingAbility,
    targetNumber: getPendingTargetNumber(),
    traitKey: pendingAbility.analysis.traitKey || abilityTraitSelect.value || ""
  });
  const abilityKey = getAbilityKey(context.actorNumber, context.abilityIndex);

  if (!canUseAbility(context.actorNumber)) {
    setStatus("Можно использовать только свои способности.", "error");
    closeAbilityModal();
    return;
  }

  const validationError = validateAbilityContext(context);
  if (validationError) {
    setStatus(validationError, "error");
    closeAbilityModal();
    renderPack(currentPack);
    return;
  }

  usedAbilities[abilityKey] = true;
  addGameLog(`Игрок ${context.actorNumber} использовал способность: ${context.abilityText}`);

  const wasApplied = executeAbility(context);
  closeAbilityModal();
  renderPack(currentPack);
  renderGameLog();
  if (isOnlineRoom()) {
    syncAbilityState(context);
  }
  if (wasApplied !== false) {
    setStatus("Способность применена.", "success");
  }
}

function syncAbilityState(context) {
  if (!socket?.connected || !currentRoomCode) {
    return;
  }

  socket.emit("ability-apply", {
    roomCode: currentRoomCode,
    context,
    state: collectSharedState()
  }, (response) => {
    if (!response?.ok) {
      setStatus(response?.error || "Не удалось синхронизировать способность.", "error");
    }
  });
}

function executeAbility(context) {
  if (isAbilityBlockedByDefense(context)) {
    return false;
  }

  if (context.analysis.effectType === ABILITY_EFFECT_TYPES.SWAP) {
    applySwapAbility(context);
    // highlight swapped trait cells
    highlightTraitCell(context.actorNumber, context.traitKey);
    highlightTraitCell(context.targetNumber, context.traitKey);
    return true;
  }

  if (context.analysis.effectType === ABILITY_EFFECT_TYPES.SWAP_IDENTITY) {
    applySwapIdentityAbility(context);
    ["gender", "age"].forEach((traitKey) => {
      highlightTraitCell(context.actorNumber, traitKey);
      highlightTraitCell(context.targetNumber, traitKey);
    });
    return true;
  }

  if (context.analysis.effectType === ABILITY_EFFECT_TYPES.STEAL) {
    applyStealAbility(context);
    highlightTraitCell(context.actorNumber, context.traitKey);
    highlightTraitCell(context.targetNumber, context.traitKey);
    return true;
  }

  if (context.analysis.effectType === ABILITY_EFFECT_TYPES.REVEAL) {
    applyRevealAbility(context);
    // reveal may highlight multiple traits; highlight the revealed trait if provided
    if (context.traitKey) highlightTraitCell(context.targetNumber || context.actorNumber, context.traitKey);
    return true;
  }

  if (context.analysis.effectType === ABILITY_EFFECT_TYPES.REROLL) {
    applyRerollAbility(context);
    if (context.traitKey) highlightTraitCell(context.targetNumber || context.actorNumber, context.traitKey);
    return true;
  }

  if (context.analysis.effectType === ABILITY_EFFECT_TYPES.PROTECT) {
    applyDefenseAbility(context);
    // defense doesn't change a visible trait but show notification
    highlightTraitCell(context.targetNumber || context.actorNumber, 'specialAbility');
    return true;
  }

  if (context.analysis.effectType === ABILITY_EFFECT_TYPES.COPY_TRAIT) {
    applyCopyTraitAbility(context);
    highlightTraitCell(context.actorNumber, context.traitKey);
    return true;
  }

  if (context.analysis.effectType === ABILITY_EFFECT_TYPES.SET_HEALTH) {
    applySetHealthAbility(context);
    highlightTraitCell(context.targetNumber || context.actorNumber, "health");
    return true;
  }

  if (context.analysis.effectType === ABILITY_EFFECT_TYPES.POLYMORPH) {
    applyPolymorphAbility(context);
    ["gender", "bodyType", "age"].forEach((traitKey) => highlightTraitCell(context.targetNumber, traitKey));
    return true;
  }

  if (context.analysis.effectType === ABILITY_EFFECT_TYPES.NOOP) {
    addGameLog(`Способность Игрока ${context.actorNumber} не дала эффекта`);
    return true;
  }

  addGameLog(`Способность Игрока ${context.actorNumber} пока не реализована`);
  return false;
}

function isAbilityBlockedByDefense(context) {
  const targetNumber = context.targetNumber;

  if (!targetNumber || targetNumber === context.actorNumber || context.analysis.effectType === ABILITY_EFFECT_TYPES.PROTECT) {
    return false;
  }

  if (!protectedPlayers.has(targetNumber)) {
    return false;
  }

  protectedPlayers.delete(targetNumber);
  addGameLog(`Игрок ${targetNumber} защитился от способности Игрока ${context.actorNumber}`);
  setStatus(`Защита Игрока ${targetNumber} заблокировала способность.`, "success");
  return true;
}

function applySwapAbility(context) {
  const actor = getPlayerByNumber(context.actorNumber);
  const target = getPlayerByNumber(context.targetNumber);
  const traitKey = context.traitKey;

  if (!actor || !target || !traitKey) {
    addGameLog(`Обмен Игрока ${context.actorNumber} требует ручного применения`);
    return;
  }

  if (traitKey === "specialAbility") {
    const actorWasRevealed = isTraitRevealed(actor.number, traitKey);
    const targetWasRevealed = isTraitRevealed(target.number, traitKey);
    const actorFirst = actor.specialAbility;
    const actorSecond = actor.specialAbility2;
    actor.specialAbility = target.specialAbility;
    actor.specialAbility2 = target.specialAbility2;
    target.specialAbility = actorFirst;
    target.specialAbility2 = actorSecond;
    setTraitVisibilityState(actor.number, traitKey, actorWasRevealed);
    setTraitVisibilityState(target.number, traitKey, targetWasRevealed);
    addGameLog(`Игрок ${context.actorNumber} обменялся способностями с Игроком ${context.targetNumber}`);
    return;
  }

  const actorWasRevealed = isTraitRevealed(actor.number, traitKey);
  const targetWasRevealed = isTraitRevealed(target.number, traitKey);
  const actorValue = actor[traitKey];
  actor[traitKey] = target[traitKey];
  target[traitKey] = actorValue;
  setTraitVisibilityState(actor.number, traitKey, actorWasRevealed);
  setTraitVisibilityState(target.number, traitKey, targetWasRevealed);
  refreshDerivedTraitData(actor, traitKey);
  refreshDerivedTraitData(target, traitKey);
  addGameLog(`Игрок ${context.actorNumber} обменялся ${getTraitInstrumental(traitKey)} с Игроком ${context.targetNumber}`);
}

function setTraitVisibilityState(playerNumber, traitKey, isRevealed) {
  const key = Number(playerNumber);

  if (isRevealed) {
    if (!revealedTraits[key]) {
      revealedTraits[key] = {};
    }
    revealedTraits[key][traitKey] = true;
    return;
  }

  if (revealedTraits[key]) {
    delete revealedTraits[key][traitKey];
  }
}

function applyStealAbility(context) {
  const actor = getPlayerByNumber(context.actorNumber);
  const target = getPlayerByNumber(context.targetNumber);
  const traitKey = context.traitKey;

  if (!actor || !target || !["backpack", "largeInventory"].includes(traitKey)) {
    addGameLog(`Кража Игрока ${context.actorNumber} требует ручного применения`);
    return;
  }

  const stolenValue = cleanText(target[traitKey]);
  actor[traitKey] = mergeStolenItem(actor[traitKey], stolenValue);
  target[traitKey] = "Украдено";
  addGameLog(`Игрок ${context.actorNumber} украл ${getTraitAccusative(traitKey)} у Игрока ${context.targetNumber}`);
}

function applyRevealAbility(context) {
  const targetNumber = context.targetNumber;

  if (!targetNumber) {
    addGameLog(`Раскрытие Игрока ${context.actorNumber} требует ручного применения`);
    return;
  }

  if (context.analysis.revealAll) {
    setAllTraitsRevealed(targetNumber);
    addGameLog(`Игрок ${context.actorNumber} открыл все характеристики Игрока ${targetNumber}`);
    return;
  }

  if (!context.traitKey) {
    addGameLog(`Раскрытие Игрока ${context.actorNumber} требует выбора характеристики`);
    return;
  }

  setTraitRevealed(targetNumber, context.traitKey);
  addGameLog(`Игрок ${context.actorNumber} заставил Игрока ${targetNumber} раскрыть ${getTraitAccusative(context.traitKey)}`);
}

function applyRerollAbility(context) {
  const target = getPlayerByNumber(context.targetNumber || context.actorNumber);
  const traitKey = context.traitKey;

  if (!target || !traitKey || !cardSections[traitKey]) {
    addGameLog(`Перегенерация Игрока ${context.actorNumber} требует ручного применения`);
    return;
  }

  if (traitKey === "specialAbility") {
    const abilities = [];
    const drawState = createDrawState();

    while (abilities.length < 2) {
      const ability = drawCard(cardSections.specialAbility, drawState, new Set(abilities));
      if (ability === "Не указано") break;
      abilities.push(ability);
    }

    target.specialAbility = abilities[0] || target.specialAbility || "";
    target.specialAbility2 = abilities[1] || "";
    // clear used flags for this player's abilities
    Object.keys(usedAbilities)
      .filter((abilityKey) => abilityKey.startsWith(`${target.number}:`))
      .forEach((abilityKey) => delete usedAbilities[abilityKey]);

    addGameLog(`Игрок ${context.actorNumber} перегенерировал способности Игроку ${target.number}`);
    refreshDerivedTraitData(target, traitKey);
    renderPack(currentPack);
    renderGameLog();
    if (isOnlineRoom()) syncHostState();
    return;
  }

  target[traitKey] = drawReplacementTrait(traitKey, target[traitKey]);
  refreshDerivedTraitData(target, traitKey);
  addGameLog(`Игрок ${context.actorNumber} перегенерировал ${getTraitAccusative(traitKey)} Игроку ${target.number}`);
}

function applyDefenseAbility(context) {
  const targetNumber = context.targetNumber || context.actorNumber;
  protectedPlayers.add(Number(targetNumber));
  addGameLog(`Игрок ${targetNumber} защищен от следующей способности или исключения`);
}

function applyCopyTraitAbility(context) {
  const actor = getPlayerByNumber(context.actorNumber);
  const target = getPlayerByNumber(context.targetNumber);
  const traitKey = context.traitKey;

  if (!actor || !target || !traitKey || !isTraitRevealed(target.number, traitKey)) {
    addGameLog(`Копирование Игрока ${context.actorNumber} требует открытую характеристику цели`);
    return;
  }

  actor[traitKey] = target[traitKey];
  refreshDerivedTraitData(actor, traitKey);
  addGameLog(`Игрок ${context.actorNumber} скопировал ${getTraitAccusative(traitKey)} Игрока ${context.targetNumber}`);
}

function applySetHealthAbility(context) {
  const target = getPlayerByNumber(context.targetNumber || context.actorNumber);

  if (!target) {
    addGameLog(`Лечение Игрока ${context.actorNumber} требует корректную цель`);
    return;
  }

  target.health = "Здоров";
  refreshDerivedTraitData(target, "health");
  addGameLog(`Игрок ${context.actorNumber} изменил здоровье Игрока ${target.number} на Здоров`);
}

function applySwapIdentityAbility(context) {
  const actor = getPlayerByNumber(context.actorNumber);
  const target = getPlayerByNumber(context.targetNumber);

  if (!actor || !target) {
    addGameLog(`Превращение Игрока ${context.actorNumber} требует корректную цель`);
    return;
  }

  ["gender", "race"].forEach((key) => {
    const actorValue = actor[key];
    actor[key] = target[key];
    target[key] = actorValue;
  });
  addGameLog(`Игрок ${context.actorNumber} обменялся полом и расой с Игроком ${context.targetNumber}`);
}

function applyPolymorphAbility(context) {
  const target = getPlayerByNumber(context.targetNumber);

  if (!target) {
    addGameLog(`Полиморф Игрока ${context.actorNumber} требует корректную цель`);
    return;
  }

  const race = drawCard("Раса", createDrawState());
  const gender = getThemeGenderByRace(race, drawReplacementTrait("gender", target.gender));
  target.race = race && race !== "Не указано" ? race : target.race;
  target.gender = gender || target.gender;
  target.age = formatAbilityAge(getThemeAgeByRace(target.race || target.gender, randomInt(18, 80)));
  target.bodyType = drawReplacementTrait("bodyType", target.bodyType);
  addGameLog(`Игрок ${context.actorNumber} применил полиморф к Игроку ${target.number}`);
}

function formatAbilityAge(ageValue) {
  if (typeof ageValue === "number") {
    return `${ageValue} ${getRussianYearWord(ageValue)}`;
  }

  const text = cleanText(ageValue, "");
  return text || generateAge();
}

function mergeStolenItem(currentValue, stolenValue) {
  const current = cleanText(currentValue, "");
  const stolen = cleanText(stolenValue, "");

  if (!stolen || stolen === "Украдено" || stolen === "Не указано") {
    return current || "Не указано";
  }

  if (!current || current === "Украдено" || current === "Не указано") {
    return stolen;
  }

  if (current.includes(stolen)) {
    return current;
  }

  return `${current}; ${stolen}`;
}

function drawReplacementTrait(traitKey, currentValue) {
  if (traitKey === "age") {
    return generateAge();
  }

  if (traitKey === "specialAbility") {
    const abilities = [];
    const drawState = createDrawState();

    while (abilities.length < 2) {
      const ability = drawCard(cardSections.specialAbility, drawState, new Set(abilities));

      if (ability === "Не указано") {
        break;
      }

      abilities.push(ability);
    }

    return abilities.join("; ") || cleanText(currentValue);
  }

  const section = cardSections[traitKey];
  const cards = cardDatabase[section] || [];
  const candidates = cards.filter((card) => card !== currentValue);
  return pickRandom(candidates.length > 0 ? candidates : cards) || cleanText(currentValue);
}

function refreshDerivedTraitData(player, traitKey) {
  if (traitKey !== "health") {
    return;
  }

  player.healthSeverity = getHealthSeverity(player.health);
  player.healthExplanation = getHealthExplanation(player.health);
}

const SURVIVAL_RULE_GROUPS = {
  resources: [
    { points: 50, label: "Есть консервы или пайки", keywords: ["консервы", "консерв", "пайки"] },
    { points: 50, label: "Есть семена или фермер", keywords: ["семена"], also: (ctx) => ctx.professions.some((p) => p.includes("фермер")) },
    { points: 50, label: "Есть вода или фильтр", keywords: ["вода", "фильтр"] }
  ],
  professions: [
    { points: 75, label: "Есть медицинская роль", keywords: ["врач", "мед"] },
    { points: 75, label: "Есть техническая или строительная роль", pattern: /инженер|механик|электрик|строитель/ },
    { points: 25, label: "Есть защита или безопасность", pattern: /охранник|военный|полицейский/ },
    { points: 25, label: "Есть добыча или производство еды", pattern: /фермер|агроном|охотник/ }
  ],
  info: [
    { points: 25, label: "Есть полезное образование", keywords: ["образования"] },
    { points: 50, label: "Есть научные знания", keywords: ["учен", "учёный"] },
    { points: 25, label: "Есть опыт катастрофы", keywords: ["катастрофе"] },
    { points: -40, label: "Опасная история: убийство", keywords: ["убил", "убила", "убий"] },
    { points: -30, label: "Риск доверия: патологическая ложь", keywords: ["лжец", "лгун", "патолог"] },
    { points: -25, label: "Конфликт с другим игроком", keywords: ["враг", "ненавид"] },
    { points: -20, label: "Криминальное прошлое", keywords: ["тюрьм", "сидел", "заключ"] }
  ],
  equipment: [
    { points: 50, label: "Есть генератор или солнечная энергия", keywords: ["генератор", "солнеч"] },
    { points: 25, label: "Есть инструменты", keywords: ["инструмент"] },
    { points: 25, label: "Есть аптечка или медикаменты", keywords: ["аптечка", "мед"] }
  ],
  health: [
    { points: 10, label: "Хорошее здоровье или иммунитет", keywords: ["идеальное", "сильный иммунитет", "иммунитет"] },
    { points: -50, label: "Критическое заболевание", pattern: /рак|инсульт|тяжел|тяжёл/ },
    { points: -40, label: "Тяжелый психический риск", pattern: /психоз|шизофрени/ }
  ],
  traits: [
    { points: 25, label: "Есть лидерские качества", keywords: ["лидер"] },
    { points: 25, label: "Есть трудолюбие", keywords: ["работяга", "работ"] },
    { points: 25, label: "Есть миротворец", keywords: ["миротворец"] },
    { points: -25, label: "Конфликтная черта", keywords: ["конфликт"] },
    { points: -25, label: "Ленивая черта", keywords: ["ленив"] }
  ],
  synergies: [
    {
      points: 50,
      label: "Синергия: фермер + семена",
      test: (ctx) => ctx.professions.some((p) => p.includes("фермер")) && ctx.allItems.some((i) => i.includes("семена"))
    },
    {
      points: 50,
      label: "Синергия: врач + аптечка",
      test: (ctx) => ctx.professions.some((p) => p.includes("врач")) && ctx.allItems.some((i) => i.includes("аптечка"))
    },
    {
      points: 50,
      label: "Синергия: инженер/механик + инструменты",
      test: (ctx) => ctx.professions.some((p) => p.match(/инженер|механик/)) && ctx.allItems.some((i) => i.includes("инструмент"))
    }
  ]
};

function getTraitInstrumental(traitKey) {
  const labels = {
    gender: "полом",
    bodyType: "типом тела",
    trait: "чертой",
    age: "возрастом",
    profession: "профессией",
    health: "здоровьем",
    hobby: "хобби",
    phobia: "фобией",
    largeInventory: "крупным инвентарем",
    backpack: "рюкзаком",
    additionalInfo: "информацией",
    specialAbility: "способностью"
  };

  return labels[traitKey] || "характеристикой";
}

function getTraitAccusative(traitKey) {
  const labels = {
    gender: "пол",
    bodyType: "тип тела",
    trait: "черту",
    age: "возраст",
    profession: "профессию",
    health: "здоровье",
    hobby: "хобби",
    phobia: "фобию",
    largeInventory: "крупный инвентарь",
    backpack: "рюкзак",
    additionalInfo: "информацию",
    specialAbility: "способность"
  };

  return labels[traitKey] || "характеристику";
}

function getVotingPlayers() {
  return currentPack?.players || [];
}

function getVotingPlayerLabel(playerNumber) {
  const player = getPlayerByNumber(playerNumber);
  const slotName = getRoomPlayerForSlot(playerNumber)?.name || "";
  const name = slotName || (isOwnPlayer(playerNumber) && currentPlayerName) || `Игрок ${playerNumber}`;
  const profession = player && canViewTrait(playerNumber, "profession") ? cleanText(player.profession, "") : "";

  return profession ? `${name} · ${profession}` : name;
}

function getActiveVotingPlayers() {
  if (!currentPack?.players?.length) {
    return [];
  }

  const generatedNumbers = new Set(currentPack.players.map((player) => Number(player.number)));

  if (isOnlineRoom()) {
    return roomPlayers
      .filter((player) => player.connected)
      .filter((player) => Number(player.playerNumber))
      .filter((player) => generatedNumbers.has(Number(player.playerNumber)))
      .filter((player) => !excludedPlayers.has(Number(player.playerNumber)))
      .map((player) => ({
        number: Number(player.playerNumber),
        name: player.name || `Игрок ${player.playerNumber}`,
        isHost: Boolean(player.isHost)
      }));
  }

  return currentPack.players
    .filter((player) => !excludedPlayers.has(player.number))
    .map((player) => ({
      number: player.number,
      name: `Игрок ${player.number}`,
      isHost: player.number === currentPlayerNumber
    }));
}

function openVotingModal(resetSetup = false) {
  if (!currentPack?.players?.length) {
    setStatus("Сначала сгенерируйте пак.", "error");
    return;
  }

  if (votingState?.active) {
    votingSetupOpen = false;
    dismissedVotingId = "";
    renderVotingModal();
    votingModal.hidden = false;
    return;
  }

  if (["defense", "pending-decision"].includes(votingState?.status)) {
    votingSetupOpen = false;
    dismissedVotingId = "";
    renderVotingModal();
    votingModal.hidden = false;
    return;
  }

  if (votingState?.status === "ended") {
    if (resetSetup && isHostView() && isOnlineRoom()) {
      startVotingFromSetup();
      return;
    }

    closeVotingModal();
    return;
  }

  if (!isHostView()) {
    setStatus("Голосование может начать только ведущий.", "error");
    return;
  }

  if (!isOnlineRoom()) {
    setStatus("Голосование доступно в онлайн-комнате, чтобы игроки могли голосовать со своих устройств.", "error");
    return;
  }

  startVotingFromSetup();
}

function renderVotingModal() {
  if (!votingList || !votingResults || !votingStatus || !votingSetup || !votingParticipants) {
    return;
  }

  votingSetupOpen = false;
  votingSetup.hidden = true;
  votingTimer.hidden = true;
  votingSetup.innerHTML = "";

  if (!votingState) {
    votingStatus.textContent = "Голосование не активно.";
    votingList.innerHTML = "";
    votingParticipants.innerHTML = "";
    votingResults.hidden = true;
    votingResults.innerHTML = "";
    votingFinishButton.hidden = true;
    votingResetButton.hidden = true;
    stopVotingCountdown();
    updateVotingTimerText(30);
    return;
  }

  const isActive = Boolean(votingState.active);
  const isDefense = votingState.status === "defense";
  const isPendingDecision = votingState.status === "pending-decision";
  const hasVoted = votingState.voted?.includes(Number(currentPlayerNumber));
  const participantNumbers = new Set((votingState.participants || []).map((player) => Number(player.number)));
  const canVote = isActive && participantNumbers.has(Number(currentPlayerNumber)) && !hasVoted;

  votingStatus.textContent = getVotingStatusText(hasVoted);
  votingList.innerHTML = isDefense || isPendingDecision
    ? renderVotingDefensePhase()
    : renderVotingCandidateList(canVote, hasVoted);
  votingParticipants.innerHTML = renderVotingParticipants();

  if (votingState.result) {
    votingResults.hidden = false;
    votingResults.innerHTML = renderVotingResults(votingState.result);
  } else {
    votingResults.hidden = true;
    votingResults.innerHTML = "";
  }

  votingFinishButton.hidden = true;
  votingFinishButton.disabled = true;
  votingResetButton.hidden = !isHostView() || !isActive;
  votingResetButton.textContent = "Завершить голосование";
  votingResetButton.disabled = false;

  if (isPendingDecision && isHostView()) {
    votingFinishButton.hidden = false;
    votingFinishButton.disabled = false;
    votingFinishButton.textContent = "Исключить";
    votingResetButton.hidden = false;
    votingResetButton.disabled = false;
    votingResetButton.textContent = "Оставить";
  }

  if (isDefense && votingState.defense?.endsAt) {
    votingTimer.hidden = false;
    startVotingCountdown();
  } else {
    stopVotingCountdown();
  }
}

function renderVotingSetup() {
  const activePlayers = getActiveVotingPlayers();
  votingSetup.innerHTML = `
    <div class="voting-setup-grid">
      ${activePlayers.map((player) => `
        <label class="voting-candidate-toggle">
          <input type="checkbox" data-voting-candidate="${player.number}" ${localVotingCandidates.has(player.number) ? "checked" : ""}>
          <span>
            <strong>Игрок ${player.number}</strong>
            <small>${escapeHtml(getVotingPlayerLabel(player.number))}</small>
          </span>
        </label>
      `).join("") || `<div class="voting-empty">Нет занятых активных слотов.</div>`}
    </div>
  `;
}

function getVotingStatusText(hasVoted) {
  if (!votingState) {
    return "Голосование не активно.";
  }

  if (votingState.status === "defense") {
    return `Защита Игрока ${votingState.defense?.targetNumber || "?"}. Ожидание 20 секунд.`;
  }

  if (votingState.status === "pending-decision") {
    return `Защита завершена. Ведущий решает: исключить Игрока ${votingState.defense?.targetNumber || "?"} или оставить.`;
  }

  if (votingState.active) {
    const votedCount = votingState.voted?.length || 0;
    const total = votingState.participants?.length || 0;
    return hasVoted
      ? `Голос принят. Ожидание голосов... ${votedCount} из ${total}.`
      : `Ожидание голосов... ${votedCount} из ${total}.`;
  }

  return votingState.result?.message || votingState.message || "Голосование завершено.";
}

function renderVotingDefensePhase() {
  const targetNumber = Number(votingState?.defense?.targetNumber);
  const isTarget = targetNumber && Number(currentPlayerNumber) === targetNumber;
  const isDecision = votingState?.status === "pending-decision";

  return `
    <article class="voting-defense-card">
      <div>
        <strong>Игрок ${targetNumber || "?"}</strong>
        <span>${isDecision ? "Ожидает решения ведущего" : "Фаза защиты"}</span>
      </div>
      <button class="secondary-button voting-defense-button" type="button" ${isTarget && !isDecision ? "" : "disabled"}>
        Защита
      </button>
    </article>
  `;
}

function renderVotingCandidateList(canVote, hasVoted) {
  const candidates = (votingState?.candidates || [])
    .filter((candidate) => Number(candidate.number) !== Number(currentPlayerNumber));

  if (!candidates.length) {
    return `<div class="voting-empty">Нет доступных кандидатов.</div>`;
  }

  return candidates.map((candidate) => `
    <article class="voting-candidate-card">
      <div>
        <strong>Игрок ${candidate.number}</strong>
        <span>${escapeHtml(getVotingPlayerLabel(candidate.number) || candidate.name || `Игрок ${candidate.number}`)}</span>
      </div>
      <button class="secondary-button voting-vote-button" type="button" data-vote-candidate="${candidate.number}" ${!canVote ? "disabled" : ""}>
        ${hasVoted ? "Голос отправлен" : "Проголосовать"}
      </button>
    </article>
  `).join("");
}

function renderVotingParticipants() {
  const voted = new Set(votingState?.voted || []);
  const participants = votingState?.participants || [];
  return `
    <span>Участники</span>
    <div>
      ${participants.map((player) => `
        <strong class="${voted.has(Number(player.number)) ? "voted" : ""}">
          Игрок ${player.number}${voted.has(Number(player.number)) ? " ✓" : ""}
        </strong>
      `).join("")}
    </div>
  `;
}

function startVotingFromSetup() {
  if (!isHostView() || !isOnlineRoom()) {
    return;
  }

  socket.emit("voting-start", { roomCode: currentRoomCode }, (response) => {
    if (!response?.ok) {
      setStatus(response?.error || "Не удалось начать голосование.", "error");
      return;
    }

    votingSetupOpen = false;
    setStatus("Голосование началось.", "success");
  });
}

function renderVotingResults(result) {
  const rows = Object.entries(result.counts || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([playerNumber, count]) => {
      const isWinner = Number(result.eliminated) === Number(playerNumber);
      return `
        <div class="voting-result-row${isWinner ? " winner" : ""}">
          <span>Игрок ${playerNumber}</span>
          <strong>${count}</strong>
        </div>
      `;
    })
    .join("");

  return `
    <div class="voting-result-title">${escapeHtml(result.message || "Голосование завершено")}</div>
    ${rows}
  `;
}

function submitVote(candidateNumber) {
  if (!isOnlineRoom() || !votingState?.active) {
    return;
  }

  socket.emit("voting-submit", { roomCode: currentRoomCode, candidate: Number(candidateNumber) }, (response) => {
    if (!response?.ok) {
      setStatus(response?.error || "Не удалось отправить голос.", "error");
    }
  });
}

function skipVoting() {
  if (!isOnlineRoom() || !isHostView()) {
    return;
  }

  socket.emit("voting-skip", { roomCode: currentRoomCode }, (response) => {
    if (!response?.ok) {
      setStatus(response?.error || "Не удалось завершить голосование.", "error");
    }
  });
}

function submitVotingDefenseDecision(decision) {
  if (!isOnlineRoom() || !isHostView()) {
    return;
  }

  socket.emit("voting-defense-decision", { roomCode: currentRoomCode, decision }, (response) => {
    if (!response?.ok) {
      setStatus(response?.error || "Не удалось принять решение.", "error");
    }
  });
}

function renderVotingFromState() {
  if (!votingState) {
    if (!votingSetupOpen) {
      closeVotingModal();
    }
    return;
  }

  if (votingState.status === "ended") {
    closeVotingModal();
    return;
  }

  if (votingState.status === "defense") {
    const targetNumber = Number(votingState.defense?.targetNumber);
    if (isHostView() || Number(currentPlayerNumber) === targetNumber) {
      votingSetupOpen = false;
      renderVotingModal();
      votingModal.hidden = false;
      return;
    }

    closeVotingModal();
    return;
  }

  if (votingState.status === "pending-decision") {
    if (isHostView()) {
      votingSetupOpen = false;
      renderVotingModal();
      votingModal.hidden = false;
      return;
    }

    closeVotingModal();
    return;
  }

  const participantNumbers = new Set((votingState.participants || []).map((player) => Number(player.number)));
  if (votingState.active && participantNumbers.has(Number(currentPlayerNumber))) {
    votingSetupOpen = false;
    renderVotingModal();
    votingModal.hidden = false;
    return;
  }

  closeVotingModal();
}

function updateVotingTimerText(seconds) {
  if (votingTimer) {
    votingTimer.textContent = String(Math.max(0, Math.ceil(seconds)));
  }
}

function startVotingCountdown() {
  stopVotingCountdown();
  const tick = () => {
    const endsAt = votingState?.defense?.endsAt || votingState?.endsAt;
    const remaining = endsAt ? (Number(endsAt) - Date.now()) / 1000 : 0;
    updateVotingTimerText(remaining);
  };
  tick();
  votingCountdownTimer = window.setInterval(tick, 250);
}

function stopVotingCountdown() {
  if (votingCountdownTimer) {
    window.clearInterval(votingCountdownTimer);
    votingCountdownTimer = null;
  }
}

function closeVotingModal() {
  if (votingModal) {
    votingModal.hidden = true;
  }
  if (votingState?.status === "ended") {
    dismissedVotingId = votingState.id;
  }
  votingSetupOpen = false;
  stopVotingCountdown();
}

function handleSurvivalCalculation() {
  if (!canCalculateSurvival()) {
    setStatus("Расчет доступен только ведущему в финале, когда осталось игроков ровно по количеству мест в бункере.", "error");
    return;
  }

  addGameLog("Начат расчет выживания");
  const result = calculateSurvival(getRemainingPlayers(), { role: appRole });
  if (!result) {
    setStatus("Расчет выживания может запускать только ведущий.", "error");
    return;
  }

  addGameLog(`Результат выживания: ${result.score} — ${result.result}`);
  renderGameLog();
  renderSurvivalResult(result);
  openSurvivalModal();
  syncHostState();
}

function calculateSurvival(players, user) {
  if (!user || (user.role !== ROLE_HOST && user.role !== "host")) {
    return null;
  }

  const ctx = createSurvivalContext(players);
  const factors = [];
  let score = 0;

  Object.entries(SURVIVAL_RULE_GROUPS).forEach(([groupName, rules]) => {
    rules.forEach((rule) => {
      if (!survivalRuleMatches(rule, ctx, groupName)) {
        return;
      }

      score += rule.points;
      factors.push({
        points: rule.points,
        label: rule.label
      });
    });
  });

  return {
    score,
    result: getSurvivalResultText(score),
    positiveFactors: factors.filter((factor) => factor.points > 0).map(formatSurvivalFactor),
    negativeFactors: factors.filter((factor) => factor.points < 0).map(formatSurvivalFactor)
  };
}

function createSurvivalContext(players) {
  const allItems = players
    .flatMap((player) => [String(player.largeInventory || ""), String(player.backpack || "")])
    .map(normalizeSurvivalText);
  const professions = players.map((player) => normalizeSurvivalText(player.profession));
  const traits = players.map((player) => normalizeSurvivalText(player.trait));
  const health = players.map((player) => normalizeSurvivalText(player.health));
  const info = players.map((player) => normalizeSurvivalText(player.additionalInfo));

  return { allItems, professions, traits, health, info };
}

function survivalRuleMatches(rule, ctx, groupName) {
  if (typeof rule.test === "function") {
    return rule.test(ctx);
  }

  if (rule.also?.(ctx)) {
    return true;
  }

  const sourcesByGroup = {
    resources: ["allItems"],
    equipment: ["allItems"],
    professions: ["professions"],
    info: ["info"],
    health: ["health"],
    traits: ["traits"]
  };

  return (sourcesByGroup[groupName] || []).some((source) => sourceMatchesRule(ctx[source], rule));
}

function sourceMatchesRule(values, rule) {
  if (rule.pattern) {
    return values.some((value) => rule.pattern.test(value));
  }

  if (Array.isArray(rule.keywords)) {
    return values.some((value) => rule.keywords.some((keyword) => value.includes(normalizeSurvivalText(keyword))));
  }

  return false;
}

function normalizeSurvivalText(value) {
  return cleanText(value, "").toLowerCase().replace(/ё/g, "е");
}

function formatSurvivalFactor(factor) {
  return `${factor.label} (${factor.points > 0 ? "+" : ""}${factor.points})`;
}

function getSurvivalResultText(score) {
  if (score < 200) {
    return "Вы погибнете";
  }

  if (score < 350) {
    return "Шансы низкие";
  }

  if (score < 500) {
    return "Выживете с потерями";
  }

  return "Высокие шансы на выживание";
}

function renderSurvivalResult(result) {
  if (!survivalResult) {
    return;
  }

  survivalResult.innerHTML = `
    <div class="survival-score">
      <strong>${result.score}</strong>
      <span>${escapeHtml(result.result)}</span>
    </div>
    <div class="survival-summary-grid">
      <section>
        <h4>Главные плюсы</h4>
        ${renderSurvivalList(result.positiveFactors.length ? result.positiveFactors : ["Положительные факторы не обнаружены"])}
      </section>
      <section>
        <h4>Главные минусы</h4>
        ${renderSurvivalList(result.negativeFactors.length ? result.negativeFactors : ["Критичных минусов не обнаружено"])}
      </section>
    </div>
  `;
}

function renderSurvivalList(items) {
  return `<ul>${items.slice(0, 12).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function openSurvivalModal() {
  if (survivalModal) {
    survivalModal.hidden = false;
    survivalOkButton?.focus();
  }
}

function closeSurvivalModal() {
  if (survivalModal) {
    survivalModal.hidden = true;
  }
}

function addGameLog(message) {
  gameLog.push(message);
}

function renderGameLog() {
  if (gameLogPanel) {
    gameLogPanel.hidden = !isHostView();
  }

  if (!isHostView()) {
    return;
  }

  if (!gameLogList) {
    return;
  }

  if (gameLog.length === 0) {
    gameLogList.innerHTML = `<li class="log-empty">Действий пока нет</li>`;
    return;
  }

  gameLogList.innerHTML = gameLog
    .slice(-40)
    .map((message) => `<li>${escapeHtml(message)}</li>`)
    .join("");
  gameLogList.scrollTop = gameLogList.scrollHeight;
}

function closeAbilityModal() {
  if (abilityModal) {
    abilityModal.hidden = true;
  }

  pendingAbility = null;
}

function showConfirm(title, message, onConfirm, options = {}) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmYesButton.textContent = options.confirmLabel || "Да";
  confirmNoButton.textContent = options.cancelLabel || "Нет";
  confirmAction = onConfirm;
  confirmModal.hidden = false;
  confirmYesButton.focus();
}

function closeConfirm() {
  confirmModal.hidden = true;
  confirmAction = null;
  confirmYesButton.textContent = "Да";
  confirmNoButton.textContent = "Нет";
}

function openSetupModal(modalId) {
  const modal = document.querySelector(`#${modalId}`);

  if (!modal) {
    return;
  }

  closeHelpPanel();
  setupModals.forEach((setupModal) => {
    setupModal.hidden = setupModal !== modal;
  });

  const closeButton = modal.querySelector("[data-close-setup]");
  closeButton?.focus();
}

function closeAllSetupModals() {
  setupModals.forEach((modal) => {
    modal.hidden = true;
  });
}

async function handleGeneratePackAction() {
  if (await generateLocalPack()) {
    closeAllSetupModals();
  }
}

function openHelpPanel() {
  if (!helpModal) {
    return;
  }

  helpModal.hidden = false;
  helpButton?.setAttribute("aria-expanded", "true");
}

function closeHelpPanel() {
  if (!helpModal) {
    return;
  }

  helpModal.hidden = true;
  helpButton?.setAttribute("aria-expanded", "false");
}

function toggleHelpPanel() {
  if (!helpModal || helpModal.hidden) {
    openHelpPanel();
    return;
  }

  closeHelpPanel();
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeSvgText(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function selectRandomTheme() {
  if (!isHostView()) {
    setStatus("Менять настройки может только ведущий.", "error");
    return;
  }

  const randomIndex = Math.floor(Math.random() * themeSelect.options.length);
  themeSelect.selectedIndex = randomIndex;
  applySelectedTheme();
  setStatus("Случайная тема выбрана. Нажми «Сгенерировать пак».", "");
}

function isTouchTooltipMode() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function closeActiveAbilityTooltips(exceptButton = null) {
  characterGrid.querySelectorAll(".ability-use-button.tooltip-open").forEach((activeButton) => {
    if (activeButton !== exceptButton) {
      activeButton.classList.remove("tooltip-open");
    }
  });
}

/* Table hover handlers removed to disable row/column hover highlighting */

characterGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  // removed health-info tooltip handling (tooltip element was removed)

  const playerNumber = Number(button.dataset.player);

  if (button.dataset.action === "use-ability") {
    if (button.disabled) {
      return;
    }

    if (button.classList.contains("ability-use-button") && isTouchTooltipMode() && !button.classList.contains("tooltip-open")) {
      closeActiveAbilityTooltips(button);
      button.classList.add("tooltip-open");
      return;
    }

    closeActiveAbilityTooltips();
    openAbilityModal(playerNumber, Number(button.dataset.abilityIndex));
    return;
  }

  if (button.dataset.action === "reveal-trait") {
    console.log("[trait-reveal] handler fired", {
      playerId: playerNumber,
      field: button.dataset.trait
    });

    if (!canRevealTrait(playerNumber)) {
      return;
    }

    const confirmMessage = isHostView()
      ? "Ведущий хочет открыть эту характеристику?"
      : "Открыть эту характеристику?";

    showConfirm(
      "Открытие характеристики",
      confirmMessage,
      () => revealTrait(playerNumber, button.dataset.trait)
    );
  }

  if (button.dataset.action === "force-reveal-trait") {
    if (!isHostView()) {
      return;
    }

    showConfirm(
      "Принудительное открытие",
      "Открыть эту характеристику всем игрокам?",
      () => forceRevealTrait(playerNumber, button.dataset.trait),
      { confirmLabel: "Открыть" }
    );
    return;
  }

  if (button.dataset.action === "reroll-trait") {
    rerollTrait(playerNumber, button.dataset.trait);
  }


  if (button.dataset.action === "reveal-all") {
    if (!isHostView()) {
      return;
    }

    showConfirm(
      "Открыть все",
      "Открыть все характеристики этого игрока?",
      () => revealAllTraits(playerNumber)
    );
  }

  if (button.dataset.action === "force-reveal-all") {
    if (!isHostView()) {
      return;
    }

    showConfirm(
      "Принудительно открыть все",
      "Открыть все характеристики этого игрока всем?",
      () => forceRevealAllTraits(playerNumber),
      { confirmLabel: "Открыть все" }
    );
  }

  if (button.dataset.action === "exclude") {
    if (!isHostView()) {
      return;
    }

    toggleExcluded(playerNumber);
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".ability-use-button")) {
    closeActiveAbilityTooltips();
  }
});

helpButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  openHelpPanel();
});
helpCloseButton?.addEventListener("click", closeHelpPanel);
helpModal?.addEventListener("click", (event) => {
  if (event.target === helpModal) {
    closeHelpPanel();
  }
});

settingsPanelButton?.addEventListener("click", () => openSetupModal("gameSettingsModal"));
roomPanelButton?.addEventListener("click", () => openSetupModal("roomSetupModal"));
rolePanelButton?.addEventListener("click", () => openSetupModal("roleSetupModal"));
votingButton?.addEventListener("click", () => {
  if (!isHostView()) {
    return;
  }

  if (votingState?.active) {
    openVotingModal(false);
    return;
  }

  openVotingModal(true);
});
survivalButton?.addEventListener("click", handleSurvivalCalculation);
setupModals.forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-close-setup]")) {
      closeAllSetupModals();
    }
  });
});

confirmYesButton.addEventListener("click", () => {
  if (confirmAction) {
    confirmAction();
  }

  closeConfirm();
});

confirmNoButton.addEventListener("click", closeConfirm);

confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirm();
  }
});

votingCloseButton?.addEventListener("click", closeVotingModal);
votingFinishButton?.addEventListener("click", () => {
  if (votingSetupOpen) {
    startVotingFromSetup();
    return;
  }

  if (votingState?.status === "pending-decision") {
    submitVotingDefenseDecision("kick");
    return;
  }

  if (votingState?.status === "ended") {
    openVotingModal(true);
  }
});
votingResetButton?.addEventListener("click", () => {
  if (votingSetupOpen) {
    closeVotingModal();
    return;
  }

  if (votingState?.status === "pending-decision") {
    submitVotingDefenseDecision("keep");
    return;
  }

  if (votingState?.active) {
    skipVoting();
  }
});
votingSetup?.addEventListener("change", (event) => {
  const checkbox = event.target.closest("input[data-voting-candidate]");

  if (!checkbox) {
    return;
  }

  const playerNumber = Number(checkbox.dataset.votingCandidate);
  if (checkbox.checked) {
    localVotingCandidates.add(playerNumber);
  } else {
    localVotingCandidates.delete(playerNumber);
  }

  renderVotingModal();
});
votingList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-vote-candidate]");

  if (!button) {
    return;
  }

  submitVote(button.dataset.voteCandidate);
});
votingModal?.addEventListener("click", (event) => {
  if (event.target === votingModal) {
    closeVotingModal();
  }
});
survivalCloseButton?.addEventListener("click", closeSurvivalModal);
survivalOkButton?.addEventListener("click", closeSurvivalModal);
survivalModal?.addEventListener("click", (event) => {
  if (event.target === survivalModal) {
    closeSurvivalModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllSetupModals();
    closeVotingModal();
    closeSurvivalModal();
    closeHelpPanel();
  }
});

abilityTargetSelect.addEventListener("change", () => {
  updateAbilityTraitOptions();
  updateAbilityConfirmState();
});

abilityTraitSelect.addEventListener("change", updateAbilityConfirmState);
abilityConfirmButton.addEventListener("click", confirmAbilityUse);
abilityCancelButton.addEventListener("click", closeAbilityModal);

abilityModal.addEventListener("click", (event) => {
  if (event.target === abilityModal) {
    closeAbilityModal();
  }
});

generateButton.addEventListener("click", handleGeneratePackAction);
randomThemeButton.addEventListener("click", selectRandomTheme);
cardViewButton?.addEventListener("click", () => setCharacterView(VIEW_CARDS));
tableViewButton?.addEventListener("click", () => setCharacterView(VIEW_TABLE));
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    createRoomButton?.addEventListener("click", createOnlineRoom);
  }, { once: true });
} else {
  createRoomButton?.addEventListener("click", createOnlineRoom);
}
joinRoomButton?.addEventListener("click", joinOnlineRoom);
roomCodeInput?.addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  syncStartRoomCode(roomCodeInput.value);
});
startCreateButton?.addEventListener("click", openStartCreateModal);
startJoinButton?.addEventListener("click", openStartJoinModal);
startDevTestButton?.addEventListener("click", startDevTestGame);
startCreateConfirmButton?.addEventListener("click", startCreateGame);
startJoinConfirmButton?.addEventListener("click", startJoinGame);
startCreateNameInput?.addEventListener("input", () => {
  syncStartPlayerName(startCreateNameInput.value);
  savePlayerName(startCreateNameInput.value);
});
startJoinNameInput?.addEventListener("input", () => {
  syncStartPlayerName(startJoinNameInput.value);
  savePlayerName(startJoinNameInput.value);
});
startJoinRoomCodeInput?.addEventListener("input", () => {
  syncStartRoomCode(startJoinRoomCodeInput.value);
});
document.querySelectorAll("[data-start-modal-close]").forEach((button) => {
  button.addEventListener("click", closeStartModals);
});
startCreateModal?.addEventListener("click", (event) => {
  if (event.target === startCreateModal) {
    closeStartModals();
  }
});
startJoinModal?.addEventListener("click", (event) => {
  if (event.target === startJoinModal) {
    closeStartModals();
  }
});
startCreateNameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    startCreateGame();
  }
});
startJoinNameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    startJoinRoomCodeInput?.focus();
  }
});
startJoinRoomCodeInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    startJoinGame();
  }
});
hostRoleButton?.addEventListener("click", () => setRole(ROLE_HOST));
playerRoleButton?.addEventListener("click", () => setRole(ROLE_PLAYER));
playerNumberSelect?.addEventListener("change", () => {
  currentPlayerNumber = clampPlayerNumber(playerNumberSelect.value);
  if (currentPack) {
    renderPack(currentPack);
  }
});
playerNameInput?.addEventListener("input", () => {
  currentPlayerName = cleanText(playerNameInput.value, "");
  if (currentPack) {
    renderPack(currentPack);
  }
});
playerCountSelect.addEventListener("change", () => {
  currentPlayerNumber = clampPlayerNumber(currentPlayerNumber);
  updatePlayerNumberOptions();
});
themeSelect?.addEventListener("change", applySelectedTheme);

initializeStartScreen();
setGenerationReady(false);
renderThemeOptions();
applySelectedTheme();
updateRoleControls();
updateViewToggle();

if (window.location.protocol === "file:") {
  const message = `Открой сайт через сервер: ${PUBLIC_APP_URL}. Не открывай index.html напрямую.`;
  console.error(message);
  setStatus(message, "error");
} else {
  initializeSocket();
  if (shouldRunDevShortcut()) {
    window.setTimeout(startDevTestGame, 0);
  }
  loadCardDatabase()
    .then((database) => {
      cardDatabase = database;
      cardDatabaseCache.set(DEFAULT_THEME_ID, database);
      const defaultPack = createLocalPack({ playerCount: 6 });
      resetGameState(defaultPack);
      renderPack(defaultPack);
      setGenerationReady(true);
      setStatus(appRole ? (isHostView() ? "Режим ведущего включен." : "Режим игрока включен.") : "Выберите роль перед началом игры.", "");
    })
    .catch((error) => {
      console.error("cards.txt недоступен, используется встроенный резервный набор.", error);
      cardDatabase = createFallbackCardDatabase();
      cardDatabaseCache.set(DEFAULT_THEME_ID, cardDatabase);
      const defaultPack = createLocalPack({ playerCount: 6 });
      resetGameState(defaultPack);
      renderPack(defaultPack);
      setGenerationReady(true);
      setStatus("Не удалось загрузить cards.txt. Используется встроенный резервный набор.", "error");
    });
}
