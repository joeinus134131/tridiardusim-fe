/** Deliberately small Arduino/C-like parser. Never evaluates sketch text as JavaScript. */
export type Value = number | string;
type Expr = {kind:'literal';value:Value}|{kind:'name';name:string}|{kind:'unary';op:string;value:Expr}|{kind:'binary';op:string;left:Expr;right:Expr}|{kind:'call';name:string;args:Expr[]}|{kind:'assign';name:string;op:string;value:Expr}|{kind:'post';name:string;op:string};
type Stmt = {kind:'block';body:Stmt[]}|{kind:'declare';name:string;value:Expr}|{kind:'expr';value:Expr}|{kind:'if';test:Expr;yes:Stmt;no?:Stmt}|{kind:'while';test:Expr;body:Stmt}|{kind:'for';init:Stmt;test:Expr;step:Expr;body:Stmt}|{kind:'return';value?:Expr}|{kind:'break'};
interface Fn { params:string[]; body:Stmt }
const types=new Set(['void','int','long','float','double','bool','byte','char','String','unsigned','const','uint8_t','uint16_t','uint32_t']);
const precedence:Record<string,number>={'=':1,'+=':1,'-=':1,'*=':1,'/=':1,'||':2,'&&':3,'|':4,'^':5,'&':6,'==':7,'!=':7,'<':8,'>':8,'<=':8,'>=':8,'<<':9,'>>':9,'+':10,'-':10,'*':11,'/':11,'%':11};
export class SketchParser {
  private tokens:{text:string;line:number}[]=[]; private i=0;
  functions=new Map<string,Fn>(); globals:Stmt[]=[];
  constructor(source:string) {
    if(source.length>64000) throw new Error('Sketch maksimum 64 KB.');
    let line=1;
    const re=/\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|0x[\da-fA-F]+|\d+(?:\.\d+)?|[A-Za-z_]\w*|\+\+|--|==|!=|<=|>=|&&|\|\||<<|>>|\+=|-=|\*=|\/=|[{}();,.+\-*/%<>=!~&|^]/gy;
    let pos=0;
    while(pos<source.length) { re.lastIndex=pos; const m=re.exec(source); if(!m) throw new Error(`Baris ${line}: sintaks tidak didukung (${source.slice(pos,pos+20)}).`); const t=m[0]; if(!/^\s|^\/\//.test(t)&&!t.startsWith('/*')) this.tokens.push({text:t,line}); line+=(t.match(/\n/g)||[]).length; pos=re.lastIndex; }
    this.tokens.push({text:'<eof>',line});
    while(this.peek()!=='<eof>') {
      this.type(); const name=this.name();
      if(this.eat('(')) { const params:string[]=[]; if(this.peek()!==')') do {this.type();params.push(this.name());} while(this.eat(',')); this.need(')'); if(this.functions.has(name)) this.fail('Fungsi duplikat'); this.functions.set(name,{params,body:this.block()}); }
      else { const value=this.eat('=')?this.expr():{kind:'literal' as const,value:0}; this.need(';');this.globals.push({kind:'declare',name,value}); }
    }
    if(!this.functions.has('setup')||!this.functions.has('loop')) this.fail('Diperlukan void setup() dan void loop()');
  }
  private peek(){return this.tokens[this.i]?.text||'<eof>';}
  private eat(s:string){if(this.peek()===s){this.i++;return true;}return false;}
  private fail(message:string):never{throw new Error(`Baris ${this.tokens[this.i]?.line}: ${message}; ditemukan '${this.peek()}'.`);}
  private need(s:string){if(!this.eat(s))this.fail(`Diharapkan ${s}`);}
  private name(){const n=this.peek();if(!/^[A-Za-z_]\w*$/.test(n))this.fail('Diharapkan nama');this.i++;return n;}
  private type(){if(!types.has(this.peek()))this.fail('Tipe/deklarasi tidak didukung');while(types.has(this.peek()))this.i++;}
  private block():Stmt{this.need('{');const body:Stmt[]=[];while(this.peek()!=='}'){if(this.peek()==='<eof>')this.fail('Blok belum ditutup');body.push(this.stmt());}this.need('}');return{kind:'block',body};}
  private stmt():Stmt {
    if(this.peek()==='{')return this.block();
    if(this.eat(';'))return{kind:'block',body:[]};
    if(this.eat('if')){this.need('(');const test=this.expr();this.need(')');const yes=this.stmt();const no=this.eat('else')?this.stmt():undefined;return{kind:'if',test,yes,no};}
    if(this.eat('while')){this.need('(');const test=this.expr();this.need(')');return{kind:'while',test,body:this.stmt()};}
    if(this.eat('for')){this.need('(');const init=this.stmt();const test=this.expr();this.need(';');const step=this.expr();this.need(')');return{kind:'for',init,test,step,body:this.stmt()};}
    if(this.eat('return')){const value=this.peek()===';'?undefined:this.expr();this.need(';');return{kind:'return',value};}
    if(this.eat('break')){this.need(';');return{kind:'break'};}
    if(types.has(this.peek())){this.type();const name=this.name();const value=this.eat('=')?this.expr():{kind:'literal' as const,value:0};this.need(';');return{kind:'declare',name,value};}
    const value=this.expr();this.need(';');return{kind:'expr',value};
  }
  private expr(min=1):Expr {
    let left:Expr;
    const t=this.peek();this.i++;
    if(['!','-','+','~'].includes(t))left={kind:'unary',op:t,value:this.expr(12)};
    else if(t==='('){left=this.expr();this.need(')');}
    else if(/^\d/.test(t))left={kind:'literal',value:Number(t)};
    else if(t.startsWith('"')||t.startsWith("'")){const s=t.slice(1,-1).replace(/\\([nrt\\"'])/g,(_,c:string)=>({n:'\n',r:'\r',t:'\t'}[c]||c));left={kind:'literal',value:t.startsWith("'")?s.charCodeAt(0):s};}
    else if(/^[A-Za-z_]\w*$/.test(t)) {let name=t;if(this.eat('.'))name+='.'+this.name(); if(this.eat('(')){const args:Expr[]=[];if(this.peek()!==')')do{args.push(this.expr());}while(this.eat(','));this.need(')');left={kind:'call',name,args};}else left={kind:'name',name};}
    else this.fail('Ekspresi tidak didukung');
    if(this.peek()==='++'||this.peek()==='--'){if(left.kind!=='name')this.fail('Increment membutuhkan variabel');left={kind:'post',name:left.name,op:this.peek()};this.i++;}
    while((precedence[this.peek()]||0)>=min) {const op=this.peek();this.i++;const right=this.expr(precedence[op]+(precedence[op]===1?0:1));if(precedence[op]===1){if(left.kind!=='name')this.fail('Assignment membutuhkan variabel');left={kind:'assign',name:left.name,op,value:right};}else left={kind:'binary',op,left,right};}
    return left;
  }
}
class Scope {
  values=new Map<string,Value>();
  constructor(readonly parent?:Scope){}
  get(n:string):Value{if(this.values.has(n))return this.values.get(n)!;if(this.parent)return this.parent.get(n);throw new Error(`Nama tidak dikenal: ${n}`);}
  set(n:string,v:Value):Value{if(this.values.has(n)){this.values.set(n,v);return v;}if(this.parent)return this.parent.set(n,v);throw new Error(`Variabel belum dideklarasikan: ${n}`);}
}
class ReturnValue {constructor(readonly value:Value){}}
class BreakLoop {}
export class SketchRuntime {
  private scope=new Scope(); private steps=0; private depth=0;
  constructor(private parser:SketchParser,private api:Record<string,(...args:Value[])=>Value|Promise<Value>>,constants:Record<string,Value>={}) {
    for(const [k,v] of Object.entries({HIGH:1,LOW:0,INPUT:0,OUTPUT:1,INPUT_PULLUP:2,LED_BUILTIN:13,true:1,false:0,A0:14,A1:15,A2:16,A3:17,A4:18,A5:19,DEC:10,HEX:16,OCT:8,BIN:2,...constants}))this.scope.values.set(k,v);
  }
  private tick(){if(++this.steps>50000)throw new Error('Batas 50.000 operasi tercapai tanpa delay/akhir loop. Periksa loop tak berujung.');}
  resetBudget(){this.steps=0;}
  async start(){for(const s of this.parser.globals)await this.stmt(s,this.scope);await this.call('setup',[]);}
  async loop(){this.resetBudget();await this.call('loop',[]);}
  private async call(name:string,args:Value[]):Promise<Value>{
    this.tick();
    if(this.api[name]){const v=await this.api[name](...args);if(name==='delay')this.resetBudget();return v;}
    const fn=this.parser.functions.get(name);if(!fn)throw new Error(`Fungsi/API belum didukung: ${name}`);
    if(++this.depth>32)throw new Error('Batas rekursi 32.');
    const scope=new Scope(this.scope);fn.params.forEach((p,i)=>scope.values.set(p,args[i]??0));
    try{await this.stmt(fn.body,scope);}catch(e){if(e instanceof ReturnValue)return e.value;throw e;}finally{this.depth--;}
    return 0;
  }
  private async expr(e:Expr,s:Scope):Promise<Value>{
    this.tick();
    switch(e.kind){
      case 'literal':return e.value;
      case 'name':return s.get(e.name);
      case 'call':{const args:Value[]=[];for(const a of e.args)args.push(await this.expr(a,s));return this.call(e.name,args);}
      case 'unary':{const v=Number(await this.expr(e.value,s));return e.op==='!'?+!v:e.op==='-'?-v:e.op==='~'?~v:v;}
      case 'post':{const v=Number(s.get(e.name));s.set(e.name,v+(e.op==='++'?1:-1));return v;}
      case 'assign':{const v=await this.expr(e.value,s);return s.set(e.name,e.op==='='?v:this.binary(e.op[0],s.get(e.name),v));}
      case 'binary':{const l=await this.expr(e.left,s);if(e.op==='&&'&&!l)return 0;if(e.op==='||'&&l)return 1;return this.binary(e.op,l,await this.expr(e.right,s));}
    }
  }
  private binary(op:string,l:Value,r:Value):Value {
    const a=Number(l),b=Number(r);
    switch(op){case '+':return typeof l==='string'||typeof r==='string'?String(l)+String(r):a+b;case '-':return a-b;case '*':return a*b;case '/':if(!b)throw new Error('Pembagian nol');return a/b;case '%':return a%b;case '<':return +(a<b);case '>':return +(a>b);case '<=':return +(a<=b);case '>=':return +(a>=b);case '==':return +(l===r);case '!=':return +(l!==r);case '&&':return +(!!l&&!!r);case '||':return +(!!l||!!r);case '&':return a&b;case '|':return a|b;case '^':return a^b;case '<<':return a<<b;case '>>':return a>>b;}throw new Error(`Operator tidak didukung: ${op}`);
  }
  private async stmt(st:Stmt,s:Scope):Promise<void>{
    this.tick();
    switch(st.kind){
      case 'block':{const child=new Scope(s);for(const x of st.body)await this.stmt(x,child);break;}
      case 'declare':s.values.set(st.name,await this.expr(st.value,s));break;
      case 'expr':await this.expr(st.value,s);break;
      case 'if':if(await this.expr(st.test,s))await this.stmt(st.yes,s);else if(st.no)await this.stmt(st.no,s);break;
      case 'return':throw new ReturnValue(st.value?await this.expr(st.value,s):0);
      case 'break':throw new BreakLoop();
      case 'while':while(await this.expr(st.test,s)){try{await this.stmt(st.body,s);}catch(e){if(e instanceof BreakLoop)break;throw e;}}break;
      case 'for':{const child=new Scope(s);await this.stmt(st.init,child);while(await this.expr(st.test,child)){try{await this.stmt(st.body,child);}catch(e){if(e instanceof BreakLoop)break;throw e;}await this.expr(st.step,child);}break;}
    }
  }
}
