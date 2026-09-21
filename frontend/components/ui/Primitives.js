"use client";

export function Title({ tag, title, copy, action }) {
  return (
    <div className="page-title">
      <div>
        <span className="tag">● {tag}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div className="empty">
      <b>◇</b>
      <span>{children}</span>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

export function Modal({ title, close, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={close}>
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
