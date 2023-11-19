#!/usr/bin/python

import collections
import dataclasses
import difflib
import enum
import glob
import re
import sys

method_re = re.compile(r'(\) {)|(\) => {)')
static_class_re = re.compile(r' = class ')
nested_testcase_re = re.compile(r' = class extends NH.xunit.TestCase {')
skip_re = re.compile(r'( \+= )')

class C(enum.IntEnum):
  name = 0
  constructor = enum.auto()

  static_public_class = enum.auto()
  static_public_field = enum.auto()
  static_public_getter = enum.auto()
  static_public_method = enum.auto()

  public_field = enum.auto()
  public_getter = enum.auto()
  public_method = enum.auto()

  static_private_class = enum.auto()
  static_private_field = enum.auto()
  static_private_getter = enum.auto()
  static_private_method = enum.auto()

  private_field = enum.auto()
  private_getter = enum.auto()
  private_method = enum.auto()

  nested_testcase = enum.auto()

  end = enum.auto()

@dataclasses.dataclass(order=True, frozen=True)
class Nest:
  indent: int
  line: int
  name: str

@dataclasses.dataclass(frozen=True)
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
          # Alphabetize by field name
          return self.code < other.code
        elif '_getter' in self.c.name:
          # Parse (irony) out the name of the {g,s}etters
          self_word = self.code.split()[-2].split('(')[0]
          other_word = other.code.split()[-2].split('(')[0]
          # Then alphabetize
          return self_word < other_word
        else:
          return self.line < other.line
      else:
        # Everything else being equal, keep current relative order
        return self.c < other.c
    else:
      if other.parent.name in self.code:
        return False
      lt = self.parent < other.parent
      # print(f'less than: {lt}\n{self}\n{other}\n')
      return lt

def tsort(data):
  parents = dict()
  tdata = collections.defaultdict(list)

  # Gather the parents first
  for item in data:
    if item.c in (C.name, C.static_public_class, C.static_private_class,
                  C.nested_testcase):
      parents[item.code] = item

  # Separate items out under their parents
  for item in data:
    parent = parents.get(item.parent.name)
    tdata[parent].append(item)

  # Reassemble in order
  results = list()
  # Start at the root
  working = sorted(tdata[None])
  while working:
    item = working.pop(0)
    results.append(item)

    # If it has children, insert them next
    if item in tdata:
      old = working
      working = sorted(tdata[item])
      working.extend(old)

  return results

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
          # For lack of a proper JS parser, making a guess that things looking
          # like assigning a field is actually a local variable in a method.
          suspect = indent > (parent.indent + 2)
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
            elif nested_testcase_re.search(code):
              current.append(D(C.nested_testcase, words[1], num, parent))
            elif static_class_re.search(code):
              if words[1][0] == '#':
                current.append(D(C.static_private_class, words[1], num, parent))
              else:
                current.append(D(C.static_public_class, words[1], num, parent))
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
                if not suspect:
                  current.append(D(C.public_field, code, num, parent))

  if current and current[0].c == C.name:
    classes.append(current)

  clean = True
  for item in classes:
    srt = tsort(item)
    if srt != item:
      clean = False
      print(f'bad: {fn}: {item[0]}')
      item = [str(x) for x in item]
      srt = [str(x) for x in srt]
      print('\n'.join(difflib.unified_diff(item, srt)))
      print('\n\n')

  return clean

clean = True
for fn in (glob.glob('**/*.js', recursive=True)):
  clean &= process(fn)

sys.exit(not clean);
