// ----------------------------------------
// EFFECT SYSTEM
// ----------------------------------------
type Effect = () => void;
let currentEffect: Effect | null = null;

export function effect(fn: Effect) {
  currentEffect = fn;
  fn();
  currentEffect = null;
}

// ----------------------------------------
// MARKER
// ----------------------------------------
export const IS_REACTIVE = Symbol("isReactive");

// Unified reactive wrapper
export type Reactive<T> = {
  value: T;
  [IS_REACTIVE]: true;
};

// Type guard
export function isReactive(obj: any): obj is Reactive<any> {
  return !!obj && obj[IS_REACTIVE] === true;
}

// ----------------------------------------
// REACTIVE
// ----------------------------------------
export function reactive<T>(initial: T): Reactive<T> {
  const listeners = new Set<Effect>();
  const notify = () => listeners.forEach(fn => fn());

  let inner = initial;

  // If inner value is an object → proxy it
  if (typeof initial === "object" && initial !== null) {
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

  // Outer wrapper is always the same shape
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
        // If new value is an object, wrap it again
        if (typeof value === "object" && value !== null) {
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

// ----------------------------------------
// COMPUTED
// ----------------------------------------
export function computed<T>(fn: () => T): Reactive<T> {
  const r = reactive<T>(fn());

  effect(() => {
    r.value = fn();
  });

  return r;
}
