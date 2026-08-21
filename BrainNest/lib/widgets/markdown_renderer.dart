import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:markdown/markdown.dart' as md;

class LatexBlockSyntax extends md.InlineSyntax {
  LatexBlockSyntax() : super(r'\$\$([^\$]+)\$\$');

  @override
  bool onMatch(md.InlineParser parser, Match match) {
    final equation = match.group(1) ?? '';
    final element = md.Element.text('latex-block', equation.trim());
    parser.addNode(element);
    return true;
  }
}

class LatexInlineSyntax extends md.InlineSyntax {
  LatexInlineSyntax() : super(r'\$([^\$]+)\$');

  @override
  bool onMatch(md.InlineParser parser, Match match) {
    final equation = match.group(1) ?? '';
    final element = md.Element.text('latex-inline', equation.trim());
    parser.addNode(element);
    return true;
  }
}

class LatexInlineBuilder extends MarkdownElementBuilder {
  @override
  Widget? visitElementAfter(md.Element element, TextStyle? preferredStyle) {
    final equation = element.textContent;
    return Math.tex(
      equation,
      textStyle: preferredStyle?.copyWith(
        fontStyle: FontStyle.normal,
        fontSize: (preferredStyle.fontSize ?? 14),
      ),
    );
  }
}

class LatexBlockBuilder extends MarkdownElementBuilder {
  @override
  Widget? visitElementAfter(md.Element element, TextStyle? preferredStyle) {
    final equation = element.textContent;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Center(
        child: Math.tex(
          equation,
          textStyle: preferredStyle?.copyWith(
            fontSize: (preferredStyle.fontSize ?? 14) * 1.15,
          ),
          mathStyle: MathStyle.display,
        ),
      ),
    );
  }
}

class MarkdownRenderer extends StatelessWidget {
  final String data;
  final bool selectable;
  final ScrollPhysics? physics;
  final MarkdownStyleSheet? styleSheet;

  const MarkdownRenderer({
    super.key,
    required this.data,
    this.selectable = true,
    this.physics,
    this.styleSheet,
  });

  @override
  Widget build(BuildContext context) {
    return Markdown(
      data: data,
      selectable: selectable,
      physics: physics,
      styleSheet: styleSheet,
      inlineSyntaxes: [
        LatexBlockSyntax(),
        LatexInlineSyntax(),
      ],
      builders: {
        'latex-inline': LatexInlineBuilder(),
        'latex-block': LatexBlockBuilder(),
      },
    );
  }
}

class MarkdownBodyRenderer extends StatelessWidget {
  final String data;
  final bool selectable;
  final MarkdownStyleSheet? styleSheet;

  const MarkdownBodyRenderer({
    super.key,
    required this.data,
    this.selectable = true,
    this.styleSheet,
  });

  @override
  Widget build(BuildContext context) {
    return MarkdownBody(
      data: data,
      selectable: selectable,
      styleSheet: styleSheet,
      inlineSyntaxes: [
        LatexBlockSyntax(),
        LatexInlineSyntax(),
      ],
      builders: {
        'latex-inline': LatexInlineBuilder(),
        'latex-block': LatexBlockBuilder(),
      },
    );
  }
}
