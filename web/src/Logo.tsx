// The real club patch: top rocker, horse-skull emblem with 1% / MC diamonds, bottom rocker.
// Native aspect ratio is kept: set one dimension only and the other follows.
export default function Logo({ height, width }: { height?: number; width?: number }) {
  const small = (height ?? Infinity) <= 160 && (width ?? Infinity) <= 200;
  return (
    <img
      className="logo"
      src={small ? '/emblem-small.png' : '/emblem.png'}
      alt="The Brotherhood MC, Paleto Bay"
      height={height}
      width={width}
      style={{ height: height ? `${height}px` : 'auto', width: width ? `${width}px` : 'auto' }}
    />
  );
}
