#!/usr/bin/python

import dataclasses
import difflib
import enum
import glob
import re

method_re = re.compile(r'(\) {)|(\) => {)')
skip_re = re.compile(r'( \+= )')

class C(enum.IntEnum):
  name = 0
  constructor = enum.auto()

  static_public_field = enum.auto()
  static_public_getter = enum.auto()
  static_public_method = enum.auto()

  public_field = enum.auto()
  public_getter = enum.auto()
  public_method = enum.auto()

  static_private_field = enum.auto()
  static_private_getter = enum.auto()
  static_private_method = enum.auto()

  private_field = enum.auto()
  private_getter = enum.auto()
  private_method = enum.auto()

  end = enum.auto()

@dataclasses.dataclass(order=True)
class Nest:
  indent: int
  line: int
  name: str

@dataclasses.dataclass
class D:
  c: C
  code: str
  line: int
  parent: Nest

  def __post_init__(self):
    pass
    # print('post_init:', self)

  def __lt__(self, other):
    if self.parent == other.parent:
      if self.c == other.c:
        if '_field' in self.c.name:
          return self.code < other.code
        elif '_getter' in self.c.name:
          self_word = self.code.split()[-2].split('(')[0]
          other_word = other.code.split()[-2].split('(')[0]
          return self_word < other_word
        else:
          return self.line < other.line
      else:
        return self.c < other.c
    else:
      if other.parent.name in self.code:
        return False
      lt = self.parent < other.parent
      # print(f'less than: {lt}\n{self}\n{other}\n')
      return lt

def process(fn):
  classes = list()
  current = list()
  nesting = [Nest(0, 0, '')]
  in_class = False

  for num, line in enumerate(open(fn).readlines(), start=1):
    words = line.split();
    if line.startswith(' ') and words:
      code = words.pop(0)
      indent = line.index(code)
      parent = nesting[-1]

      if code in ('const', 'if', 'await', 'return', 'for', 'while', 'function', 'let', 'throw', 'new', 'try') or '.' in code or '`' in code or "'" in code or code.startswith('(') or code.startswith('super('):
        if code == 'function' and (indent <= parent.indent or not parent.indent):
          in_class = False
        continue

      if indent <= parent.indent:
        nesting.pop()
        parent = nesting[-1]

      if code.isalnum() or code[0] in ('#', '_') or '(' in code:
        if 'class' in [code] + words:
          in_class = True
          nest = Nest(indent, num, words[0])
          nesting.append(nest)

        if code in ('class', 'static', 'get', 'set', 'async'):
          code = f'{code} {words.pop(0)}'
          if code in ('static {', 'async ()'):
            continue

        if not in_class:
          continue

        code += ' ' + ' '.join(words)

        if skip_re.search(code):
          # print('skipping', code)
          continue

        if indent < 8:
          # print(num, code)
          words = code.split()
          if words[0] == 'class':
            if current:
              if current[0].c == C.name:
                classes.append(current)
              current = []
            current.append(D(C.name, words[1], num, parent))
          elif words[0].startswith('constructor'):
            current.append(D(C.constructor, words[0], num, parent))
          elif words[0] == 'static':
            if words[1] in ('get', 'set'):
              if words[2][0] == '#':
                current.append(D(C.static_private_getter, code, num, parent))
              else:
                current.append(D(C.static_public_getter, code, num, parent))
            elif method_re.search(code):
              if words[1][0] == '#':
                current.append(D(C.static_private_method, code, num, parent))
              else:
                current.append(D(C.static_public_method, code, num, parent))
            elif words[1][0] == '#':
              current.append(D(C.static_private_field, code, num, parent))
            else:
              current.append(D(C.static_public_field, code, num, parent))
          else:
            if words[0] in ('get', 'set'):
              if words[1][0] == '#':
                current.append(D(C.private_getter, code, num, parent))
              else:
                current.append(D(C.public_getter, code, num, parent))
            elif method_re.search(code):
              if words[0][0] == '#':
                current.append(D(C.private_method, code, num, parent))
              else:
                current.append(D(C.public_method, code, num, parent))
            elif words[0][0] == '#':
              current.append(D(C.private_field, code, num, parent))
            else:
              if 'new Shortcut' in code:
                current.append(D(C.public_method, code, num, parent))
              else:
                current.append(D(C.public_field, code, num, parent))

  if current and current[0].c == C.name:
    classes.append(current)

  for item in classes:
    srt = sorted(item)
    if srt != item:
      print(f'bad: {fn}: {item[0]}')
      item = [str(x) for x in item]
      srt = [str(x) for x in srt]
      print('\n'.join(difflib.unified_diff(item, srt)))
      print('\n\n')

for fn in (glob.glob('**/*.js', recursive=True)):
  process(fn)


