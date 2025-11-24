type Effect = () => void;
export declare function effect(fn: Effect): void;
export declare const IS_REACTIVE: unique symbol;
export type Reactive<T> = {
    value: T;
    [IS_REACTIVE]: true;
};
export declare function isReactive(obj: any): obj is Reactive<any>;
export declare function reactive<T>(initial: T): Reactive<T>;
export declare function computed<T>(fn: () => T): Reactive<T>;
export {};
//# sourceMappingURL=reactive.d.ts.map