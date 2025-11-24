import ts from "typescript";

export default function reactiveTransformer(program) {
  const reactiveVars = new Set();

  function visitor(ctx) {
    const visit = (node) => {

      // Find: reactive let count = 0;
      if (
        ts.isVariableStatement(node) &&
        node.modifiers?.some(m => m.getText() === "reactive")
      ) {
        const decl = node.declarationList.declarations[0];
        const name = decl.name.escapedText;

        reactiveVars.add(name);

        return ts.factory.createVariableStatement(
          [],
          ts.factory.createVariableDeclarationList(
            [
              ts.factory.createVariableDeclaration(
                ts.factory.createIdentifier(name),
                undefined,
                undefined,
                ts.factory.createCallExpression(
                  ts.factory.createIdentifier("reactive"),
                  undefined,
                  [decl.initializer]
                )
              )
            ],
            ts.NodeFlags.Const
          )
        );
      }

      // Rewrite usage: count → count.value
      if (ts.isIdentifier(node) && reactiveVars.has(node.escapedText)) {

        // Do not rewrite declarations
        if (ts.isVariableDeclaration(node.parent)) {
          return node;
        }

        return ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(node.escapedText),
          ts.factory.createIdentifier("value")
        );
      }

      return ts.visitEachChild(node, visit, ctx);
    };

    return visit;
  }

  return (ctx) => (sf) => ts.visitNode(sf, visitor(ctx));
}
