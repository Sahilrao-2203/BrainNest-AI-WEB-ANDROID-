import { Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, Packer, Math, MathFraction, MathRun } from 'docx';

function toUnicodeSubscript(str: string): string {
  const subs: { [key: string]: string } = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ'
  };
  return str.split('').map(char => subs[char] || char).join('');
}

function toUnicodeSuperscript(str: string): string {
  const supers: { [key: string]: string } = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ'
  };
  return str.split('').map(char => supers[char] || char).join('');
}

function parseLatex(latex: string): any[] {
  const elements: any[] = [];
  let i = 0;
  let clean = latex.trim();
  
  function findMatchingBrace(str: string, startIdx: number): number {
    let depth = 1;
    for (let j = startIdx; j < str.length; j++) {
      if (str[j] === '{') depth++;
      else if (str[j] === '}') {
        depth--;
        if (depth === 0) return j;
      }
    }
    return -1;
  }
  
  while (i < clean.length) {
    if (clean.substring(i).startsWith('\\frac')) {
      const firstBrace = clean.indexOf('{', i + 5);
      if (firstBrace !== -1) {
        const firstEnd = findMatchingBrace(clean, firstBrace + 1);
        if (firstEnd !== -1) {
          const secondBrace = clean.indexOf('{', firstEnd + 1);
          if (secondBrace !== -1) {
            const secondEnd = findMatchingBrace(clean, secondBrace + 1);
            if (secondEnd !== -1) {
              const numRaw = clean.substring(firstBrace + 1, firstEnd);
              const denRaw = clean.substring(secondBrace + 1, secondEnd);
              
              elements.push(
                new MathFraction({
                  numerator: parseLatex(numRaw),
                  denominator: parseLatex(denRaw),
                })
              );
              
              i = secondEnd + 1;
              continue;
            }
          }
        }
      }
    }
    
    if (clean.substring(i).startsWith('\\sqrt')) {
      const firstBrace = clean.indexOf('{', i + 5);
      if (firstBrace !== -1) {
        const firstEnd = findMatchingBrace(clean, firstBrace + 1);
        if (firstEnd !== -1) {
          const contentRaw = clean.substring(firstBrace + 1, firstEnd);
          
          elements.push(new MathRun('√('));
          elements.push(...parseLatex(contentRaw));
          elements.push(new MathRun(')'));
          
          i = firstEnd + 1;
          continue;
        }
      }
    }
    
    if (clean[i] === '\\') {
      let j = i + 1;
      while (j < clean.length && /[a-zA-Z]/.test(clean[j])) {
        j++;
      }
      const command = clean.substring(i, j);
      
      const symbolMap: { [key: string]: string } = {
        '\\omega': 'ω',
        '\\phi': 'φ',
        '\\theta': 'θ',
        '\\pi': 'π',
        '\\alpha': 'α',
        '\\beta': 'β',
        '\\gamma': 'γ',
        '\\pm': '±',
        '\\le': '≤',
        '\\ge': '≥',
        '\\infty': '∞',
        '\\cdot': '·',
        '\\sin': 'sin',
        '\\cos': 'cos',
        '\\tan': 'tan',
        '\\rightarrow': '→',
        '\\Rightarrow': '⇒',
        '\\times': '×',
        '\\div': '÷',
        '\\partial': '∂',
        '\\delta': 'δ',
        '\\Delta': 'Δ',
        '\\lambda': 'λ',
      };
      
      if (symbolMap[command]) {
        elements.push(new MathRun(symbolMap[command]));
        i = j;
        continue;
      }
    }
    
    if (clean[i] === '_') {
      if (clean[i + 1] === '{') {
        const closing = findMatchingBrace(clean, i + 2);
        if (closing !== -1) {
          const subText = clean.substring(i + 2, closing);
          elements.push(new MathRun(toUnicodeSubscript(subText)));
          i = closing + 1;
          continue;
        }
      } else {
        const char = clean[i + 1];
        if (char) {
          elements.push(new MathRun(toUnicodeSubscript(char)));
          i += 2;
          continue;
        }
      }
    }
    
    if (clean[i] === '^') {
      if (clean[i + 1] === '{') {
        const closing = findMatchingBrace(clean, i + 2);
        if (closing !== -1) {
          const superText = clean.substring(i + 2, closing);
          elements.push(new MathRun(toUnicodeSuperscript(superText)));
          i = closing + 1;
          continue;
        }
      } else {
        const char = clean[i + 1];
        if (char) {
          elements.push(new MathRun(toUnicodeSuperscript(char)));
          i += 2;
          continue;
        }
      }
    }
    
    let char = clean[i];
    if (char === '\\' && (clean[i+1] === ',' || clean[i+1] === ';' || clean[i+1] === '!')) {
      i += 2;
      continue;
    }
    if (clean.substring(i).startsWith('\\quad')) {
      elements.push(new MathRun('  '));
      i += 5;
      continue;
    }
    if (clean.substring(i).startsWith('\\qquad')) {
      elements.push(new MathRun('    '));
      i += 6;
      continue;
    }
    
    elements.push(new MathRun(char));
    i++;
  }
  
  return elements;
}

// Helper to tokenize inline formatting
function parseInlineText(text: string): any[] {
  const elements: any[] = [];
  
  // Replace \( \) and \[ \] math blocks with single $ to simplify tokenizing
  let currentText = text.replace(/\\\(|\\\)/g, '$').replace(/\\\[|\\\]/g, '$');
  
  while (currentText.length > 0) {
    const boldMatch = currentText.match(/^([\s\S]*?)\*\*([\s\S]*?)\*\*([\s\S]*)$/);
    const italicMatch = currentText.match(/^([\s\S]*?)\*([\s\S]*?)\*([\s\S]*)$/);
    const codeMatch = currentText.match(/^([\s\S]*?)`([\s\S]*?)`([\s\S]*)$/);
    const mathMatch = currentText.match(/^([\s\S]*?)\$([\s\S]*?)\$([\s\S]*)$/);
    
    let earliestMatch: { type: 'bold' | 'italic' | 'code' | 'math', prefix: string, content: string, suffix: string } | null = null;
    let minPrefixLen = Infinity;
    
    if (boldMatch && boldMatch[1].length < minPrefixLen) {
      minPrefixLen = boldMatch[1].length;
      earliestMatch = { type: 'bold', prefix: boldMatch[1], content: boldMatch[2], suffix: boldMatch[3] };
    }
    if (italicMatch && italicMatch[1].length < minPrefixLen) {
      minPrefixLen = italicMatch[1].length;
      earliestMatch = { type: 'italic', prefix: italicMatch[1], content: italicMatch[2], suffix: italicMatch[3] };
    }
    if (codeMatch && codeMatch[1].length < minPrefixLen) {
      minPrefixLen = codeMatch[1].length;
      earliestMatch = { type: 'code', prefix: codeMatch[1], content: codeMatch[2], suffix: codeMatch[3] };
    }
    if (mathMatch && mathMatch[1].length < minPrefixLen) {
      minPrefixLen = mathMatch[1].length;
      earliestMatch = { type: 'math', prefix: mathMatch[1], content: mathMatch[2], suffix: mathMatch[3] };
    }
    
    if (earliestMatch) {
      if (earliestMatch.prefix.length > 0) {
        elements.push(new TextRun({ text: earliestMatch.prefix, font: 'Arial' }));
      }
      
      if (earliestMatch.type === 'bold') {
        elements.push(new TextRun({ text: earliestMatch.content, bold: true, font: 'Arial' }));
      } else if (earliestMatch.type === 'italic') {
        elements.push(new TextRun({ text: earliestMatch.content, italics: true, font: 'Arial' }));
      } else if (earliestMatch.type === 'code') {
        elements.push(new TextRun({
          text: earliestMatch.content,
          font: 'Courier New',
          color: '#c7254e',
          shading: { fill: '#f9f2f4' }
        }));
      } else if (earliestMatch.type === 'math') {
        elements.push(
          new Math({
            children: parseLatex(earliestMatch.content)
          })
        );
      }
      
      currentText = earliestMatch.suffix;
    } else {
      elements.push(new TextRun({ text: currentText, font: 'Arial' }));
      break;
    }
  }
  
  return elements;
}

function buildDocxTable(rows: string[][]): Table {
  const tableRows: TableRow[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i];
    const isHeader = i === 0;
    
    const cells = cols.map(cellText => {
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cellText,
                bold: isHeader,
                font: 'Arial',
                size: isHeader ? 22 : 20,
                color: isHeader ? '#ffffff' : '#334155'
              })
            ],
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT
          })
        ],
        shading: { fill: isHeader ? '#4f46e5' : (i % 2 === 0 ? '#f8fafc' : '#ffffff') },
        margins: {
          top: 100,
          bottom: 100,
          left: 120,
          right: 120
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 2, color: '#e2e8f0' },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: '#e2e8f0' },
          left: { style: BorderStyle.SINGLE, size: 2, color: '#e2e8f0' },
          right: { style: BorderStyle.SINGLE, size: 2, color: '#e2e8f0' }
        }
      });
    });
    
    tableRows.push(new TableRow({ children: cells }));
  }
  
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    rows: tableRows
  });
}

export function convertMarkdownToDocx(md: string): any[] {
  const children: any[] = [];
  const lines = md.split('\n');
  
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  
  let inTable = false;
  let tableRows: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // 1. Handle Code Blocks
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        const codeText = codeBlockLines.join('\n');
        
        children.push(
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: codeText,
                            font: 'Courier New',
                            size: 19,
                            color: '#334155'
                          })
                        ]
                      })
                    ],
                    shading: { fill: '#f8fafc' },
                    margins: {
                      top: 120,
                      bottom: 120,
                      left: 180,
                      right: 180,
                    },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: '#cbd5e1' },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: '#cbd5e1' },
                      left: { style: BorderStyle.SINGLE, size: 4, color: '#cbd5e1' },
                      right: { style: BorderStyle.SINGLE, size: 4, color: '#cbd5e1' },
                    }
                  })
                ]
              })
            ]
          })
        );
        children.push(new Paragraph({ spacing: { after: 120 } }));
        
        inCodeBlock = false;
        codeBlockLines = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }
    
    // 2. Handle Tables
    if (trimmedLine.startsWith('|')) {
      inTable = true;
      const cols = line.split('|')
        .map(c => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      const isSeparator = cols.every(c => /^:?-+:?$/.test(c));
      if (!isSeparator) {
        tableRows.push(cols);
      }
      continue;
    } else if (inTable) {
      if (tableRows.length > 0) {
        children.push(buildDocxTable(tableRows));
        children.push(new Paragraph({ spacing: { after: 120 } }));
      }
      inTable = false;
      tableRows = [];
    }
    
    // 3. Handle Headings
    if (trimmedLine.startsWith('# ')) {
      const text = trimmedLine.slice(2).trim();
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: true,
              font: 'Arial',
              size: 36, // 18pt
              color: '#1e293b'
            })
          ],
          spacing: { before: 240, after: 120 },
          keepNext: true
        })
      );
      continue;
    }
    if (trimmedLine.startsWith('## ')) {
      const text = trimmedLine.slice(3).trim();
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: true,
              font: 'Arial',
              size: 28, // 14pt
              color: '#334155'
            })
          ],
          spacing: { before: 200, after: 100 },
          keepNext: true
        })
      );
      continue;
    }
    if (trimmedLine.startsWith('### ')) {
      const text = trimmedLine.slice(4).trim();
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: true,
              font: 'Arial',
              size: 24, // 12pt
              color: '#475569'
            })
          ],
          spacing: { before: 160, after: 80 },
          keepNext: true
        })
      );
      continue;
    }
    
    // 4. Handle Blockquotes
    if (trimmedLine.startsWith('>')) {
      const text = trimmedLine.slice(1).trim();
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text,
              italics: true,
              font: 'Arial',
              color: '#475569'
            })
          ],
          indent: { left: 720 },
          spacing: { before: 100, after: 100 },
          shading: { fill: '#f8fafc' }
        })
      );
      continue;
    }
    
    // 5. Handle Bullet Lists
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
      const text = trimmedLine.slice(2).trim();
      children.push(
        new Paragraph({
          children: parseInlineText(text),
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 }
        })
      );
      continue;
    }
    
    // 6. Handle Numbered Lists
    const numMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const num = numMatch[1];
      const text = numMatch[2].trim();
      const listRuns = [
        new TextRun({ text: `${num}.  `, bold: true, font: 'Arial' }),
        ...parseInlineText(text)
      ];
      children.push(
        new Paragraph({
          children: listRuns,
          indent: { left: 360 },
          spacing: { before: 60, after: 60 }
        })
      );
      continue;
    }
    
    // 7. Handle Blank Lines
    if (trimmedLine === '') {
      continue;
    }
    
    // 8. Handle Standalone Display Math blocks
    if ((trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$')) || 
        (trimmedLine.startsWith('\\[') && trimmedLine.endsWith('\\]'))) {
      const isSquare = trimmedLine.startsWith('\\[');
      const math = isSquare ? trimmedLine.slice(2, -2).trim() : trimmedLine.slice(2, -2).trim();
      children.push(
        new Paragraph({
          children: [
            new Math({
              children: parseLatex(math)
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 180 }
        })
      );
      continue;
    }
    
    // Normal text paragraph
    children.push(
      new Paragraph({
        children: parseInlineText(line),
        spacing: { before: 80, after: 80 }
      })
    );
  }
  
  return children;
}

export async function exportNoteToDocx(options: {
  title: string;
  content: string;
  subjectCode?: string | null;
  subjectName?: string | null;
  tags?: string[];
  updatedAt?: string;
}): Promise<void> {
  const { title, content, subjectCode, subjectName } = options;

  const cleanTitle = (title && title.trim()) || 'Untitled Note';
  const rawFilename = cleanTitle
    ? `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.docx`
    : 'studyflow_note.docx';
  const filename = rawFilename.replace(/^_+|_+$/g, '') || 'studyflow_note.docx';

  const children: any[] = [];

  // Header branding
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'STUDYFLOW AI',
          bold: true,
          font: 'Arial',
          size: 18,
          color: '#4f46e5',
        }),
        new TextRun({
          text: `  •  ${subjectName ? `${subjectCode} - ${subjectName}` : (subjectCode || 'ACADEMIC STUDY NOTES')}`,
          font: 'Arial',
          size: 18,
          color: '#64748b',
        })
      ],
      spacing: { after: 120 }
    })
  );

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: cleanTitle,
          bold: true,
          font: 'Arial',
          size: 44, // 22pt
          color: '#0f172a',
        })
      ],
      spacing: { after: 240 }
    })
  );

  // Separator Line
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [],
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                bottom: { style: BorderStyle.SINGLE, size: 12, color: '#4f46e5' },
                left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                right: { style: BorderStyle.NONE, size: 0, color: 'auto' }
              }
            })
          ]
        })
      ]
    })
  );

  children.push(new Paragraph({ spacing: { before: 180 } }));

  // Convert note body markdown
  const bodyChildren = convertMarkdownToDocx(content);
  children.push(...bodyChildren);

  // Document setup
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      }
    ]
  });

  // Pack document to blob & download
  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
