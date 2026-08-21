import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import 'katex/dist/katex.min.css';
import { SafeMarkdownImage } from './SafeMarkdownImage';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#131b2b',
    primaryColor: '#3b82f6',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#60a5fa',
    lineColor: '#94a3b8',
    secondaryColor: '#0284c7',
    tertiaryColor: '#9333ea',
  },
});

interface MarkdownRendererProps {
  content: string;
  onImageClick?: (src: string, alt: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onImageClick }) => {
  return (
    <div className="prose prose-invert max-w-none space-y-3 font-body-md text-on-surface text-sm md:text-base leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-on-surface mt-4 mb-2 pb-1 border-b border-white/10 flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-primary mt-3 mb-1.5 flex items-center gap-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-tertiary mt-2.5 mb-1 flex items-center gap-2">
              {children}
            </h3>
          ),
          p: ({ children }) => {
            // Check if paragraph contains images for responsive gallery layout
            const childrenArray = React.Children.toArray(children);
            const containsMultipleImages = childrenArray.filter(
              (child: any) => child && child.type === 'img'
            ).length > 1;

            if (containsMultipleImages) {
              return (
                <div className="my-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  {children}
                </div>
              );
            }
            return <p className="my-1.5 leading-relaxed">{children}</p>;
          },
          img: ({ src, alt }: any) => (
            <SafeMarkdownImage src={src} alt={alt} onImageClick={onImageClick} />
          ),
          ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1 pl-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1 pl-2">{children}</ol>,
          li: ({ children }) => <li className="my-0.5 text-on-surface-variant/90">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-1.5 my-3 bg-surface-container/40 rounded-r-lg italic text-on-surface-variant">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong className="font-semibold text-on-surface">{children}</strong>,
          em: ({ children }) => <em className="italic text-on-surface-variant">{children}</em>,
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1].toLowerCase() : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && lang === 'mermaid') {
              return <MermaidDiagram chart={codeString} />;
            }
            if (!inline && match) {
              return <CodeBlock language={match[1]} code={codeString} />;
            }
            if (!inline && codeString.includes('\n')) {
              return <CodeBlock language="text" code={codeString} />;
            }
            return (
              <code className="bg-surface-container px-1.5 py-0.5 rounded text-xs font-mono text-primary border border-white/10" {...props}>
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-white/10 shadow-sm">
              <table className="w-full text-left border-collapse text-xs md:text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-container border-b border-white/10 text-primary font-semibold">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-on-surface-variant">{children}</td>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary-fixed transition-colors">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!chart.trim()) return;
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (isMounted) {
          setSvgContent(svg);
          setError(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[Mermaid Render Error]', err);
          setError(true);
        }
      }
    };
    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-3 p-3 rounded-lg bg-surface-container/40 border border-white/10 text-xs font-mono text-on-surface-variant">
        <pre><code>{chart}</code></pre>
      </div>
    );
  }

  return (
    <div
      className="my-4 p-4 rounded-xl bg-surface-container-lowest border border-white/15 overflow-x-auto flex justify-center shadow-lg"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl bg-surface-container-lowest border border-white/15 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-container border-b border-white/10 text-xs font-mono text-on-surface-variant">
        <span className="uppercase font-semibold text-primary">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-xs">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'Copied!' : 'Copy Code'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs md:text-sm font-mono text-on-surface leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};
