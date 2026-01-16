import React from 'react';

type EibpoMarkProps = {
  className?: string;
  title?: string;
};

const EibpoMark: React.FC<EibpoMarkProps> = ({ className = '', title }) => {
  const ariaProps = title
    ? { role: 'img', 'aria-label': title }
    : { 'aria-hidden': true };

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...ariaProps}
    >
      <circle cx="24" cy="24" r="11" stroke="currentColor" strokeWidth="3" />
      <path
        d="M14 24h20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default EibpoMark;
export { EibpoMark };
