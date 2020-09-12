function __TS__DecorateParameter(this: void, decorators: Function[], target: any, key: string, parameterIndex: number) {
    for (let i: number = decorators.length; i >= 0; i--) {
        const decorator = decorators[i];
        if (decorator) {
            decorator(target, key, parameterIndex);
        }
    }
}
