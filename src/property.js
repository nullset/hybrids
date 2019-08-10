import { camelToDash, typedValue } from './utils';

const defaultTransform = v => v;

const objectTransform = (value) => {
  if (typeof value !== 'object') {
    throw TypeError(`Assigned value must be an object: ${typeof value}`);
  }
  return value && Object.freeze(value);
};

export default function property(val, connect) {
  let {type, transform, value} = typedValue(val);

  return {
    get: (host, val = value) => val,
    set: (host, val, oldValue) => transform(val, oldValue),
    connect: type !== 'object' && type !== 'undefined'
      ? (host, key, invalidate) => {
        if (host[key] === value) {
          const attrName = camelToDash(key);

          if (host.hasAttribute(attrName)) {
            const attrValue = host.getAttribute(attrName);
            host[key] = attrValue !== '' ? attrValue : true;
          }
        }

        return connect && connect(host, key, invalidate);
      }
      : connect,
  };
}
