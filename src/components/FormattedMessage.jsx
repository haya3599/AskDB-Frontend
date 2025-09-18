import React from 'react';

/**
 * FormattedMessage Component
 * 
 * Renders AI messages with rich formatting similar to ChatGPT:
 * - Bullet points and numbered lists
 * - Code blocks with syntax highlighting
 * - Bold and italic text
 * - Headers
 * - Line breaks and paragraphs
 */
const FormattedMessage = ({ content }) => {
  if (!content) return null;

  // Split content into lines for processing
  const lines = content.split('\n');
  const formattedElements = [];
  let currentList = [];
  let listType = null;
  let key = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'bullet') {
        formattedElements.push(
          <ul key={key++} className="formatted-list bullet-list">
            {currentList.map((item, index) => (
              <li key={index} className="formatted-list-item">
                {formatInlineText(item)}
              </li>
            ))}
          </ul>
        );
      } else if (listType === 'numbered') {
        formattedElements.push(
          <ol key={key++} className="formatted-list numbered-list">
            {currentList.map((item, index) => (
              <li key={index} className="formatted-list-item">
                {formatInlineText(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  const formatInlineText = (text) => {
    if (!text) return text;

    // Handle bold text **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text *text*
    text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    
    // Handle inline code `code`
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  const formatCodeBlock = (code, language = '') => {
    return (
      <pre key={key++} className="formatted-code-block">
        <code className={`language-${language}`}>
          {code}
        </code>
      </pre>
    );
  };

  const formatHeader = (text, level) => {
    const HeaderTag = `h${level}`;
    const className = `formatted-header h${level}`;
    return React.createElement(HeaderTag, { key: key++, className }, formatInlineText(text));
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Handle code blocks
    if (trimmedLine.startsWith('```')) {
      flushList();
      const language = trimmedLine.slice(3).trim();
      const codeLines = [];
      let i = index + 1;
      
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      
      if (codeLines.length > 0) {
        formattedElements.push(formatCodeBlock(codeLines.join('\n'), language));
      }
      return;
    }

    // Handle headers
    if (trimmedLine.startsWith('#')) {
      flushList();
      const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        formattedElements.push(formatHeader(text, level));
      }
      return;
    }

    // Handle bullet points
    if (trimmedLine.match(/^[-•*]\s+/)) {
      if (listType !== 'bullet') {
        flushList();
        listType = 'bullet';
      }
      const item = trimmedLine.replace(/^[-•*]\s+/, '');
      currentList.push(item);
      return;
    }

    // Handle numbered lists
    if (trimmedLine.match(/^\d+\.\s+/)) {
      if (listType !== 'numbered') {
        flushList();
        listType = 'numbered';
      }
      const item = trimmedLine.replace(/^\d+\.\s+/, '');
      currentList.push(item);
      return;
    }

    // Handle regular paragraphs
    flushList();
    
    if (trimmedLine === '') {
      formattedElements.push(<br key={key++} />);
    } else {
      formattedElements.push(
        <p key={key++} className="formatted-paragraph">
          {formatInlineText(trimmedLine)}
        </p>
      );
    }
  });

  // Flush any remaining list
  flushList();

  return (
    <div className="formatted-message">
      {formattedElements}
    </div>
  );
};

export default FormattedMessage;
