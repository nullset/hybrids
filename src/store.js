import * as cache from './cache';

const adapters = new WeakMap();
const definitions = new WeakMap();
const pointers = new WeakMap();

const _ = (h, v) => v;
const hasOwnProperty = {}.hasOwnProperty;

function define(Model) {
  let definition = definitions.get(Model);

  if (!definition) {
    definition = Object.keys(Model).map((key) => {
      const defaultValue = Model[key];
      let transform;

      switch (typeof defaultValue) {
        case 'function':
          return (target) => {
            Object.defineProperty(target, key, {
              get() { return cache.get(this, key, defaultValue); },
            });
          };
        case 'object': {
          if (defaultValue === null) {
            throw TypeError(`Unsupported property value for "${key}" key: null`);
          }

          return (target, id, value, lastValue) => {
            let nestedId = id;

            if (typeof value[key] === 'string') {
              nestedId = value[key];
            } else {
              if (value[key] && hasOwnProperty.call(value[key], 'id')) {
                nestedId = value[key].id;
              } else if (lastValue && lastValue[key] && hasOwnProperty.call(lastValue[key], 'id')) {
                nestedId = lastValue[key].id;
              }

              // eslint-disable-next-line no-use-before-define
              sync(defaultValue, nestedId, value[key], lastValue && lastValue[key]);
            }

            Object.defineProperty(target, key, {
              // eslint-disable-next-line no-use-before-define
              get: () => get(defaultValue, nestedId),
              enumerable: true,
            });
          };
        }
        // eslint-disable-next-line no-fallthrough
        case 'string': transform = String; break;
        case 'number': transform = Number; break;
        case 'boolean': transform = Boolean; break;
        default: transform = v => v;
      }

      return (target, id, value, lastValue) => {
        const resolvedValue = hasOwnProperty.call(value, key) ? value : lastValue;
        const result = transform((resolvedValue && resolvedValue[key]) || defaultValue);

        Object.defineProperty(target, key, {
          value: result,
          enumerable: true,
        });
      };
    });

    definitions.set(Model, definition);
  }

  return definition;
}

function create(Model, id, value, lastValue) {
  const instance = {};

  define(Model).forEach((fn) => {
    fn(instance, id, value, lastValue);
  });

  pointers.set(instance, { Model, id });
  return Object.freeze(instance);
}

function sync(Model, id, value, lastValue) {
  if (value === lastValue) return lastValue;

  if (value === null) {
    cache.set(Model, id, _, null, true);

    return null;
  }

  if (typeof value === 'object') {
    if (typeof value.then === 'function') {
      Promise.resolve(value).then((resolvedValue) => {
        if (typeof resolvedValue !== 'object') {
          throw TypeError(`The value must be an object instance or null: ${typeof resolvedValue}`);
        }

        if (resolvedValue === null) {
          cache.set(Model, id, _, null);
        } else {
          const instance = create(Model, id, resolvedValue, cache.get(Model, id, _));
          cache.set(Model, id, _, instance);
        }
      });

      return lastValue;
    }

    const instance = create(Model, id, value, lastValue);
    cache.set(Model, id, _, instance, true);

    return instance;
  }

  throw TypeError(`The value must be an object instance: ${typeof value}`);
}

export function get(Model, id) {
  if (typeof Model !== 'object' || Model === null) {
    throw TypeError(`The first argument must be an object: ${typeof Model}`);
  }

  const lastValue = cache.get(Model, id, _);

  const adapter = adapters.get(Model);
  const value = adapter && adapter.get ? adapter.get(id, lastValue) : undefined;

  if (value === undefined) {
    return lastValue;
  }

  return sync(Model, id, value, lastValue);
}

function isShallowEqual(lastValue, value) {
  const keys = Object.keys(lastValue);
  for (let i = 0; i < keys.length; i += 1) {
    // eslint-disable-next-line no-continue
    if (keys[i] === 'id') continue;
    // eslint-disable-next-line no-continue
    if (!hasOwnProperty.call(value, keys[i])) continue;
    if (value[keys[i]] !== lastValue[keys[i]]) return false;
  }
  return true;
}

export function set(ModelOrInstance, value) {
  if (typeof ModelOrInstance !== 'object' || ModelOrInstance === null) {
    throw TypeError(`The first argument must be an object: ${typeof ModelOrInstance}`);
  }
  if (typeof value !== 'object') {
    throw TypeError(`The value must be an object instance or null: ${typeof value}`);
  }

  const pointer = pointers.get(ModelOrInstance);
  let Model = ModelOrInstance;
  let id;

  if (pointer) {
    ({ Model, id } = pointer);
  } else {
    id = value && value.id;
  }

  const lastValue = cache.get(Model, id, _);

  if (value === lastValue) return;
  if (lastValue && value && isShallowEqual(lastValue, value)) return;

  const adapter = adapters.get(Model);
  if (adapter && adapter.set) {
    const nextValue = value && create(Model, id, value, lastValue);
    const result = adapter.set(id, nextValue, lastValue);
    if (result === undefined) {
      cache.set(Model, id, _, nextValue, true);
    } else {
      sync(Model, id, result, lastValue);
    }
  } else {
    sync(Model, id, value, lastValue);
  }
}

function normalizeId(id) {
  if (id !== null) {
    return JSON.stringify(
      Object.keys(id).sort().reduce((acc, key) => {
        if (typeof id[key] === 'object' && id[key] !== null) {
          throw TypeError(`Nested object structures are not supported in complex identifier. You must use primitive value: ${typeof id[key]}`);
        }
        acc[key] = id[key];
        return acc;
      }, {}),
    );
  }
  return id;
}

const listModels = new WeakMap();

export function list(Model, parameters) {
  if (typeof Model !== 'object' || Model === null) {
    throw TypeError(`The first argument must be an object: ${typeof Model}`);
  }
  if ((parameters !== undefined && typeof parameters !== 'object') || parameters === null) {
    throw TypeError('The second argument if defined must be an object instance');
  }

  const id = parameters && normalizeId(parameters);
  const entries = cache.entries.get(Model);
  const adapter = adapters.get(Model);
  const globalList = [];

  let listModel = listModels.get(Model);
  if (!listModel) {
    listModel = {};
    listModels.set(Model, listModel);
  }

  if (entries && (!id || (adapter && adapter.list))) {
    entries.forEach(({ value }) => {
      if (value) globalList.push(value);
    });
  }

  const lastValue = id ? cache.get(listModel, id, _) || globalList : globalList;

  const value = adapter && adapter.list
    ? adapter.list(parameters, lastValue, globalList)
    : undefined;

  if (value === undefined) {
    return lastValue;
  }

  return sync(listModel, id, value, lastValue);
}

export function connect(Model, adapter = {}) {
  if (typeof Model !== 'object' || Model === null) {
    throw TypeError(`The first argument must be an object: ${typeof Model}`);
  }
  if (adapters.has(Model)) {
    throw Error(`Model "${Model}" already connected to the store`);
  }

  adapters.set(Model, { ...adapter });

  return () => adapters.delete(Model);
}
