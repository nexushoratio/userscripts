#!/usr/bin/python
"""Lint against the userscript/STYLE-GUIDE.md."""

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


class Type(enum.IntEnum):
  """Identify the code snippet type."""
  NAME = 0
  CONSTRUCTOR = enum.auto()

  STATIC_PUBLIC_CLASS = enum.auto()
  STATIC_PUBLIC_FIELD = enum.auto()
  STATIC_PUBLIC_GETTER = enum.auto()
  STATIC_PUBLIC_METHOD = enum.auto()

  PUBLIC_FIELD = enum.auto()
  PUBLIC_GETTER = enum.auto()
  PUBLIC_METHOD = enum.auto()

  STATIC_PRIVATE_CLASS = enum.auto()
  STATIC_PRIVATE_FIELD = enum.auto()
  STATIC_PRIVATE_GETTER = enum.auto()
  STATIC_PRIVATE_METHOD = enum.auto()

  PRIVATE_FIELD = enum.auto()
  PRIVATE_GETTER = enum.auto()
  PRIVATE_METHOD = enum.auto()

  NESTED_TESTCASE = enum.auto()

  END = enum.auto()


@dataclasses.dataclass(order=True, frozen=True)
class Nest:
  """Details about the nest (often class) of an entry."""
  indent: int
  line: int
  name: str


@dataclasses.dataclass(frozen=True)
class Snippet:
  """Snippet identifying interesting bits of code."""
  type: Type
  code: str
  line: int
  parent: Nest

  def __post_init__(self):
    pass
    # print('post_init:', self)

  def __lt__(self, other):
    if self.parent == other.parent:
      if self.type == other.type:
        if '_FIELD' in self.type.name:
          # Alphabetize by field name
          return self.code < other.code
        elif '_GETTER' in self.type.name:
          # Parse (irony) out the name of the {g,s}etters
          self_word = self.code.split()[-2].split('(')[0]
          other_word = other.code.split()[-2].split('(')[0]
          # Then alphabetize
          return self_word < other_word
        else:
          return self.line < other.line
      else:
        # Everything else being equal, keep current relative order
        return self.type < other.type
    else:
      if other.parent.name in self.code:
        return False
      return self.parent < other.parent


def tsort(data):
  parents = dict()
  tdata = collections.defaultdict(list)

  # Gather the parents first
  for item in data:
    if item.type in (Type.NAME, Type.STATIC_PUBLIC_CLASS, Type.STATIC_PRIVATE_CLASS,
                  Type.NESTED_TESTCASE):
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


def process(filename):
  classes = list()
  current = list()
  nesting = [Nest(0, 0, '')]
  in_class = False

  for num, line in enumerate(open(filename, encoding='utf-8').readlines(),
                             start=1):
    words = line.split()
    if line.startswith(' ') and words:
      code = words.pop(0)
      indent = line.index(code)
      parent = nesting[-1]

      if code in (
          'const', 'if', 'await', 'return', 'for', 'while', 'function', 'let',
          'throw', 'new', 'try'
      ) or '.' in code or '`' in code or "'" in code or code.startswith(
          '(') or code.startswith('super('):
        if code == 'function' and (indent <= parent.indent
                                   or not parent.indent):
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
              if current[0].type == Type.NAME:
                classes.append(current)
              current = []
            current.append(Snippet(Type.NAME, words[1], num, parent))
          elif words[0].startswith('constructor'):
            current.append(Snippet(Type.CONSTRUCTOR, words[0], num, parent))
          elif words[0] == 'static':
            if words[1] in ('get', 'set'):
              if words[2][0] == '#':
                current.append(Snippet(Type.STATIC_PRIVATE_GETTER, code, num, parent))
              else:
                current.append(Snippet(Type.STATIC_PUBLIC_GETTER, code, num, parent))
            elif nested_testcase_re.search(code):
              current.append(Snippet(Type.NESTED_TESTCASE, words[1], num, parent))
            elif static_class_re.search(code):
              if words[1][0] == '#':
                current.append(Snippet(Type.STATIC_PRIVATE_CLASS, words[1], num,
                                 parent))
              else:
                current.append(Snippet(Type.STATIC_PUBLIC_CLASS, words[1], num, parent))
            elif method_re.search(code):
              if words[1][0] == '#':
                current.append(Snippet(Type.STATIC_PRIVATE_METHOD, code, num, parent))
              else:
                current.append(Snippet(Type.STATIC_PUBLIC_METHOD, code, num, parent))
            elif words[1][0] == '#':
              current.append(Snippet(Type.STATIC_PRIVATE_FIELD, code, num, parent))
            else:
              current.append(Snippet(Type.STATIC_PUBLIC_FIELD, code, num, parent))
          else:
            if words[0] in ('get', 'set'):
              if words[1][0] == '#':
                current.append(Snippet(Type.PRIVATE_GETTER, code, num, parent))
              else:
                current.append(Snippet(Type.PUBLIC_GETTER, code, num, parent))
            elif method_re.search(code):
              if words[0][0] == '#':
                current.append(Snippet(Type.PRIVATE_METHOD, code, num, parent))
              else:
                current.append(Snippet(Type.PUBLIC_METHOD, code, num, parent))
            elif words[0][0] == '#':
              current.append(Snippet(Type.PRIVATE_FIELD, code, num, parent))
            else:
              if 'new Shortcut' in code:
                current.append(Snippet(Type.PUBLIC_METHOD, code, num, parent))
              else:
                if not suspect:
                  current.append(Snippet(Type.PUBLIC_FIELD, code, num, parent))

  if current and current[0].type == Type.NAME:
    classes.append(current)

  clean = True
  for item in classes:
    srt = tsort(item)
    if srt != item:
      clean = False
      print(f'bad: {filename}: {item[0]}')
      item = [str(x) for x in item]
      srt = [str(x) for x in srt]
      print('\n'.join(difflib.unified_diff(item, srt)))
      print('\n\n')

  return clean


clean = True
for fn in (glob.glob('**/*.js', recursive=True)):
  clean &= process(fn)

sys.exit(not clean)
