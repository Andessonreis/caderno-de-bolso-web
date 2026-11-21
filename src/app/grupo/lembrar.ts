import { CHAVE_GRUPO_LEMBRADO, type GrupoLembrado } from "@/lib/grupo";
import { avisarMudancaNasVisitas } from "@/lib/useNavegador";

/** Guarda (ou esquece) neste aparelho o grupo e a chave da coordenação. */
export function lembrarGrupo(grupo: GrupoLembrado | null) {
  try {
    if (grupo) localStorage.setItem(CHAVE_GRUPO_LEMBRADO, JSON.stringify(grupo));
    else localStorage.removeItem(CHAVE_GRUPO_LEMBRADO);
  } catch {
    // Sem espaço ou armazenamento bloqueado: o link continua funcionando.
  }
  avisarMudancaNasVisitas();
}
