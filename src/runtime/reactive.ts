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

export function reactive<T>(initial: T): Reactive<T> {
  const listeners = new Set<Effect>();
  const notify = () => listeners.forEach(fn => fn());

  let inner: any = initial;

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

  // if (typeof initial === "object" && initial !== null) {
  //   inner = makeProxy(initial);
  // }

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
        obj.value = typeof val === "object" ? makeProxy(val) : val;
        notify();
        return true;
      }

      if (
        typeof prop === "string" &&
        obj.value &&
        Object.prototype.hasOwnProperty.call(obj.value, prop)
      ) {
        obj.value[prop] = val;
        return true;
      }

      return Reflect.set(obj, prop, val, recv);
    }
  });
}


export function computed<T>(fn: () => T): Reactive<T> {
  const r = reactive<T>(fn());

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