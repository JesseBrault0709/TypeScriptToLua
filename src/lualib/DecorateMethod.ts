function __TS__DecorateMethod(this: void, decorators: Function[], target: any, key: string, desc: PropertyDescriptor) {
    for (let i: number = decorators.length; i >= 0; i--) {
        const decorator = decorators[i];
        if (decorator) {
            const oldDesc = desc;
            let result = decorator(target, key, desc);
            if (result && typeof result === "function") {
                // decorator factory
                result = result(target, key, desc);
            }
            desc = result || oldDesc;
        }
    }
    return desc.value;
}
