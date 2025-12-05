type Effect = () => void;
let currentEffect: Effect | null = null;

// The standard signal interface: callable getter, explicit setter
export interface Signal<T> {
  (): T;                      // Getter (read and track dependency)
  set: (newValue: T) => void; // Setter (write and notify listeners)
  _listeners: Set<Effect>;    // Internal listener set
  _isComputed?: true;         // Marker for computed signals
}

export type NestedSignals<T> = {
  [K in keyof T]: T[K] extends object
    ? T[K] extends Array<any> 
        ? Signal<T[K]> // Arrays become a single Signal
        : NestedSignals<T[K]> // Nested objects are mapped recursively
    : Signal<T[K]>;       // Primitives become Signals
};

export function effect(fn: Effect) {
  currentEffect = fn;
  fn();
  currentEffect = null;
}

export function isReactive(obj: any): obj is Signal<any> {
  return !!obj && 
         typeof obj === 'function' && 
         typeof obj.set === 'function' &&
         obj._listeners instanceof Set;
}

/**
 * Recursively creates a NestedSignals structure from an initial object.
 * Every primitive property becomes its own Signal. Arrays become a single Signal.
 * @param initial - The object to make reactive.
 * @returns An object with properties mapped to Signals.
 */
export function makeReactiveObject<T extends object>(initial: T): NestedSignals<T> {
  if (typeof initial !== 'object' || initial === null) {
    throw new Error("reactive() must be called with an object or array.");
  }

  const result: any = {};

  for (const key in initial) {
    if (Object.prototype.hasOwnProperty.call(initial, key)) {
      const value = initial[key];

      if (Array.isArray(value)) {
        result[key] = reactive(value); 
      } else if (typeof value === 'object' && value !== null) {
        result[key] = makeReactiveObject(value);
      } else {
        result[key] = reactive(value);
      }
    }
  }

  return result as NestedSignals<T>;
}

/**
 * Creates the core reactive primitive.
 * @param initialValue - The starting value.
 * @returns A Signal function that reads/tracks, with a .set method to write/notify.
 */
export function reactive<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const listeners = new Set<Effect>();

  const read = () => {
    if (currentEffect) listeners.add(currentEffect);
    return value;
  };

  const set = (newValue: T) => {
    if (newValue === value) return;
    value = newValue;
    listeners.forEach(fn => fn());
    return signal
  };

  const signal = read as Signal<T>;
  signal.set = set;
  signal._listeners = listeners;

  return signal;
}

/**
 * Creates a derived Signal whose value is calculated when dependencies change.
 * @param fn - The function that reads reactive dependencies and returns the computed value.
 * @returns A Signal whose value updates automatically.
 */
export function computed<T>(fn: () => T): Signal<T> {
  // Start with the initial value
  const r = reactive(fn());
  
  // Create an effect that re-runs when fn()'s dependencies change
  effect(() => {
    // When the effect runs, it reads dependencies (tracking them), and sets the new value
    r.set(fn());
  });
  
  (r as any)._isComputed = true; // Mark it
  return r;
}