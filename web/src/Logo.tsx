// The real club patch: top rocker, horse-skull emblem with 1% / MC diamonds, bottom rocker.
// `ashen` swaps in the header variant whose lettering is white/ash instead of warm cream.
// Native aspect ratio is kept: set one dimension only and the other follows.
export default function Logo({ height, width, ashen }: { height?: number; width?: number; ashen?: boolean }) {
  const small = (height ?? Infinity) <= 200 && (width ?? Infinity) <= 200;
  return (
    <img
      className="logo"
      src={ashen ? '/emblem-header.png' : small ? '/emblem-small.png' : '/emblem.png'}
      alt="The Brotherhood MC, Paleto Bay"
      height={height}
      width={width}
      style={{ height: height ? `${height}px` : 'auto', width: width ? `${width}px` : 'auto' }}
    />
  );
}
