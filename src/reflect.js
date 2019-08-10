import { stringify, objectify, stringifyPreface, typedValue } from './utils';

export default function reflect(descriptors) {
  const { get, set, connect, observe, value, key } = descriptors;

  function reflectedObserve(host, value, lastValue) {
    // let stringValue;
    console.log(key)

    if (value !== lastValue) {
      if (value === undefined || value === null || value === false) {
        host.removeAttribute(key);
      } else if (typeof value === 'object') {
        host.setAttribute(key, stringify(value));
      } else if (value === true) {
        host.setAttribute(key, '');
      } else {
        host.setAttribute(key, value);
      }
    }
    // if (typedValue(value).type !== typedValue(lastValue).type) {
    //   debugger;
    // }
    // let { transform } = typeof value === 'object' ? typedValue(value) : typedValue(lastValue);

    

    // const regex = new RegExp('^' + stringifyPreface + '(.+)');
    // if (typeof value === 'object') {
    //   stringValue = stringify(value);
    // } else {
    //   const binaryMatch = value.match(regex);
    //   if (binaryMatch) {
    //     value = objectify(binaryMatch[1]);
    //   }
    // }
    // value = transform(value);
    // if (value === undefined || value === null || value === false) {
    //   host.removeAttribute(key);
    // } else {
    //   // const lastStringValue = typeof lastValue === 'object' ? stringify(lastValue) : lastValue;
    //   host.setAttribute(key, stringValue || value);
    //   host[key] = value;
    // }

    return observe(host, value, lastValue);
  };

  function reflectedConnect(host, key, invalidate) {
    // let value = host.getAttribute(key);
    // const regex = new RegExp('^' + stringifyPreface + '(.+)');
    // const binaryMatch = value.match(regex);
    // if (binaryMatch) {
    //   host[key] = objectify(binaryMatch[1]);
    // }
    // // if ()
    // host[`_${key}`] = value;
    if (connect) {
      return connect(host, key, invalidate);
    }
  };
  
  // const defaultDescriptors = property(descriptors);
  // const newDescriptiors = {
  //   get: get || defaultDescriptors.get,
  //   set: set || defaultDescriptors.set,
  //   connect,
  //   observe: reflectedObserve,
  //   reflect: true
  // };

  function reflectedSet(host, val, oldValue) {
    if (typeof val === 'string') {
      const regex = new RegExp('^' + stringifyPreface + '(.+)');
      const binaryMatch = val.match(regex);
      if (binaryMatch) {
        val = objectify(binaryMatch[1]);
      }  
    }
    const { transform } = typedValue(val);
    if (set) set(host, val, oldValue);
    return transform(val, oldValue);
  }

  const newDescriptiors = {
    get: get || function defaultGet(host, val = value) { return val },
    set: reflectedSet,
    connect: reflectedConnect,
    observe: reflectedObserve,
    reflect: true
  };
  return newDescriptiors;
}