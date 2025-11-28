import { reactive, type Reactive } from "./reactive";

export class ReactiveMap<K, V> {
  private map = new Map<K, { value: V }>();

  get(key: K) {
    return this.map.get(key);
  }

  set(key: K, value: V) {
    const reactiveValue = isReactive(value) ? value : reactive(value);
    this.map.set(key, reactiveValue);
    return this;
  }

  has(key: K) {
    return this.map.has(key);
  }

  delete(key: K) {
    return this.map.delete(key);
  }
}

function isReactive(obj: any): obj is { value: any } {
  return obj && typeof obj === "object" && "value" in obj;
}

