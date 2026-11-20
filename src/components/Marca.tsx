/** Marca do projeto: um caderno pequeno com uma folha brotando. */
export function Marca({ tamanho = 32 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="5" y="3" width="21" height="26" rx="3" fill="#2e5e34" />
      <rect x="5" y="3" width="4" height="26" rx="1.5" fill="#224626" />
      <path d="M12 23c0-7 4-11.5 11-12-.2 7.4-4.4 12-11 12Z" fill="#faf5ea" />
      <path d="M12.5 22.5 19 15.5" stroke="#2e5e34" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
