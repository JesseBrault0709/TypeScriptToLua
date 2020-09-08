import * as ts from "typescript";
import * as lua from "../../../../LuaAST";
import { TransformationContext } from "../../../context";
import { transformFunctionToExpression } from "../../function";
import { transformPropertyName } from "../../literal";
import { isStaticNode } from "../utils";
import { transformLuaLibFunction, LuaLibFeature } from "../../../utils/lualib";

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

    if (node.decorators) {
        const decoratorExpressions: lua.Expression[] = node.decorators
            .map(dec => dec.expression)
            .map(expr => context.transformExpression(expr));

        const decoratorTable: lua.TableExpression = lua.createTableExpression(
            decoratorExpressions.map(decoratorExpression => lua.createTableFieldExpression(decoratorExpression))
        );

        const descriptor = lua.createTableExpression([
            lua.createTableFieldExpression(qualifiedMethodIdentifier, lua.createStringLiteral("value")),
        ]);

        result.push(
            lua.createAssignmentStatement(
                qualifiedMethodIdentifier,
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

    return result;
}
