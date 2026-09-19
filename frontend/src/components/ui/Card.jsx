export default function Card({ children, className = "", ...rest }) {
  return (
    <div
      className={`rounded-xl bg-white p-6 shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
