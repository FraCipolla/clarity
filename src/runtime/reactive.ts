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
};

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

function makeReactiveObject(obj: Record<string, any>): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = reactive(value);
  }
  return result;
}

function makeReactiveArray<T>(arr: T[]): Reactive<T[]> {
  const listeners = new Set<Effect>();
  const notify = () => listeners.forEach(fn => fn());

  const reactiveElements = arr.map(v => (typeof v === "object" ? reactive(v) : v));

  const proxy = new Proxy(reactiveElements, {
    get(target, prop, receiver) {
      if (currentEffect) listeners.add(currentEffect);

      const value = Reflect.get(target, prop, receiver);

      if (["push","pop","shift","unshift","splice","sort","reverse"].includes(prop as string)) {
        return (...args: any[]) => {
          const wrappedArgs = args.map(a => (typeof a === "object" ? reactive(a) : a));
          const res = (value as Function).apply(target, wrappedArgs);
          notify();
          return res;
        };
      }

      return value;
    },

    set(target, prop, value, receiver) {
      if (typeof value === "object" && value !== null && !isReactive(value)) {
        value = reactive(value);
      }
      const res = Reflect.set(target, prop, value, receiver);
      notify();
      return res;
    }
  });

  return { value: proxy, [IS_REACTIVE]: true } as Reactive<T[]>;
}

export function reactive<T>(initial: T): DeepReactive<T>  {
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
      if (prop === "value") {
        if (currentEffect) listeners.add(currentEffect);
        return obj.value;
      }

      if (
        typeof prop === "string" &&
        obj.value &&
        Object.prototype.hasOwnProperty.call(obj.value, prop)
      ) {
        if (currentEffect) listeners.add(currentEffect);
        return obj.value[prop];
      }

      return Reflect.get(obj, prop, recv);
    },

    set(obj, prop, val, recv) {
      if (prop === "value") {
        obj.value = typeof val === "object" && val !== null ? makeProxy(val) : val;
        notify();
        return true;
      }
      if (
        typeof prop === "string" &&
        obj.value &&
        Object.prototype.hasOwnProperty.call(obj.value, prop)
      ) {
        if (typeof val === "object" && val !== null && !isReactive(val)) {
          val = makeProxy(val);
        }
        obj.value[prop] = typeof val === "object" && val !== null && !isReactive(val) 
          ? makeProxy(val) 
          : val;
        notify();
        return true;
      }
      return Reflect.set(obj, prop, val, recv);
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