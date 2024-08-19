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

export const timeToString = (hours, minutes) => hours.toString().padStart(2, '0') + 'h' + minutes.toString().padStart(2, '0');