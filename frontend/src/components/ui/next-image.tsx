import React from 'react';

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}

export default function Image({
  fill,
  sizes,
  className = '',
  style,
  alt = '',
  src,
  ...props
}: ImageProps) {
  const fillStyle: React.CSSProperties = fill
    ? {
        position: 'absolute',
        height: '100%',
        width: '100%',
        inset: 0,
        objectFit: 'cover',
      }
    : {};

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ ...fillStyle, ...style }}
      loading={props.priority ? 'eager' : 'lazy'}
      {...props}
    />
  );
}
