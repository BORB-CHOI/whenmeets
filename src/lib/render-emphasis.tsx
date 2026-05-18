import { Fragment, type ReactNode } from 'react';

export function renderEmphasis(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function stripEmphasis(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}
