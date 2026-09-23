export function matchesWeekEntityFilters({
  group,
  venue,
  groupStatus = "all",
  venueStatus = "all",
  favoritesOnly = false,
  isAdmin = false,
}) {
  if (groupStatus !== "all" && group?.status !== groupStatus) return false;
  if (venueStatus !== "all" && venue?.status !== venueStatus) return false;
  if (favoritesOnly && (!isAdmin || (group?.favorite !== true && venue?.favorite !== true))) return false;
  return true;
}
