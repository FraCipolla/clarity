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

export function isReactive(obj: any): obj is Reactive<any> {
  return !!obj && obj[IS_REACTIVE] === true;
}

function isDomNode(value: any) {
  return value instanceof Node;
}

export function reactive<T>(initial: T): Reactive<T> {
  const listeners = new Set<Effect>();
  const notify = () => listeners.forEach(fn => fn());

  let inner = initial;

  // If inner value is an object → proxy it
  if (typeof initial === "object" && initial !== null && !isDomNode(initial)) {
    inner = new Proxy(initial as any, {
      get(obj, prop, receiver) {
        const value = Reflect.get(obj, prop, receiver);

        if (currentEffect) listeners.add(currentEffect);
        return value;
      },

      set(obj, prop, value) {
        const result = Reflect.set(obj, prop, value);
        notify();
        return result;
      }
    });
  }

  const wrapper: Reactive<T> = {
    value: inner as T,
    [IS_REACTIVE]: true
  };

  return new Proxy(wrapper, {
    get(obj, prop, receiver) {
      if (prop === IS_REACTIVE) return true;

      if (prop === "value") {
        if (currentEffect) listeners.add(currentEffect);
        return Reflect.get(obj, prop, receiver);
      }

      return Reflect.get(obj, prop, receiver);
    },

    set(obj, prop, value) {
      if (prop === "value") {
        if (typeof value === "object" && value !== null && !isDomNode(value)) {
          obj.value = new Proxy(value as any, {
            get(target, key, recv) {
              if (currentEffect) listeners.add(currentEffect);
              return Reflect.get(target, key, recv);
            },
            set(target, key, val) {
              const ok = Reflect.set(target, key, val);
              notify();
              return ok;
            }
          });
        } else {
          obj.value = value;
        }

        notify();
        return true;
      }

      return Reflect.set(obj, prop, value);
    }
  });
}

export function computed<T>(fn: () => T): Reactive<T> {
  const r = reactive<T>(fn());

  effect(() => {
    r.value = fn();
  });

  return r;
}

export class ReactiveMap<K, V> {
  private map = new Map<K, { value: V }>(); // store reactive values internally
  private deps = new Map<K, Set<Effect>>();

  constructor(entries?: readonly (readonly [K, V])[]) {
    if (entries) {
      for (const [k, v] of entries) {
        this.map.set(k, reactive(v));
      }
    }
  }

  private track(key: K) {
    if (currentEffect) {
      let set = this.deps.get(key);
      if (!set) {
        set = new Set();
        this.deps.set(key, set);
      }
      set.add(currentEffect);
    }
  }

  private trigger(key: K) {
    const set = this.deps.get(key);
    set?.forEach(fn => fn());
  }

  get(key: K): { value: V } | undefined {
    const entry = this.map.get(key);
    if (entry) this.track(key);
    return entry;
  }

  set(key: K, value: V) {
    let reactiveValue = isReactive(value) ? value : reactive(value);
    this.map.set(key, reactiveValue);
    this.trigger(key);
    return this;
  }

  has(key: K) {
    return this.map.has(key);
  }

  delete(key: K) {
    const result = this.map.delete(key);
    this.trigger(key as K);
    return result;
  }

  clear() {
    this.map.clear();
    this.deps.forEach(set => set.forEach(fn => fn()));
  }
}

export function reactiveComponent(render: () => HTMLElement): HTMLElement {
  let el = null;

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