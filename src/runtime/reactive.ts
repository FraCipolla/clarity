type Effect = () => void;
let currentEffect: Effect | null = null;

export function effect(fn: Effect) {
  currentEffect = fn;
  fn();
  currentEffect = null;
}

export const IS_REACTIVE = Symbol("isReactive");
export type Reactive<T> = {
  value: T;
  [IS_REACTIVE]: true;
  _isComputed?: true;
  [key: string]: any

};

export function unwrap<T>(value: T): any {
  if (isReactive(value)) return unwrap(value.value);
  if (Array.isArray(value)) return value.map(unwrap);
  if (typeof value === "object" && value !== null) {
    const obj: any = {};
    for (const key in value) obj[key] = unwrap((value as any)[key]);
    return obj;
  }
  return value;
}

export type DeepReactive<T> = T extends object
  ? {
      [K in keyof T]: DeepReactive<T[K]> & Reactive<T[K]>;
    } & {
      value: T;
      [IS_REACTIVE]: true;
    }
  : Reactive<T>;

export function isReactive(obj: any): obj is Reactive<any> {
  return !!obj && obj[IS_REACTIVE] === true;
}

function makeReactiveObject(obj: Record<string, any>): DeepReactive<any> {
  const listeners = new Set<Effect>();
  const notify = () => listeners.forEach(fn => fn());

  const result: any = {};

  for (let [key, value] of Object.entries(obj)) {
    if (isReactive(value)) {
      result[key] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = reactive(value)
    } else if (Array.isArray(value)) {
      result[key] = reactive(value);
    } else {
      result[key] = reactive(value);
    }
  }

  return result;
}

function makeReactiveArray<T>(arr: T[]): Reactive<T[]> {
  const listeners = new Set<Effect>();
  const notify = () => listeners.forEach(fn => fn());

  // Only wrap objects that are not already reactive
  const wrapElement = (obj: any) => {
    for (let [k, v] of Object.entries(obj)) {
      if (isReactive(v)) obj[k] = unwrap(v);
    }
    if (Array.isArray(obj)) return isReactive(obj) ? obj : makeReactiveArray(obj).value;
    if (typeof obj === "object" && obj !== null) return isReactive(obj) ? obj : reactive(obj);
    return obj;
  };

  const reactiveElements = arr.map(wrapElement);

  const proxy = new Proxy(reactiveElements, {
    get(target, prop, receiver) {
      if (currentEffect) listeners.add(currentEffect);
      const value = Reflect.get(target, prop, receiver);

      // Mutating array methods
      if (["push", "unshift", "splice"].includes(prop as string)) {
        return (...args: any[]) => {
          const wrappedArgs = args.map(wrapElement);
          const res = (value as Function).apply(target, wrappedArgs);
          notify();
          return res;
        };
      }

      if (["pop", "shift", "sort", "reverse"].includes(prop as string)) {
        return (...args: any[]) => {
          const res = (value as Function).apply(target, args);
          notify();
          return res;
        };
      }

      return value;
    },

    set(target, prop, value, receiver) {
      const wrappedValue = wrapElement(value);
      const res = Reflect.set(target, prop, wrappedValue, receiver);
      notify();
      return res;
    }
  });

  return { value: proxy, [IS_REACTIVE]: true } as Reactive<T[]>;
}

export function reactive<T>(initial: T): DeepReactive<T>  {
  if (isReactive(initial)) return initial as DeepReactive<T>;
  
  const listeners = new Set<Effect>();
  const notify = () => listeners.forEach(fn => fn());
  let inner: any;

  if (Array.isArray(initial)) {
    return makeReactiveArray(initial) as any;
  } else if (typeof initial === "object" && initial !== null) {
    inner = makeReactiveObject(initial);
  } else {
    inner = initial;
  }

  function makeProxy(obj: any): any {
    return new Proxy(obj, {
      get(target, prop, recv) {
        if (currentEffect) listeners.add(currentEffect);
        
        return Reflect.get(target, prop, recv);
      },
      set(target, prop, val, recv) {
        const res = Reflect.set(target, prop, val, recv);
        notify();
        return res;
      }
    });
  }

  const wrapper: Reactive<T> = {
    value: inner,
    [IS_REACTIVE]: true
  };

  return new Proxy(wrapper as any, {
    get(obj, prop, recv) {
      if (currentEffect) listeners.add(currentEffect);
      
      if (prop === Symbol.toPrimitive) {
        return () => obj.value; 
      }
      if (
        typeof prop === "string" &&
        obj.value &&
        Object.prototype.hasOwnProperty.call(obj.value, prop)
      ) {
        return obj.value[prop];
      }

      return Reflect.get(obj, prop, recv);
    },

    set(obj, prop, val, recv) {
      if (typeof val === "object" && val !== null && !isReactive(val)) {
        val = makeProxy(val);
      }    
      if (prop === "value") obj.value = val;
      else if (obj.value && typeof obj.value === "object") obj.value[prop] = val;
      else return Reflect.set(obj, prop, val, recv);
    
      notify();
      return true;
    }
  });
}

export function computed<T>(fn: () => T): Reactive<T> {
  const r = reactive(fn());
  
  effect(() => {
    r.value = fn();
  });
  (r as any)._isComputed = true
  return r;
}

export function reactiveComponent(render: () => HTMLElement): HTMLElement {
  let el: HTMLElement;

  effect(() => {
    const newEl = render();

    if (!el) {
      // First mount
      el = newEl;
    } else {
      // Replace on updates
      el.replaceWith(newEl);
      el = newEl;
    }
  });

  return el!;
}