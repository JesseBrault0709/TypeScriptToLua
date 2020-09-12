import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { transformFunctionToExpression } from "../../function";
import { transformPropertyName } from "../../literal";
import { isStaticNode } from "../utils";
import { transformLuaLibFunction, LuaLibFeature } from "../../../utils/lualib";

/**
 * Transforms the given decorators to lua expressions.
 *
 *
 * @param context The context
 * @param decorators The decorators to transform
 * @returns An array of lua expressions representing the decorators as they appear in the source.
 */
function decoratorsToExpressions(context: TransformationContext, ...decorators: ts.Decorator[]): lua.Expression[] {
    return decorators.map(decorator => decorator.expression).map(decExpr => context.transformExpression(decExpr));
}

/**
 * Takes the given expressions and creates a table expression whose fields
 * represent the given expressions.
 *
 * @param expressions The expressions to put in the table.
 * @returns A table expression of the generated table.
 */
function expressionsToTableExpr(...expressions: lua.Expression[]): lua.TableExpression {
    return lua.createTableExpression(expressions.map(expr => lua.createTableFieldExpression(expr)));
}

export function transformMethodDeclaration(
    context: TransformationContext,
    node: ts.MethodDeclaration,
    className: lua.Identifier,
    noPrototype: boolean
): lua.Statement[] | undefined {
    // Don't transform methods without body (overload declarations)
    if (!node.body) {
        return undefined;
    }

    const methodTable =
        isStaticNode(node) || noPrototype
            ? lua.cloneIdentifier(className)
            : lua.createTableIndexExpression(lua.cloneIdentifier(className), lua.createStringLiteral("prototype"));

    let methodName = transformPropertyName(context, node.name);
    if (lua.isStringLiteral(methodName) && methodName.value === "toString") {
        methodName = lua.createStringLiteral("__tostring", node.name);
    }

    const [functionExpression] = transformFunctionToExpression(context, node);

    const qualifiedMethodIdentifier = lua.createTableIndexExpression(methodTable, methodName);

    const result: lua.Statement[] = [];

    result.push(lua.createAssignmentStatement(qualifiedMethodIdentifier, functionExpression, node));

    // decorate method

    if (node.decorators) {
        const decoratorTable: lua.TableExpression = expressionsToTableExpr(
            ...decoratorsToExpressions(context, ...node.decorators)
        );

        // create a faux descriptor. this is not saved by the lualib and is only
        // for the purpose of passing a descriptor to the decorator(s)
        const descriptor = lua.createTableExpression([
            lua.createTableFieldExpression(qualifiedMethodIdentifier, lua.createStringLiteral("value")),
        ]);

        result.push(
            lua.createAssignmentStatement(
                qualifiedMethodIdentifier,

                // see https://www.typescriptlang.org/docs/handbook/decorators.html#method-decorators
                transformLuaLibFunction(
                    context,
                    LuaLibFeature.DecorateMethod,
                    undefined,
                    decoratorTable,
                    methodTable,
                    methodName,
                    descriptor
                )
            )
        );
    }

    // decorate parameters

    if (node.parameters) {
        // use for loop since we need the index of the parameter
        for (let paramIndex = 0; paramIndex < node.parameters.length; paramIndex++) {
            const parameterDecl = node.parameters[paramIndex];
            if (parameterDecl.decorators) {
                const decoratorTable: lua.TableExpression = expressionsToTableExpr(
                    ...decoratorsToExpressions(context, ...parameterDecl.decorators)
                );

                // see https://www.typescriptlang.org/docs/handbook/decorators.html#parameter-decorators
                const decorateParamCall = transformLuaLibFunction(
                    context,
                    LuaLibFeature.DecorateParameter,
                    undefined,
                    decoratorTable,
                    methodTable,
                    methodName,
                    lua.createNumericLiteral(paramIndex + 1) // + 1 because lua counts from 1, not zero
                );

                result.push(lua.createExpressionStatement(decorateParamCall));
            }
        }
    }

    return result;
}
