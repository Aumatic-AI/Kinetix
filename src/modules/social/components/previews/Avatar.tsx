export function Avatar({ src, name, size = 40, className = "" }: { src?: string; name: string; size?: number; className?: string }) {
  const initial = (name || "?").replace(/^@/, "").trim().charAt(0).toUpperCase() || "?";
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className={`rounded-full object-cover bg-surface shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}
