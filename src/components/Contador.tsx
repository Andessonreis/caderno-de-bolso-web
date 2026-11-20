/**
 * Contador discreto de letras. Só aparece perto do limite do campo, para a
 * pessoa saber antes que o texto pare de entrar. O campo usa o mesmo número
 * no maxLength, então nada é cortado sem aviso.
 */
export function Contador({ id, valor, limite }: { id: string; valor: string; limite: number }) {
  const restam = limite - valor.length;
  const perto = valor.length >= Math.floor(limite * 0.8);
  return (
    <p id={id} className="contador" aria-live="polite">
      {perto
        ? restam > 0
          ? `Ainda cabem ${restam} ${restam === 1 ? "letra" : "letras"}.`
          : `Chegou ao limite de ${limite} letras.`
        : null}
    </p>
  );
}
