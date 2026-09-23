// utils.js
export function transpose(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    obj[key].forEach((val, i) => {
      acc[i] = acc[i] || {};
      acc[i][key] = val;
    });
    return acc;
  }, []);
}

export const shuffle = arr => arr.reduceRight((r,_,__,s) =>
    (r.push(s.splice(0|Math.random()*s.length,1)[0]), r),[])

export const timeToString = (hours = 0, minutes = 0) =>
  `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;

const unwrapGristValue = (value, markers) =>
  Array.isArray(value) && value.length >= 2 && markers.includes(value[0])
    ? value[1]
    : value;

export const gristRefId = (value) => {
  const rawValue = value && typeof value === 'object' && !Array.isArray(value) && 'rowId' in value
    ? value.rowId
    : Array.isArray(value) && ['R', 'r'].includes(value[0])
      ? value.length >= 3 ? value[2] : value[1]
      : unwrapGristValue(value, ['R', 'r']);
  const id = Number(rawValue);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const gristDateToDate = (value) => {
  const rawValue = unwrapGristValue(value, ['D', 'd']);
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;
  if (rawValue instanceof Date) {
    return Number.isNaN(rawValue.getTime()) ? null : new Date(rawValue.getTime());
  }

  const numericValue = Number(rawValue);
  const date = Number.isFinite(numericValue)
    ? new Date(Math.abs(numericValue) < 1e12 ? numericValue * 1000 : numericValue)
    : new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const dateToGristDateTime = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime())
    ? value.getTime() / 1000
    : null;

export const durationToParts = (minutes) => {
  if (minutes === null || minutes === undefined || minutes === '') return null;

  const totalMinutes = Number(minutes);
  if (!Number.isFinite(totalMinutes)) return null;

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
};

export const durationToMinutes = (duration) => {
  if (!duration) return null;

  const hours = Number(duration.hours);
  const minutes = Number(duration.minutes);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return hours * 60 + minutes;
};
