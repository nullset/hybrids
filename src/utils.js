const camelToDashMap = new Map();
export function camelToDash(str) {
  let result = camelToDashMap.get(str);
  if (result === undefined) {
    result = str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    camelToDashMap.set(str, result);
  }
  return result;
}

export function pascalToDash(str) {
  return camelToDash(str.replace(/((?!([A-Z]{2}|^))[A-Z])/g, '-$1'));
}

export function dispatch(host, eventType, options = {}) {
  return host.dispatchEvent(new CustomEvent(eventType, { bubbles: false, ...options }));
}

export function shadyCSS(fn, fallback) {
  const shady = window.ShadyCSS;

  /* istanbul ignore next */
  if (shady && !shady.nativeShadow) {
    return fn(shady);
  }

  return fallback;
}

export function stringifyElement(element) {
  const tagName = String(element.tagName).toLowerCase();
  return `<${tagName}>`;
}

export const IS_IE = 'ActiveXObject' in window;
export const deferred = Promise.resolve();

export const stringifyPreface = '::OBJECT::';

export function stringify(object) {
  return stringifyPreface + btoa(JSON.stringify(object));
}

export function objectify(string) {
  return JSON.parse(atob(string));
}

const defaultTransform = v => v;

const objectTransform = (value) => {
  if (typeof value !== 'object') {
    throw TypeError(`Assigned value must be an object: ${typeof value}`);
  }
  return value && Object.freeze(value);
};

export function typedValue(value) {
  const type = typeof value;
  let transform = defaultTransform;

  switch (type) {
    case 'string':
      transform = String;
      break;
    case 'number':
      transform = Number;
      break;
    case 'boolean':
      transform = Boolean;
      break;
    case 'function':
      transform = value;
      value = transform();
      break;
    case 'object':
      if (value) Object.freeze(value);
      transform = objectTransform;
      break;
    default: break;
  }
  return {
    type: type,
    value: value,
    transform: transform,
  }
}