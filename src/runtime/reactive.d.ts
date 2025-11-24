export declare function reactive<T>(initial: T): { value: T };
export declare function effect(fn: () => void): void;