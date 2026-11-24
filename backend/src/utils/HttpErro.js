/**
 * Erro de negócio com status HTTP. Services lançam; o middleware de erros responde
 * no formato { "erro": "..." }.
 */
export class HttpErro extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.name = 'HttpErro';
    this.status = status;
  }
}
