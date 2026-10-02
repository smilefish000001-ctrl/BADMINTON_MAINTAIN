import { entityNameKey, normalizeEntityName } from "./name-normalization.js";

function sessionKey(session) {
  return [session.weekday, session.start, session.end, entityNameKey(session.venue)].join("|");
}

function normalizeSession(session) {
  return { ...session, venue: normalizeEntityName(session.venue) };
}

function mergeSessions(seedSessions, storedSessions) {
  seedSessions = seedSessions.map(normalizeSession);
  storedSessions = storedSessions.map(normalizeSession);
  const usedStoredIndexes = new Set();
  const merged = seedSessions.map((seedSession, seedIndex) => {
    let storedIndex = storedSessions.findIndex((storedSession, index) => (
      !usedStoredIndexes.has(index) && sessionKey(storedSession) === sessionKey(seedSession)
    ));

    if (storedIndex < 0 && storedSessions[seedIndex] && !usedStoredIndexes.has(seedIndex)) {
      storedIndex = seedIndex;
    }
    if (storedIndex < 0) return seedSession;

    usedStoredIndexes.add(storedIndex);
    return { ...seedSession, ...storedSessions[storedIndex] };
  });

  storedSessions.forEach((storedSession, index) => {
    if (!usedStoredIndexes.has(index)) merged.push(storedSession);
  });
  return merged;
}

export function dedupeGroupsByName(groups) {
  const uniqueGroups = [];
  const groupByName = new Map();

  groups.forEach((group) => {
    group.name = normalizeEntityName(group.name);
    group.sessions = (group.sessions || []).map(normalizeSession);
    const key = entityNameKey(group.name);
    const existing = groupByName.get(key);
    if (!key || !existing) {
      uniqueGroups.push(group);
      if (key) groupByName.set(key, group);
      return;
    }

    const sessionKeys = new Set(existing.sessions.map(sessionKey));
    group.sessions.forEach((session) => {
      const key = sessionKey(session);
      if (!sessionKeys.has(key)) {
        existing.sessions.push(session);
        sessionKeys.add(key);
      }
    });
  });

  groups.splice(0, groups.length, ...uniqueGroups);
  return groups;
}

export function mergeStoredGroups(seedGroups, storedGroups) {
  const storedById = new Map(storedGroups.map((group) => [group.id, group]));

  seedGroups.forEach((seedGroup) => {
    const storedGroup = storedById.get(seedGroup.id);
    if (!storedGroup) return;

    const sessions = mergeSessions(seedGroup.sessions, storedGroup.sessions);
    const seedIsNewer = (seedGroup.importedAt || "") > (storedGroup.importedAt || "");
    if (seedIsNewer) {
      const personalization = {
        status: storedGroup.status,
        favorite: storedGroup.favorite,
        color: storedGroup.color,
      };
      Object.assign(seedGroup, personalization, { sessions });
    } else {
      Object.assign(seedGroup, storedGroup, { sessions });
    }
  });

  storedGroups
    .filter((storedGroup) => !seedGroups.some((seedGroup) => seedGroup.id === storedGroup.id))
    .forEach((storedGroup) => seedGroups.push(storedGroup));

  return dedupeGroupsByName(seedGroups);
}
