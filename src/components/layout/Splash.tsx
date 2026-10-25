/**
 * First load of a visit: the shop's rolling shutter, painted signboard green, with the name board
 * swinging on its nail. It rolls up on its own in under a second, in plain CSS, so it never waits
 * for JavaScript and the page underneath is already drawn when it lifts. Shown once per tab.
 */
export function Splash() {
  return (
    <div id="splash" aria-hidden>
      <div className="splash-shutter">
        <div className="splash-board">
          <svg viewBox="0 0 120 26" className="splash-strings"><path d="M14 26 L60 4 L106 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="60" cy="4" r="3.4" fill="#f5b800" /></svg>
          <div className="splash-sign">
            <span className="sign-type splash-name">Gupta Enterprises</span>
            <span className="splash-sub">Khedi Market · Kohima</span>
          </div>
        </div>
        <span className="splash-handle" />
      </div>
    </div>
  );
}
