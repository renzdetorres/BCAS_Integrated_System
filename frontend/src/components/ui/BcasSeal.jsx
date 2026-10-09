/**
 * The official BCAS school seal - used wherever the app names itself
 * (sidebar brand, auth screens, receipt).
 */
export default function BcasSeal({ size = 36 }) {
  return (
    <img
      src="/images/bcas-logo.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}
