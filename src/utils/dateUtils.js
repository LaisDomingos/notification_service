function isValidDate(validity) {
  const today = getToday();
  const endDate = extractEndDate(validity);
  return today <= endDate;
}

function getEndDateFromValidity(validity) {
  return extractEndDate(validity);
}

function isExpiringToday(validity) {
  const endDate = extractEndDate(validity);
  const today = getToday();
  return (
    endDate.getDate() === today.getDate() &&
    endDate.getMonth() === today.getMonth() &&
    endDate.getFullYear() === today.getFullYear()
  );
}

// Helpers
function extractEndDate(validity) {
  const today = getToday();

  // Formato: "dd/mm/yy al dd/mm/yy"
  const rangeMatch = validity.match(/(\d{2}\/\d{2}\/\d{2})\s*(?:al|-)\s*(\d{2}\/\d{2}\/\d{2})/i);
  if (rangeMatch) {
    const [, , endStr] = rangeMatch;
    return parseDate(endStr);
  }

  // Formato: "Hasta el dd de mes de aaaa"
  const fullDateMatch = validity.match(/hasta el (\d{1,2}) de (\w+) de (\d{4})/i);
  if (fullDateMatch) {
    const [, dayStr, monthStr, yearStr] = fullDateMatch;
    const date = parseSpanishDate(dayStr, monthStr, yearStr);
    if (date) return date;
  }

  // Formato: "Hasta el dd de mes"
  const partialDateMatch = validity.match(/hasta el (\d{1,2}) de (\w+)/i);
  if (partialDateMatch) {
    const [, dayStr, monthStr] = partialDateMatch;
    const year = today.getFullYear();
    const date = parseSpanishDate(dayStr, monthStr, year.toString());
    if (date) return date;
  }

  // Formato: "Hasta el dd/mm/yy"
  const altMatch = validity.match(/hasta el (\d{2})\/(\d{2})\/(\d{2})/i);
  if (altMatch) {
    const [, d, m, y] = altMatch.map(Number);
    return new Date(2000 + y, m - 1, d);
  }

  // Se nada funcionar, assume que é válido pra sempre
  return new Date(3000, 0, 1);
}

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(2000 + year, month - 1, day);
}

function parseSpanishDate(dayStr, monthStr, yearStr) {
  const day = Number(dayStr);
  const month = spanishMonthToNumber(monthStr.toLowerCase());
  const year = Number(yearStr);

  if (isNaN(day) || isNaN(month) || isNaN(year) || month === -1) {
    return null;
  }

  return new Date(year, month, day);
}

function spanishMonthToNumber(month) {
  const months = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8, // Variante comum
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };

  return months[month] ?? -1;
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

module.exports = {
  isValidDate,
  getEndDateFromValidity,
  isExpiringToday,
};
