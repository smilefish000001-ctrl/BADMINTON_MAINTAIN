import { venues } from "./venues.js";
import { recurringGroups, weekdayLabels } from "./groups.js";
import { canAccessView, createGuestUser, createSessionUser } from "./account.js";
import { getUpcomingWeekDays } from "./week-dates.js";
import { matchesWeekEntityFilters } from "./week-filters.js";
import { mergeStoredGroups } from "./stored-data.js";

const venueStorageKey = "badminton-venue-directory-v1";
const groupStorageKey = "badminton-group-directory-v1";
const groupColorStorageKey = "badminton-group-colors-v1";
const groupFavoriteStorageKey = "badminton-group-favorites-v1";
const weekColorModeStorageKey = "badminton-week-color-mode-v2";
function normalizeColor(color, fallback) {
  return /^#[0-9a-f]{6}$/i.test(color || "") ? color.toLowerCase() : fallback;
}

function colorTint(color, opacity = 0.11) {
  const value = normalizeColor(color, "#076b59").slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function colorAt(index) {
  const hue = (210 + index * 137.508) % 360;
  const saturation = 62 + (index % 3) * 5;
  const lightness = 36 + (index % 2) * 5;
  const chroma = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
  const section = hue / 60;
  const intermediate = chroma * (1 - Math.abs(section % 2 - 1));
  const [redPart, greenPart, bluePart] = section < 1 ? [chroma, intermediate, 0]
    : section < 2 ? [intermediate, chroma, 0]
      : section < 3 ? [0, chroma, intermediate]
        : section < 4 ? [0, intermediate, chroma]
          : section < 5 ? [intermediate, 0, chroma]
            : [chroma, 0, intermediate];
  const match = lightness / 100 - chroma / 2;
  return `#${[redPart, greenPart, bluePart].map((part) => Math.round((part + match) * 255).toString(16).padStart(2, "0")).join("")}`;
}

const colorClassCache = new Map();
function colorClass(scope, key, color) {
  const identity = `${scope}:${key}`;
  let hash = 2166136261;
  for (const character of identity) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const className = `entity-color-${scope}-${(hash >>> 0).toString(36)}`;
  const normalized = normalizeColor(color, "#64748b");
  if (colorClassCache.get(className) === normalized) return className;

  const styleSheet = [...document.styleSheets].find((sheet) => sheet.href?.includes("/styles.css"));
  if (!styleSheet) return className;
  styleSheet.insertRule(`.${className}{--entity-color:${normalized};--entity-tint:${colorTint(normalized, 0.2)};--entity-border:${colorTint(normalized, 0.42)}}`, styleSheet.cssRules.length);
  colorClassCache.set(className, normalized);
  return className;
}
try {
  const storedVenues = JSON.parse(localStorage.getItem(venueStorageKey) || "null");
  if (Array.isArray(storedVenues) && storedVenues.every((venue) => venue.id && venue.name && venue.address)) {
    const storedById = new Map(storedVenues.map((venue) => [venue.id, venue]));
    venues.forEach((venue) => Object.assign(venue, storedById.get(venue.id) || {}));
    storedVenues.filter((venue) => !venues.some((item) => item.id === venue.id)).forEach((venue) => venues.push(venue));
  }
} catch {
  localStorage.removeItem(venueStorageKey);
}
try {
  const storedGroups = JSON.parse(localStorage.getItem(groupStorageKey) || "null");
  if (Array.isArray(storedGroups) && storedGroups.every((group) => group.id && group.name && Array.isArray(group.sessions))) {
    mergeStoredGroups(recurringGroups, storedGroups);
  }
} catch {
  localStorage.removeItem(groupStorageKey);
}

venues.forEach((venue, index) => {
  venue.status = venue.status === "disabled" || venue.status === "hidden" ? "disabled" : "active";
  venue.favorite = venue.favorite === true;
  venue.color = normalizeColor(venue.color, colorAt(index + 3));
});
recurringGroups.forEach((group, index) => {
  group.status = group.status === "disabled" || group.status === "hidden" ? "disabled" : "active";
  group.favorite = group.favorite === true;
  group.color = normalizeColor(group.color, colorAt(index));
});
try {
  const storedGroupColors = JSON.parse(localStorage.getItem(groupColorStorageKey) || "{}");
  recurringGroups.forEach((group) => {
    group.color = normalizeColor(storedGroupColors[group.id], group.color);
  });
} catch {
  localStorage.removeItem(groupColorStorageKey);
}
try {
  const storedGroupFavorites = JSON.parse(localStorage.getItem(groupFavoriteStorageKey) || "{}");
  recurringGroups.forEach((group) => {
    group.favorite = storedGroupFavorites[group.id] === true;
  });
} catch {
  localStorage.removeItem(groupFavoriteStorageKey);
}

let weekDays = getUpcomingWeekDays();
let weekDayByKey = new Map(weekDays.map((day) => [day.key, day]));
function sessionToActivity(session) {
  return {
  ...session,
  day: weekDayByKey.get(session.weekday).day,
  weekday: weekdayLabels[session.weekday],
  isoDay: session.weekday,
  time: `${session.start}–${session.end}`,
  city: "臺中市",
  joined: null,
  price: session.prices,
  note: [session.courtNote, session.playMethod, session.notes].filter(Boolean).join(" · "),
  };
}
const activities = recurringGroups.flatMap((group) => {
  const { sessions, ...groupFields } = group;
  return sessions.map((session, index) => sessionToActivity({
    ...groupFields,
    ...session,
    id: `${group.id}-${session.weekday}-${session.start.replace(":", "")}-${index + 1}`,
    groupId: group.id,
  }));
});

function refreshWeekDates() {
  const nextWeekDays = getUpcomingWeekDays();
  if (nextWeekDays.every((day, index) => day.isoDate === weekDays[index].isoDate)) return;
  weekDays = nextWeekDays;
  weekDayByKey = new Map(weekDays.map((day) => [day.key, day]));
  activities.forEach((activity) => {
    activity.day = weekDayByKey.get(activity.isoDay).day;
  });
}

const views = document.querySelectorAll(".view");
const navItems = document.querySelectorAll(".nav__item");
const template = document.querySelector("#activity-template");
const grid = document.querySelector("#activity-grid");
const count = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#activity-search");
const districtActivityFilter = document.querySelector("#activity-district-filter");
const weekdayFilter = document.querySelector("#weekday-filter");
const levelFilter = document.querySelector("#level-filter");
const toast = document.querySelector("#toast");
const venueGrid = document.querySelector("#venue-grid");
const venueSearch = document.querySelector("#venue-search");
const districtFilter = document.querySelector("#district-filter");
const venueStatusFilter = document.querySelector("#venue-status-filter");
const venueCount = document.querySelector("#venue-count");
const venueEmpty = document.querySelector("#venue-empty");
const weekDistrictFilter = document.querySelector("#week-district-filter");
const weekVenueOptions = document.querySelector("#week-venue-options");
const weekGroupOptions = document.querySelector("#week-group-options");
const weekVenueFilterSummary = document.querySelector("#week-venue-filter-summary");
const weekGroupFilterSummary = document.querySelector("#week-group-filter-summary");
const weekVenueStatusFilter = document.querySelector("#week-venue-status-filter");
const weekGroupStatusFilter = document.querySelector("#week-group-status-filter");
const weekFavoritesOnly = document.querySelector("#week-favorites-only");
const weekColorMode = document.querySelector("#week-color-mode");
const groupSearch = document.querySelector("#group-search");
const groupWeekdayFilter = document.querySelector("#group-weekday-filter");
const groupDistrictFilter = document.querySelector("#group-district-filter");
const groupStatusFilter = document.querySelector("#group-status-filter");
const groupSort = document.querySelector("#group-sort");
const groupGrid = document.querySelector("#group-grid");
const groupCount = document.querySelector("#group-count");
const sessionCount = document.querySelector("#session-count");
const groupEmpty = document.querySelector("#group-empty");
const activityDialog = document.querySelector("#activity-dialog");
const activityDialogTitle = document.querySelector("#activity-dialog-title");
const activityDialogWeekday = document.querySelector("#activity-dialog-weekday");
const activityDialogSummary = document.querySelector("#activity-dialog-summary");
const activityDialogDetails = document.querySelector("#activity-dialog-details");
const groupEditorDialog = document.querySelector("#group-editor-dialog");
const groupForm = document.querySelector("#group-form");
const groupPriceEditor = document.querySelector("#group-price-editor");
const venueEditorDialog = document.querySelector("#venue-editor-dialog");
const venueEditorForm = document.querySelector("#venue-editor-form");
const currentProfile = document.querySelector("#current-profile");
const appVersion = document.querySelector("#app-version");
const authDialog = document.querySelector("#auth-dialog");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const authAccount = document.querySelector("#auth-account");
let currentUser = createGuestUser();
let editingGroupId = null;
let editingVenueId = null;

function renderCurrentUser() {
  const isAdmin = currentUser.role === "admin";
  document.querySelector("#current-user-avatar").textContent = isAdmin ? "管" : "訪";
  document.querySelector("#current-user-name").textContent = currentUser.displayName;
  document.querySelector("#current-user-role").textContent = isAdmin ? currentUser.roleLabel : "點此登入";
  currentProfile.setAttribute("aria-label", isAdmin
    ? `目前登入帳號 ${currentUser.username}，${currentUser.roleLabel}，點選查看帳號或登出`
    : "目前為訪客模式，點選登入系統管理員帳號");
  document.querySelectorAll("[data-admin-only]").forEach((element) => {
    element.hidden = !isAdmin;
  });
  if (!isAdmin && weekFavoritesOnly.checked) {
    weekFavoritesOnly.checked = false;
    refreshWeekMultiFilters();
    renderWeek();
  }
}

function openAuthDialog() {
  const isAdmin = currentUser.role === "admin";
  loginForm.hidden = isAdmin;
  authAccount.hidden = !isAdmin;
  document.querySelector("#auth-dialog-title").textContent = isAdmin ? "帳號資訊" : "系統管理員登入";
  loginError.hidden = true;
  if (!isAdmin) loginForm.reset();
  authDialog.showModal();
}

function requireAdmin() {
  if (currentUser.role === "admin") return true;
  openView("week");
  openAuthDialog();
  return false;
}

async function refreshSession() {
  try {
    const response = await fetch("/api/session", { headers: { Accept: "application/json" } });
    const result = await response.json();
    currentUser = result.authenticated ? createSessionUser(result.user) : createGuestUser();
  } catch {
    currentUser = createGuestUser();
  }
  renderCurrentUser();
}

async function refreshVersionInfo() {
  try {
    const response = await fetch("/api/health", { headers: { Accept: "application/json" } });
    const result = await response.json();
    if (response.ok && result.version) appVersion.textContent = `V${result.version}`;
  } catch {
    // 保留 HTML 中的版本備援資訊。
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  })[character]);
}

function getActivityAvailability(activity) {
  const venue = venues.find((item) => item.name === activity.venue);
  if (activity.status === "disabled") return { status: "disabled", reason: "活動停用" };
  if (venue?.status === "disabled") return { status: "disabled", reason: "球館停用" };
  return { status: "active", reason: "" };
}

function spotsState(activity) {
  const availability = getActivityAvailability(activity);
  if (availability.status === "disabled") return { text: availability.reason, className: "spots--full" };
  if (activity.joined == null) {
    return activity.capacity
      ? { text: `上限 ${activity.capacity} 人`, className: "spots--unknown" }
      : { text: "名額請洽團主", className: "spots--unknown" };
  }
  const available = activity.capacity - activity.joined;
  if (available <= 0) return { text: "已額滿", className: "spots--full" };
  if (available <= 3) return { text: `剩 ${available} 位`, className: "spots--tight" };
  return { text: `尚有 ${available} 位`, className: "spots--open" };
}

function matchesLevel(level, selected) {
  return selected === "all" || level === selected;
}

function getActivityEntity(activity) {
  if (weekColorMode.value === "venue") {
    const venue = venues.find((item) => item.name === activity.venue);
    return { key: venue?.id || activity.venue, label: activity.venue, color: normalizeColor(venue?.color, "#64748b") };
  }
  const group = recurringGroups.find((item) => item.id === activity.groupId);
  return { key: group?.id || activity.groupId, label: activity.name, color: normalizeColor(group?.color, "#64748b") };
}

function saveGroupSettings() {
  const colors = Object.fromEntries(recurringGroups.map((group) => [group.id, group.color]));
  const favorites = Object.fromEntries(recurringGroups.map((group) => [group.id, group.favorite === true]));
  localStorage.setItem(groupColorStorageKey, JSON.stringify(colors));
  localStorage.setItem(groupFavoriteStorageKey, JSON.stringify(favorites));
  localStorage.setItem(groupStorageKey, JSON.stringify(recurringGroups));
}

function selectedMultiValues(container) {
  return new Set([...container.querySelectorAll("input:checked")].map((input) => input.value));
}

function updateMultiFilterSummary(container, summary, allLabel, unit) {
  const checked = [...container.querySelectorAll("input:checked")];
  summary.textContent = checked.length === 0
    ? allLabel
    : checked.length === 1
      ? checked[0].dataset.label
      : `已選 ${checked.length} ${unit}`;
}

function replaceMultiOptions(container, items, kind) {
  const selected = selectedMultiValues(container);
  container.innerHTML = items.map((item) => `<label><input type="checkbox" value="${escapeHtml(item.value)}" data-label="${escapeHtml(item.label)}"${selected.has(item.value) ? " checked" : ""}><span>${escapeHtml(item.label)}</span></label>`).join("");
  if (kind === "venue") updateMultiFilterSummary(container, weekVenueFilterSummary, "全部球館", "間");
  else updateMultiFilterSummary(container, weekGroupFilterSummary, "全部球隊", "隊");
}

function refreshWeekMultiFilters() {
  const district = weekDistrictFilter.value;
  const available = activities.filter((activity) => {
    const group = recurringGroups.find((item) => item.id === activity.groupId);
    const venue = venues.find((item) => item.name === activity.venue);
    return (district === "all" || activity.district === district)
      && matchesWeekEntityFilters({
        group,
        venue,
        groupStatus: weekGroupStatusFilter.value,
        venueStatus: weekVenueStatusFilter.value,
        favoritesOnly: weekFavoritesOnly.checked,
        isAdmin: currentUser.role === "admin",
      });
  });
  const venueItems = [...new Set(available.map((activity) => activity.venue))]
    .sort((a, b) => a.localeCompare(b, "zh-Hant"))
    .map((venue) => ({ value: venue, label: venue }));
  const groupItems = [...new Map(available.map((activity) => [activity.groupId, activity.name])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-Hant"));
  replaceMultiOptions(weekVenueOptions, venueItems, "venue");
  replaceMultiOptions(weekGroupOptions, groupItems, "group");
}

function renderActivities() {
  refreshWeekDates();
  const query = searchInput.value.trim().toLowerCase();
  const visible = activities.filter((activity) => {
    const haystack = `${activity.name} ${activity.venue} ${activity.district} ${activity.contact} ${activity.ball}`.toLowerCase();
    return (!query || haystack.includes(query))
      && (districtActivityFilter.value === "all" || activity.district === districtActivityFilter.value)
      && (weekdayFilter.value === "all" || activity.isoDay === Number(weekdayFilter.value))
      && matchesLevel(activity.level, levelFilter.value);
  });

  grid.replaceChildren();
  visible.forEach((activity) => {
    const availability = getActivityAvailability(activity);
    const card = template.content.cloneNode(true);
    card.querySelector(".activity-day").textContent = activity.day;
    card.querySelector(".activity-weekday").textContent = `週${activity.weekday}`;
    card.querySelector(".activity-name").textContent = activity.name;
    card.querySelector(".activity-venue").textContent = `${activity.venue} · ${activity.district}`;
    card.querySelector(".activity-time").textContent = `◷ ${activity.time}`;
    card.querySelector(".activity-courts").textContent = activity.courts ? `▦ ${activity.courts} 面場` : "▦ 場地數請洽團主";
    card.querySelector(".activity-ball").textContent = `◉ ${activity.ball}`;
    card.querySelector(".activity-note").textContent = activity.note;
    card.querySelector(".activity-contact").textContent = `聯絡人 ${activity.contact}`;
    card.querySelector(".tag-row").innerHTML = `<span class="tag tag--mint">每週${activity.weekday}</span><span class="tag">${escapeHtml(activity.level)}</span>${availability.status === "disabled" ? `<span class="state state--disabled">${escapeHtml(availability.reason)}</span>` : ""}`;
    const state = spotsState(activity);
    const spots = card.querySelector(".spots");
    spots.textContent = state.text;
    spots.classList.add(state.className);
    card.querySelector(".price-row").innerHTML = activity.price.map((price) => `<span>${escapeHtml(price)}</span>`).join("");
    const viewButton = card.querySelector(".join-button");
    viewButton.textContent = availability.status === "disabled" ? "已停用" : "查看活動";
    viewButton.disabled = availability.status === "disabled";
    viewButton.addEventListener("click", () => openActivityDialog(activity.id));
    grid.append(card);
  });
  count.textContent = visible.length;
  emptyState.hidden = visible.length > 0;
}

function renderWeek() {
  refreshWeekDates();
  const district = weekDistrictFilter.value;
  const selectedVenues = selectedMultiValues(weekVenueOptions);
  const selectedGroups = selectedMultiValues(weekGroupOptions);
  const visible = activities.filter((activity) => {
    const group = recurringGroups.find((item) => item.id === activity.groupId);
    const venue = venues.find((item) => item.name === activity.venue);
    return (district === "all" || activity.district === district)
      && (selectedVenues.size === 0 || selectedVenues.has(activity.venue))
      && (selectedGroups.size === 0 || selectedGroups.has(activity.groupId))
      && matchesWeekEntityFilters({
        group,
        venue,
        groupStatus: weekGroupStatusFilter.value,
        venueStatus: weekVenueStatusFilter.value,
        favoritesOnly: weekFavoritesOnly.checked,
        isAdmin: currentUser.role === "admin",
      });
  });
  const startTimes = [...new Set(visible.map((activity) => activity.start))].sort();
  const dayCounts = new Map(weekDays.map((day) => [day.key, visible.filter((activity) => activity.isoDay === day.key).length]));
  const header = `<div class="week-calendar__header"><div class="week-calendar__corner">時間</div>${weekDays.map((day) => `<div><span>週${day.label}</span><b>${day.date}</b><i>${dayCounts.get(day.key)} 場</i></div>`).join("")}</div>`;
  const rows = startTimes.map((startTime) => {
    const cells = weekDays.map((day) => {
      const items = visible.filter((activity) => activity.isoDay === day.key && activity.start === startTime);
      const cards = items.map((item) => {
        const availability = getActivityAvailability(item);
        const entity = weekColorMode.value === "none" ? null : getActivityEntity(item);
        const entityClass = availability.status === "disabled" || !entity ? "" : ` ${colorClass(weekColorMode.value, entity.key, entity.color)}`;
        return `<button class="week-slot-event${availability.status === "disabled" ? " week-slot-event--disabled" : ""}${entityClass}" type="button" data-activity-id="${escapeHtml(item.id)}" aria-label="查看 ${escapeHtml(item.name)} 完整內容"><time>${escapeHtml(item.start)}–${escapeHtml(item.end)}</time><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.venue)}</span><em>${escapeHtml(availability.reason || item.price[0] || "洽團主")}</em></button>`;
      }).join("");
      return `<div class="week-time-cell">${cards}</div>`;
    }).join("");
    return `<div class="week-time-row"><time class="week-time-label">${startTime}</time>${cells}</div>`;
  }).join("");
  document.querySelector("#week-board").innerHTML = visible.length
    ? `<div class="week-calendar">${header}${rows}</div>`
    : `<div class="no-event week-no-event">目前沒有符合條件的固定活動</div>`;
  document.querySelectorAll(".week-slot-event").forEach((button) => button.addEventListener("click", () => openActivityDialog(button.dataset.activityId)));
}

function openActivityDialog(activityId) {
  const activity = activities.find((item) => item.id === activityId);
  if (!activity) return;
  const state = spotsState(activity);
  const facilities = activity.facilities?.length ? activity.facilities.join("、") : "未提供";
  const details = [
    ["球館", `${activity.venue} · ${activity.district}`],
    ["時間", `每週${activity.weekday} ${activity.time}`],
    ["場地", activity.courts ? `${activity.courts} 面${activity.courtNote ? `；${activity.courtNote}` : ""}` : (activity.courtNote || "未提供")],
    ["程度", activity.level],
    ["收費", activity.price.join("／")],
    ["用球", activity.ball],
    ["上場方式", activity.playMethod || "未提供"],
    ["場館設施", facilities],
    ["人數", state.text],
    ["聯絡人", activity.contact],
    ["取消規則", activity.cancellation || "未提供"],
    ["備註", activity.notes || "無"],
  ];
  activityDialogWeekday.textContent = `每週${activity.weekday}`;
  activityDialogTitle.textContent = activity.name;
  activityDialogSummary.innerHTML = `<b>${escapeHtml(activity.time)}</b><span>${escapeHtml(activity.venue)}</span>`;
  activityDialogDetails.innerHTML = details.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  activityDialog.showModal();
}

function renderGroups() {
  const query = groupSearch.value.trim().toLowerCase();
  const weekday = groupWeekdayFilter.value;
  const district = groupDistrictFilter.value;
  const status = groupStatusFilter.value;
  const weekdayValue = weekday === "all" ? null : Number(weekday);
  const matchesSession = (session) => (weekdayValue == null || session.weekday === weekdayValue)
    && (district === "all" || session.district === district);
  const filtered = recurringGroups.filter((group) => {
    const haystack = `${group.name} ${group.contact} ${group.ball} ${group.sessions.map((session) => `${session.venue} ${session.district}`).join(" ")}`.toLowerCase();
    return (!query || haystack.includes(query))
      && group.sessions.some(matchesSession)
      && (status === "all" || group.status === status);
  });

  const weekdayOrder = (value) => value === 0 ? 7 : value;
  filtered.sort((a, b) => {
    if (groupSort.value === "name") return a.name.localeCompare(b.name, "zh-Hant");
    if (groupSort.value === "venue") return a.sessions[0].venue.localeCompare(b.sessions[0].venue, "zh-Hant") || a.name.localeCompare(b.name, "zh-Hant");
    if (groupSort.value === "updated") return Number(Boolean(b.sourceUrl)) - Number(Boolean(a.sourceUrl)) || a.name.localeCompare(b.name, "zh-Hant");
    const firstA = [...a.sessions].sort((x, y) => weekdayOrder(x.weekday) - weekdayOrder(y.weekday) || x.start.localeCompare(y.start))[0];
    const firstB = [...b.sessions].sort((x, y) => weekdayOrder(x.weekday) - weekdayOrder(y.weekday) || x.start.localeCompare(y.start))[0];
    return weekdayOrder(firstA.weekday) - weekdayOrder(firstB.weekday) || firstA.start.localeCompare(firstB.start) || a.name.localeCompare(b.name, "zh-Hant");
  });

  groupGrid.innerHTML = filtered.map((group) => {
    const visibleSessions = group.sessions.filter(matchesSession);
    const sessions = visibleSessions.map((session) => `
      <li>
        <div><b>週${weekdayLabels[session.weekday]} ${session.start}–${session.end}</b><span>${escapeHtml(session.venue)} · ${escapeHtml(session.district)}</span></div>
        <div><span>${escapeHtml(session.level)}</span><strong>${escapeHtml(session.prices.join("／"))}</strong></div>
      </li>`).join("");
    const statusLabels = { active: "正常", disabled: "停用" };
    const source = group.sourceUrl ? `<a href="${escapeHtml(group.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(group.source)} ↗</a>` : `<span>${escapeHtml(group.source)}</span>`;
    return `<article class="group-record group-record--${escapeHtml(group.status)} ${colorClass("group", group.id, group.color)}">
      <header><div><span class="state state--${escapeHtml(group.status)}">${statusLabels[group.status]}</span>${group.favorite ? '<span class="favorite-badge">★ 我的最愛</span>' : ""}<span class="group-record__id">${escapeHtml(group.id)}</span></div><span>${group.sessions.length} 個固定場次</span></header>
      <h2><i class="entity-color-dot"></i>${escapeHtml(group.name)}</h2>
      <p>聯絡人 ${escapeHtml(group.contact)} · 用球 ${escapeHtml(group.ball)}</p>
      <ul>${sessions}</ul>
      <footer><span class="group-source">${source}</span><button type="button" data-group-id="${escapeHtml(group.id)}">修改</button></footer>
    </article>`;
  }).join("");

  groupCount.textContent = filtered.length;
  sessionCount.textContent = filtered.reduce((total, group) => total + group.sessions.filter(matchesSession).length, 0);
  groupEmpty.hidden = filtered.length > 0;
  groupGrid.querySelectorAll("[data-group-id]").forEach((button) => button.addEventListener("click", () => openGroupEditor(button.dataset.groupId)));
}

function addGroupPriceRow(value = "") {
  const row = document.createElement("div");
  row.className = "price-editor__row";
  row.innerHTML = `<label><span>收費內容</span><input data-group-price value="${escapeHtml(value)}" placeholder="例如：男性 2 小時 $230" required></label><button type="button" aria-label="刪除此收費項目">刪除</button>`;
  row.querySelector("button").addEventListener("click", () => {
    if (groupPriceEditor.children.length === 1) row.querySelector("input").value = "";
    else row.remove();
  });
  groupPriceEditor.append(row);
}

function renderGroupPrices(prices = []) {
  groupPriceEditor.replaceChildren();
  (prices.length ? prices : [""]).forEach(addGroupPriceRow);
}

function readGroupPrices() {
  return [...groupPriceEditor.querySelectorAll("[data-group-price]")]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function openGroupEditor(groupId = null) {
  if (!requireAdmin()) return;
  editingGroupId = groupId;
  const group = recurringGroups.find((item) => item.id === groupId);
  const session = group?.sessions[0];
  document.querySelector("#group-editor-mode").textContent = group ? "修改" : "新增";
  document.querySelector("#group-editor-title").textContent = group ? `修改｜${group.name}` : "新增固定團";
  document.querySelector("#group-name-input").value = group?.name || "";
  document.querySelector("#group-contact-input").value = group?.contact || "";
  document.querySelector("#group-status-input").value = group?.status || "active";
  document.querySelector("#group-favorite-input").checked = group?.favorite === true;
  document.querySelector("#group-color-input").value = normalizeColor(group?.color, colorAt(recurringGroups.length));
  document.querySelector("#group-line-input").value = "";
  document.querySelector("#group-session-weekday").value = String(session?.weekday ?? 1);
  document.querySelector("#group-session-start").value = session?.start || "19:00";
  document.querySelector("#group-session-end").value = session?.end || "21:00";
  document.querySelector("#group-session-courts").value = session?.courts || "";
  document.querySelector("#group-session-court-note").value = session?.courtNote || "";
  document.querySelector("#group-session-capacity").value = session?.capacity || "";
  document.querySelector("#group-session-level").value = session?.level || "";
  document.querySelector("#group-ball-input").value = group?.ball === "未提供" ? "" : (group?.ball || "");
  renderGroupPrices(session?.prices || []);

  const sessionVenue = document.querySelector("#session-venue");
  sessionVenue.querySelectorAll("option[data-temporary]").forEach((option) => option.remove());
  if (session) {
    const venue = venues.find((item) => item.name === session.venue);
    const hasSelectableVenue = venue && [...sessionVenue.options].some((option) => option.value === venue.id);
    if (hasSelectableVenue) sessionVenue.value = venue.id;
    else {
      const option = document.createElement("option");
      option.value = venue?.id || `source:${session.venue}`;
      option.dataset.temporary = "true";
      option.dataset.district = session.district;
      option.textContent = `${session.district} · ${session.venue}`;
      sessionVenue.prepend(option);
      sessionVenue.value = option.value;
    }
  }
  groupEditorDialog.showModal();
}

function saveGroup(event) {
  event.preventDefault();
  if (!requireAdmin()) return;
  const name = document.querySelector("#group-name-input").value.trim();
  if (!name) return;
  const venueSelect = document.querySelector("#session-venue");
  const venueRecord = venues.find((venue) => venue.id === venueSelect.value);
  const selectedOption = venueSelect.selectedOptions[0];
  const venueName = venueRecord?.name || selectedOption.textContent.split(" · ").slice(1).join(" · ");
  const district = venueRecord?.district || selectedOption.dataset.district || "未提供";
  const session = {
    weekday: Number(document.querySelector("#group-session-weekday").value),
    start: document.querySelector("#group-session-start").value,
    end: document.querySelector("#group-session-end").value,
    venue: venueName,
    district,
    courts: Number(document.querySelector("#group-session-courts").value) || null,
    courtNote: document.querySelector("#group-session-court-note").value.trim(),
    capacity: Number(document.querySelector("#group-session-capacity").value) || null,
    level: document.querySelector("#group-session-level").value.trim() || "未提供",
    prices: readGroupPrices(),
  };
  const basic = {
    name,
    contact: document.querySelector("#group-contact-input").value.trim() || "未提供",
    status: document.querySelector("#group-status-input").value,
    favorite: document.querySelector("#group-favorite-input").checked,
    ball: document.querySelector("#group-ball-input").value.trim() || "未提供",
    color: normalizeColor(document.querySelector("#group-color-input").value, colorAt(recurringGroups.length)),
  };

  if (editingGroupId) {
    const group = recurringGroups.find((item) => item.id === editingGroupId);
    Object.assign(group, basic);
    Object.assign(group.sessions[0], session);
    activities.filter((activity) => activity.groupId === group.id).forEach((activity) => Object.assign(activity, {
      name: group.name, contact: group.contact, status: group.status, favorite: group.favorite, ball: group.ball,
    }));
    const firstActivity = activities.find((activity) => activity.groupId === group.id);
    if (firstActivity) Object.assign(firstActivity, sessionToActivity({ ...firstActivity, ...group.sessions[0], name: group.name, contact: group.contact, status: group.status, ball: group.ball }));
  } else {
    const id = `grp-manual-${Date.now()}`;
    const group = { id, ...basic, playMethod: "現場安排", facilities: [], cancellation: "", notes: "", source: "手動建立", sourceUrl: "", importedAt: "2026-09-21", sessions: [session] };
    recurringGroups.push(group);
    activities.push(sessionToActivity({ id: `${id}-${session.weekday}-${session.start.replace(":", "")}-1`, groupId: id, ...group, sessions: undefined, ...session }));
  }
  saveGroupSettings();
  groupEditorDialog.close();
  refreshWeekMultiFilters();
  renderGroups();
  renderActivities();
  renderWeek();
  showToast(`${name} 已儲存`);
}

function renderVenues() {
  const query = venueSearch.value.trim().toLowerCase();
  const filtered = venues.filter((venue) => {
    const matchesText = !query || `${venue.name} ${venue.address}`.toLowerCase().includes(query);
    const matchesDistrict = districtFilter.value === "all" || venue.district === districtFilter.value;
    const matchesStatus = venueStatusFilter.value === "all" || venue.status === venueStatusFilter.value;
    return matchesText && matchesDistrict && matchesStatus;
  });

  venueGrid.replaceChildren();
  filtered.forEach((venue) => {
    const article = document.createElement("article");
    article.className = `venue-card venue-card--directory venue-card--${venue.status} ${colorClass("venue", venue.id, venue.color)}`;
    article.tabIndex = 0;
    article.setAttribute("role", "button");
    article.setAttribute("aria-label", `修改球館：${venue.name}`);
    const mapUrl = venue.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address}`)}`;
    const parkingText = venue.parkingSpaces == null ? "停車位數待確認" : `停車位 ${venue.parkingSpaces} 格`;
    article.innerHTML = `
      <div class="venue-card__district"><span>${escapeHtml(venue.city)}</span><strong>${escapeHtml(venue.district)}</strong></div>
      <div class="venue-card__content">
        <div class="venue-card__top"><div class="tag-row"><span class="tag ${venue.type === "公營" ? "tag--blue" : "tag--mint"}">${escapeHtml(venue.type)}</span><span class="state state--${escapeHtml(venue.status)}">${venue.status === "active" ? "啟用" : "停用"}</span>${venue.favorite ? '<span class="favorite-badge">★ 我的最愛</span>' : ""}</div><span class="venue-id">${escapeHtml(venue.id)}</span></div>
        <h2>${escapeHtml(venue.name)}</h2>
        <p>${escapeHtml(venue.address)}</p>
        <div class="venue-meta"><span>▣ ${escapeHtml(parkingText)}</span><a href="${escapeHtml(mapUrl)}" target="_blank" rel="noreferrer">Google 地圖 ↗</a></div>
      </div>`;
    article.addEventListener("click", (event) => {
      if (!event.target.closest("a")) openVenueEditor(venue.id);
    });
    article.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openVenueEditor(venue.id);
      }
    });
    venueGrid.append(article);
  });

  venueCount.textContent = filtered.length;
  venueEmpty.hidden = filtered.length > 0;
}

function openVenueEditor(venueId = null) {
  if (!requireAdmin()) return;
  editingVenueId = venueId;
  const venue = venues.find((item) => item.id === venueId);
  document.querySelector("#venue-editor-mode").textContent = venue ? "修改" : "新增";
  document.querySelector("#venue-editor-title").textContent = venue ? `修改｜${venue.name}` : "新增球館";
  document.querySelector("#venue-name-input").value = venue?.name || "";
  document.querySelector("#venue-city-input").value = venue?.city || "臺中市";
  document.querySelector("#venue-district-input").value = venue?.district || "";
  document.querySelector("#venue-address-input").value = venue?.address || "";
  document.querySelector("#venue-type-input").value = venue?.type || "民營";
  document.querySelector("#venue-status-input").value = venue?.status || "active";
  document.querySelector("#venue-favorite-input").checked = venue?.favorite === true;
  document.querySelector("#venue-color-input").value = normalizeColor(venue?.color, colorAt(venues.length + 3));
  document.querySelector("#venue-parking-input").value = venue?.parkingSpaces ?? "";
  document.querySelector("#venue-map-input").value = venue?.mapUrl || "";
  venueEditorDialog.showModal();
}

function replaceOptions(select, firstLabel, values) {
  const currentValue = select.value;
  select.innerHTML = `<option value="all">${firstLabel}</option>`;
  appendOptions(select, values);
  select.value = values.includes(currentValue) ? currentValue : "all";
}

function refreshVenueDependentOptions() {
  const venueDistricts = [...new Set(venues.map((venue) => venue.district))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  replaceOptions(districtFilter, "所有行政區", venueDistricts);
  document.querySelector("#venue-district-list").innerHTML = venueDistricts.map((district) => `<option value="${escapeHtml(district)}"></option>`).join("");

  const visibleActivities = activities;
  const activityDistricts = [...new Set(visibleActivities.map((activity) => activity.district))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  replaceOptions(districtActivityFilter, "所有行政區", activityDistricts);
  replaceOptions(weekDistrictFilter, "全部行政區", activityDistricts);
  replaceOptions(groupDistrictFilter, "全部行政區", activityDistricts);

  refreshWeekMultiFilters();

  const sessionVenue = document.querySelector("#session-venue");
  const selectedVenueId = sessionVenue.value;
  const sortedVenues = venues.filter((venue) => venue.status === "active").sort((a, b) => a.district.localeCompare(b.district, "zh-Hant") || a.name.localeCompare(b.name, "zh-Hant"));
  sessionVenue.innerHTML = sortedVenues.map((venue) => `<option value="${venue.id}">${escapeHtml(venue.district)} · ${escapeHtml(venue.name)}</option>`).join("");
  sessionVenue.value = sortedVenues.some((venue) => venue.id === selectedVenueId) ? selectedVenueId : (sortedVenues[0]?.id || "");
}

function saveVenue(event) {
  event.preventDefault();
  if (!requireAdmin()) return;
  const name = document.querySelector("#venue-name-input").value.trim();
  const city = document.querySelector("#venue-city-input").value.trim();
  const district = document.querySelector("#venue-district-input").value.trim();
  const address = document.querySelector("#venue-address-input").value.trim();
  if (!name || !city || !district || !address) return;

  const venue = venues.find((item) => item.id === editingVenueId);
  const oldName = venue?.name;
  const nextVenue = {
    name,
    city,
    district,
    address,
    type: document.querySelector("#venue-type-input").value,
    status: document.querySelector("#venue-status-input").value,
    favorite: document.querySelector("#venue-favorite-input").checked,
    color: normalizeColor(document.querySelector("#venue-color-input").value, colorAt(venues.length + 3)),
    parkingSpaces: document.querySelector("#venue-parking-input").value === "" ? null : Number(document.querySelector("#venue-parking-input").value),
    mapUrl: document.querySelector("#venue-map-input").value.trim(),
  };

  if (venue) {
    Object.assign(venue, nextVenue);
    recurringGroups.forEach((group) => group.sessions.forEach((session) => {
      if (session.venue === oldName) Object.assign(session, { venue: name, district });
    }));
    activities.forEach((activity) => {
      if (activity.venue === oldName) Object.assign(activity, { venue: name, district });
    });
  } else {
    const nextNumber = Math.max(0, ...venues.map((item) => Number(item.id.replace("tc-", "")) || 0)) + 1;
    venues.push({
      id: `tc-${String(nextNumber).padStart(3, "0")}`,
      status: "active",
      importedAt: new Date().toISOString().slice(0, 10),
      ...nextVenue,
    });
  }

  localStorage.setItem(venueStorageKey, JSON.stringify(venues));

  venueEditorDialog.close();
  refreshVenueDependentOptions();
  renderVenues();
  renderGroups();
  renderActivities();
  renderWeek();
  showToast(`${name} 已儲存`);
}

function appendOptions(select, values) {
  select.insertAdjacentHTML("beforeend", values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join(""));
}

function initializeFilters() {
  refreshVenueDependentOptions();

  const savedColorMode = localStorage.getItem(weekColorModeStorageKey);
  weekColorMode.value = ["group", "venue"].includes(savedColorMode) ? savedColorMode : "none";

  const levels = [...new Set(activities.map((activity) => activity.level))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  appendOptions(levelFilter, levels);

  const defaultVenue = venues.find((venue) => venue.name === "大里翊薪羽球館");
  if (defaultVenue) document.querySelector("#session-venue").value = defaultVenue.id;

  venueSearch.addEventListener("input", renderVenues);
  districtFilter.addEventListener("input", renderVenues);
  venueStatusFilter.addEventListener("input", renderVenues);
  [searchInput, districtActivityFilter, weekdayFilter, levelFilter].forEach((control) => control.addEventListener("input", renderActivities));
  weekDistrictFilter.addEventListener("input", () => {
    refreshWeekMultiFilters();
    renderWeek();
  });
  [weekVenueStatusFilter, weekGroupStatusFilter, weekFavoritesOnly].forEach((control) => control.addEventListener("input", () => {
    refreshWeekMultiFilters();
    renderWeek();
  }));
  [weekVenueOptions, weekGroupOptions].forEach((container) => container.addEventListener("change", () => {
    updateMultiFilterSummary(weekVenueOptions, weekVenueFilterSummary, "全部球館", "間");
    updateMultiFilterSummary(weekGroupOptions, weekGroupFilterSummary, "全部球隊", "隊");
    renderWeek();
  }));
  document.querySelectorAll("[data-clear-multi]").forEach((button) => button.addEventListener("click", () => {
    const container = button.dataset.clearMulti === "venue" ? weekVenueOptions : weekGroupOptions;
    container.querySelectorAll("input:checked").forEach((input) => { input.checked = false; });
    updateMultiFilterSummary(weekVenueOptions, weekVenueFilterSummary, "全部球館", "間");
    updateMultiFilterSummary(weekGroupOptions, weekGroupFilterSummary, "全部球隊", "隊");
    renderWeek();
  }));
  const weekMultiFilters = [...document.querySelectorAll(".multi-filter")];
  weekMultiFilters.forEach((filter) => filter.addEventListener("toggle", () => {
    if (!filter.open) return;
    weekMultiFilters.forEach((otherFilter) => {
      if (otherFilter !== filter) otherFilter.open = false;
    });
  }));
  document.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Element && event.target.closest(".multi-filter")) return;
    weekMultiFilters.forEach((filter) => { filter.open = false; });
  });
  weekColorMode.addEventListener("input", () => {
    localStorage.setItem(weekColorModeStorageKey, weekColorMode.value);
    renderWeek();
  });
  [groupSearch, groupWeekdayFilter, groupDistrictFilter, groupStatusFilter, groupSort].forEach((control) => control.addEventListener("input", renderGroups));
}

function openView(name) {
  const requestedName = [...views].some((view) => view.id === `view-${name}`) ? name : "week";
  const validName = canAccessView(currentUser, requestedName) ? requestedName : "week";
  views.forEach((view) => view.classList.toggle("is-visible", view.id === `view-${validName}`));
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.view === validName));
  history.replaceState(null, "", `#${validName}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

navItems.forEach((item) => item.addEventListener("click", () => openView(item.dataset.view)));
currentProfile.addEventListener("click", openAuthDialog);
document.querySelector("#auth-dialog-close").addEventListener("click", () => authDialog.close());
authDialog.addEventListener("click", (event) => {
  if (event.target === authDialog) authDialog.close();
});
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  const submitButton = loginForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        username: document.querySelector("#login-username").value.trim(),
        password: document.querySelector("#login-password").value,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      loginError.textContent = result.error || "登入失敗";
      loginError.hidden = false;
      return;
    }
    currentUser = createSessionUser(result.user);
    renderCurrentUser();
    authDialog.close();
    openView("activities");
    showToast("系統管理員登入成功");
  } catch {
    loginError.textContent = "目前無法登入，請稍後再試";
    loginError.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
});
document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await fetch("/api/logout", { method: "POST", headers: { Accept: "application/json" } });
  } finally {
    currentUser = createGuestUser();
    renderCurrentUser();
    authDialog.close();
    openView("week");
    showToast("已登出，目前為訪客模式");
  }
});
document.querySelectorAll("[data-demo-toast]").forEach((button) => button.addEventListener("click", () => showToast(button.dataset.demoToast)));
document.querySelector("#activity-dialog-close").addEventListener("click", () => activityDialog.close());
activityDialog.addEventListener("click", (event) => {
  if (event.target === activityDialog) activityDialog.close();
});
document.querySelector("#new-group-button").addEventListener("click", () => openGroupEditor());
document.querySelector("#add-group-price").addEventListener("click", () => addGroupPriceRow());
document.querySelector("#new-venue-button").addEventListener("click", () => openVenueEditor());
document.querySelector("#group-editor-close").addEventListener("click", () => groupEditorDialog.close());
document.querySelector("#group-editor-cancel").addEventListener("click", () => groupEditorDialog.close());
groupEditorDialog.addEventListener("click", (event) => {
  if (event.target === groupEditorDialog) groupEditorDialog.close();
});
groupForm.addEventListener("submit", saveGroup);
document.querySelector("#venue-editor-close").addEventListener("click", () => venueEditorDialog.close());
document.querySelector("#venue-editor-cancel").addEventListener("click", () => venueEditorDialog.close());
venueEditorDialog.addEventListener("click", (event) => {
  if (event.target === venueEditorDialog) venueEditorDialog.close();
});
venueEditorForm.addEventListener("submit", saveVenue);

async function bootstrap() {
  initializeFilters();
  renderActivities();
  renderWeek();
  renderGroups();
  renderVenues();
  await Promise.all([refreshSession(), refreshVersionInfo()]);
  openView(location.hash.slice(1) || "week");
}

bootstrap();
