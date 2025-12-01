import {
    Reactive,
    reactive,
    effect
} from './reactive';

const persistentRegistry = new Map<string, Reactive<any>>();
const sessionRegistry = new Map<string, Reactive<any>>();
// const globalRegistry = new Map<string, Reactive<any>>();

export function persistent<T>(
  key: string,
  initialValue?: T,
): Reactive<T | undefined> {
  const storage = localStorage;

  if (persistentRegistry.has(key)) return persistentRegistry.get(key)!;

  let val: T | undefined = initialValue;
  if (storage) {
    const stored = storage.getItem(key);
    if (stored !== null) {
      try {
        val = JSON.parse(stored);
      } catch {
        val = initialValue;
      }
    }
  }

  const r = reactive(val) as Reactive<T | undefined>;

  if (storage) {
    effect(() => {
      if (r.value === undefined) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, JSON.stringify(r.value));
      }
    });
  }

  persistentRegistry.set(key, r);
  return r;
}

export function session<T>(
  key: string,
  initialValue?: T,
): Reactive<T | undefined> {
  const storage = sessionStorage;

  if (sessionRegistry.has(key)) return sessionRegistry.get(key)!;

  let val: T | undefined = initialValue;
  if (storage) {
    const stored = storage.getItem(key);
    if (stored !== null) {
      try {
        val = JSON.parse(stored);
      } catch {
        val = initialValue;
      }
    }
  }

  const r = reactive(val) as Reactive<T | undefined>;

  if (storage) {
    effect(() => {
      if (r.value === undefined) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, JSON.stringify(r.value));
      }
    });
  }

  sessionRegistry.set(key, r);
  return r;
}

