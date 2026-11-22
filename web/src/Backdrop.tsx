// Site-wide fixed, opaque backdrop: the club patch stays put behind every page while content scrolls over it.
export default function Backdrop() {
  return (
    <div className="site-backdrop" aria-hidden="true">
      <img src="/emblem.png" alt="" />
    </div>
  );
}
