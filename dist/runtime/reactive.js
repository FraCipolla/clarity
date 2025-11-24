let currentEffect = null;
export function effect(fn) {
    currentEffect = fn;
    fn();
    currentEffect = null;
}
// ----------------------------------------
// MARKER
// ----------------------------------------
export const IS_REACTIVE = Symbol("isReactive");
// Type guard
export function isReactive(obj) {
    return !!obj && obj[IS_REACTIVE] === true;
}
// ----------------------------------------
// REACTIVE
// ----------------------------------------
export function reactive(initial) {
    const listeners = new Set();
    const notify = () => listeners.forEach(fn => fn());
    let inner = initial;
    // If inner value is an object → proxy it
    if (typeof initial === "object" && initial !== null) {
        inner = new Proxy(initial, {
            get(obj, prop, receiver) {
                const value = Reflect.get(obj, prop, receiver);
                if (currentEffect)
                    listeners.add(currentEffect);
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
    const wrapper = {
        value: inner,
        [IS_REACTIVE]: true
    };
    return new Proxy(wrapper, {
        get(obj, prop, receiver) {
            if (prop === IS_REACTIVE)
                return true;
            if (prop === "value") {
                if (currentEffect)
                    listeners.add(currentEffect);
                return Reflect.get(obj, prop, receiver);
            }
            return Reflect.get(obj, prop, receiver);
        },
        set(obj, prop, value) {
            if (prop === "value") {
                // If new value is an object, wrap it again
                if (typeof value === "object" && value !== null) {
                    obj.value = new Proxy(value, {
                        get(target, key, recv) {
                            if (currentEffect)
                                listeners.add(currentEffect);
                            return Reflect.get(target, key, recv);
                        },
                        set(target, key, val) {
                            const ok = Reflect.set(target, key, val);
                            notify();
                            return ok;
                        }
                    });
                }
                else {
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
export function computed(fn) {
    const r = reactive(fn());
    effect(() => {
        r.value = fn();
    });
    return r;
}
//# sourceMappingURL=reactive.js.map