interface SnackIconProps {
  src: string;
  alt: string;
  className?: string;
}

export function SnackIcon({ src, alt, className }: SnackIconProps) {
  return <img alt={alt} className={className} draggable={false} src={src} />;
}
