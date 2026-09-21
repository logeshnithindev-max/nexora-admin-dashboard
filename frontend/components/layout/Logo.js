"use client";

function NexoraMark() {
  return (
    <svg
      className="nexora-mark"
      viewBox="0 0 32 32"
      role="img"
      aria-label="Nexora"
    >
      <path d="M4 12V4h8M20 4h8v8M28 20v8h-8M12 28H4v-8" />
      <path d="m8 23 6-7 4 3 7-10" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="brand">
      <span className="logo">
        <NexoraMark />
      </span>
      <div>
        <b>nexora</b>
        <small>ADMIN</small>
      </div>
    </div>
  );
}

export default Logo;
