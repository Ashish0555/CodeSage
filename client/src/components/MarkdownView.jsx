import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Consistent markdown rendering (statements, editorials, AI answers). */
export default function MarkdownView({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ''}</ReactMarkdown>
    </div>
  );
}
