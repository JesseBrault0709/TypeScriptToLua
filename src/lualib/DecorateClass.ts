/**
 * SEE: https://github.com/Microsoft/TypeScript/blob/master/src/compiler/transformers/ts.ts#L3598
 */
function __TS__DecorateClass(this: void, decorators: Function[], target: {}): {} {
    let result = target;

    for (let i = decorators.length; i >= 0; i--) {
        const decorator = decorators[i];
        if (decorator) {
            const oldResult = result;
            result = decorator(result) || oldResult;
        }
    }

    return result;
}
