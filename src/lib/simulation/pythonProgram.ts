/** Python-side source rewriting that inserts cooperative yield points into user loops. */
export const PYTHON_PROGRAM_SETUP = `
import ast, asyncio

async def __ardusim_yield():
    await asyncio.sleep(0)
    while __is_paused(): await asyncio.sleep(0.025)

async def __ardusim_sleep(seconds):
    end = asyncio.get_running_loop().time() + max(0.0, float(seconds))
    while asyncio.get_running_loop().time() < end:
        await __ardusim_yield()
        await asyncio.sleep(min(0.025, max(0.0, end - asyncio.get_running_loop().time())))

class __CooperativeTransformer(ast.NodeTransformer):
    def __init__(self, async_names): self.async_names = async_names
    def visit_FunctionDef(self, node):
        node = self.generic_visit(node)
        return ast.AsyncFunctionDef(name=node.name, args=node.args, body=node.body,
          decorator_list=node.decorator_list, returns=node.returns, type_comment=node.type_comment,
          type_params=getattr(node, "type_params", []))
    def visit_While(self, node):
        node = self.generic_visit(node)
        node.body.insert(0, ast.Expr(value=ast.Await(value=ast.Call(func=ast.Name(id="__ardusim_yield", ctx=ast.Load()), args=[], keywords=[]))))
        return node
    def visit_For(self, node):
        node = self.generic_visit(node)
        node.body.insert(0, ast.Expr(value=ast.Await(value=ast.Call(func=ast.Name(id="__ardusim_yield", ctx=ast.Load()), args=[], keywords=[]))))
        return node
    def visit_AsyncFor(self, node):
        node = self.generic_visit(node)
        node.body.insert(0, ast.Expr(value=ast.Await(value=ast.Call(func=ast.Name(id="__ardusim_yield", ctx=ast.Load()), args=[], keywords=[]))))
        return node
    def visit_Call(self, node):
        node = self.generic_visit(node)
        if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) and node.func.value.id == "time" and node.func.attr == "sleep":
            return ast.Await(value=ast.Call(func=ast.Name(id="__ardusim_sleep", ctx=ast.Load()), args=node.args, keywords=node.keywords))
        function_name = node.func.id if isinstance(node.func, ast.Name) else node.func.attr if isinstance(node.func, ast.Attribute) else ""
        if function_name in self.async_names:
            return ast.Await(value=node)
        return node

def __prepare_user_program(source):
    tree = ast.parse(source, filename="main.py")
    async_names = {item.name for item in ast.walk(tree) if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))}
    transformed = __CooperativeTransformer(async_names).visit(tree)
    ast.fix_missing_locations(transformed)
    args = ast.arguments(posonlyargs=[], args=[], vararg=None, kwonlyargs=[], kw_defaults=[], kwarg=None, defaults=[])
    main = ast.AsyncFunctionDef(name="__ardusim_user_main", args=args, body=transformed.body or [ast.Pass()], decorator_list=[])
    module = ast.Module(body=[main], type_ignores=[])
    ast.fix_missing_locations(module)
    return compile(module, "main.py", "exec")
`;

export function pythonExecSource(code: string) {
  return `__code = ${JSON.stringify(code)}\nexec(__prepare_user_program(__code), globals())\nawait __ardusim_user_main()`;
}
