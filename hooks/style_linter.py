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
skip_re = re.compile(r'( \+= )|(^static {)|(^async \(\))')


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

    def __lt__(self, other):
        if self.parent == other.parent:
            if self.type == other.type:
                if '_FIELD' in self.type.name:
                    # Alphabetize by field name
                    return self.code < other.code

                if '_GETTER' in self.type.name:
                    # Parse (irony) out the name of the {g,s}etters
                    self_word = self.code.split()[-2].split('(')[0]
                    other_word = other.code.split()[-2].split('(')[0]
                    # Then alphabetize
                    return self_word < other_word

                # Everything else being equal, keep current relative order
                return self.line < other.line

            # Order by type
            return self.type < other.type

        # Is it our parent?
        if other.parent.name in self.code:
            return False

        # Otherwise, order by our parents
        return self.parent < other.parent


def tsort(data):
    """Perform a topological sort on the data.

  Mostly, place nested items under their parents.
  """
    parents = dict()
    tdata = collections.defaultdict(list)

    # Gather the parents first
    for item in data:
        if item.type in (Type.NAME, Type.STATIC_PUBLIC_CLASS,
                         Type.STATIC_PRIVATE_CLASS, Type.NESTED_TESTCASE):
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


def extract_snippet(code, line_number, parent, indent):
    """Returns a Snippet() that represents the current line of code.

  Args:
    code: str, Line of code to examine.
    line_number: int, Current line line_numberber in the file.
    parent: Nest, Parent context.
    indent: int, How many spaces the current line is indented.
  """
    snippet = None
    words = code.split()
    if words[0] == 'class':
        snippet = Snippet(Type.NAME, words[1], line_number, parent)
    elif words[0].startswith('constructor'):
        snippet = Snippet(Type.CONSTRUCTOR, words[0], line_number, parent)
    elif words[0] == 'static':
        if words[1] in ('get', 'set'):
            if words[2][0] == '#':
                snippet = Snippet(
                    Type.STATIC_PRIVATE_GETTER, code, line_number, parent)
            else:
                snippet = Snippet(
                    Type.STATIC_PUBLIC_GETTER, code, line_number, parent)
        elif nested_testcase_re.search(code):
            snippet = Snippet(
                Type.NESTED_TESTCASE, words[1], line_number, parent)
        elif static_class_re.search(code):
            if words[1][0] == '#':
                snippet = Snippet(
                    Type.STATIC_PRIVATE_CLASS, words[1], line_number, parent)
            else:
                snippet = Snippet(
                    Type.STATIC_PUBLIC_CLASS, words[1], line_number, parent)
        elif method_re.search(code):
            if words[1][0] == '#':
                snippet = Snippet(
                    Type.STATIC_PRIVATE_METHOD, code, line_number, parent)
            else:
                snippet = Snippet(
                    Type.STATIC_PUBLIC_METHOD, code, line_number, parent)
        elif words[1][0] == '#':
            snippet = Snippet(
                Type.STATIC_PRIVATE_FIELD, code, line_number, parent)
        else:
            snippet = Snippet(
                Type.STATIC_PUBLIC_FIELD, code, line_number, parent)
    else:
        if words[0] in ('get', 'set'):
            if words[1][0] == '#':
                snippet = Snippet(
                    Type.PRIVATE_GETTER, code, line_number, parent)
            else:
                snippet = Snippet(
                    Type.PUBLIC_GETTER, code, line_number, parent)
        elif method_re.search(code):
            if words[0][0] == '#':
                snippet = Snippet(
                    Type.PRIVATE_METHOD, code, line_number, parent)
            else:
                snippet = Snippet(
                    Type.PUBLIC_METHOD, code, line_number, parent)
        elif words[0][0] == '#':
            snippet = Snippet(Type.PRIVATE_FIELD, code, line_number, parent)
        else:
            if 'new Shortcut' in code:
                snippet = Snippet(
                    Type.PUBLIC_METHOD, code, line_number, parent)
            else:
                # For lack of a proper JS parser, making a guess that things
                # looking like assigning a field is actually a local variable
                # in a method.
                likely_local_variable_assignment = indent > (
                    parent.indent + 2)
                if not likely_local_variable_assignment:
                    snippet = Snippet(
                        Type.PUBLIC_FIELD, code, line_number, parent)

    return snippet


def add_current_to_classes(current, classes):
    """Add the current collection to classes if it represents a class."""
    if current and current[0].type == Type.NAME:
        classes.append(current)


def should_skip(code):
    """Returns whether this code should be skipped."""
    # Reserved words
    if code in ('const', 'if', 'await', 'return', 'for', 'while', 'function',
                'let', 'throw', 'new', 'try'):
        return True
    # Certain punctuation marks
    if '.' in code or '`' in code or "'" in code:
        return True
    # Internal line
    if code.startswith('(') or code.startswith('super('):
        return True
    return False


def process_results(filename, classes):
    """Print out the results."""
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


def process(filename):
    """Lint the given filename."""
    classes = list()
    current = list()
    nesting = [Nest(0, 0, '')]
    in_class = False

    with open(filename, encoding='utf-8') as handle:
        for num, line in enumerate(handle.readlines(), start=1):
            snippet = None
            words = line.split()
            if line.startswith(' ') and words:
                code = words.pop(0)
                indent = line.index(code)
                parent = nesting[-1]

                if code == 'function' and (indent <= parent.indent
                                           or not parent.indent):
                    in_class = False

                if should_skip(code):
                    continue

                if indent <= parent.indent:
                    nesting.pop()
                    parent = nesting[-1]

                if code.isalnum() or code[0] in ('#', '_') or '(' in code:
                    if 'class' in [code] + words:
                        in_class = True
                        nest = Nest(indent, num, words[0])
                        nesting.append(nest)

                    code += ' ' + ' '.join(words)

                    if in_class and indent < 8 and not skip_re.search(code):
                        snippet = extract_snippet(code, num, parent, indent)
            if snippet:
                # New class
                if snippet.type == Type.NAME:
                    add_current_to_classes(current, classes)
                    current = []
                current.append(snippet)

    # Catch the last class being worked on
    add_current_to_classes(current, classes)
    return process_results(filename, classes)


def main():
    """Main."""
    clean = True
    for filename in (glob.glob('**/*.js', recursive=True)):
        clean &= process(filename)

    return not clean


if __name__ == '__main__':
    sys.exit(main())
