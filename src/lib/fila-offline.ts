/**
 * Fila de envio para o Modo Oficina.
 * Guarda as ações feitas sem internet e reenvia sozinho quando a conexão volta.
 * É apenas um buffer temporário — o Supabase segue como única fonte de verdade.
 */
export type TarefaFila = {
  id: string;
  descricao: string;
  executar: () => Promise<void>;
};

const fila: TarefaFila[] = [];
const ouvintes = new Set<(qtd: number) => void>();
let processando = false;

export function estaOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function tamanhoFila() {
  return fila.length;
}

export function ouvirFila(callback: (qtd: number) => void) {
  ouvintes.add(callback);
  callback(fila.length);
  return () => ouvintes.delete(callback);
}

function avisar() {
  ouvintes.forEach((cb) => cb(fila.length));
}

/** Executa agora se houver internet; caso contrário guarda para reenviar depois. */
export async function enviarOuEnfileirar(tarefa: TarefaFila): Promise<"enviado" | "na-fila"> {
  if (estaOnline()) {
    try {
      await tarefa.executar();
      return "enviado";
    } catch {
      // Falhou (provavelmente rede instável): vai para a fila.
    }
  }
  fila.push(tarefa);
  avisar();
  return "na-fila";
}

/** Tenta reenviar tudo o que está na fila. Devolve quantas tarefas saíram. */
export async function processarFila(): Promise<number> {
  if (processando || fila.length === 0 || !estaOnline()) return 0;
  processando = true;
  let enviadas = 0;
  try {
    while (fila.length > 0 && estaOnline()) {
      const tarefa = fila[0]!;
      try {
        await tarefa.executar();
        fila.shift();
        enviadas += 1;
        avisar();
      } catch {
        break;
      }
    }
  } finally {
    processando = false;
  }
  return enviadas;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void processarFila();
  });
}
