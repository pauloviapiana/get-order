/**
 * Traduz erros do Sequelize/PostgreSQL para status e corpo seguros.
 * O client só recebe { erro }. SQL, stack e constraint ficam no log do servidor.
 *
 * UNIQUE  → 409
 * FK      → 409 (referência ausente, ou exclusão/alteração com vínculo)
 * validação do model e CHECK/tipos óbvios do banco → 400
 * o resto (conexão, SQL inesperado) → null, e o tratador responde 500
 */

const CODIGO_UNIQUE = '23505';
const CODIGO_FK = '23503';
/** ON DELETE/UPDATE RESTRICT no Postgres. O Sequelize não promove isto a ForeignKeyConstraintError. */
const CODIGO_RESTRICT = '23001';

/** Violações de dado, não de infraestrutura. */
const CODIGOS_400 = new Set([
  '23514', // check_violation
  '23502', // not_null_violation
  '22001', // string_data_right_truncation
  '22003', // numeric_value_out_of_range
  '22P02', // invalid_text_representation
  '22007', // invalid_datetime_format
  '22008', // datetime_field_overflow
]);

function codigoPg(error) {
  return error.parent?.code || error.original?.code || '';
}

function textoBanco(error) {
  return [error.parent?.detail, error.original?.detail, error.parent?.message, error.message]
    .filter(Boolean)
    .join(' ');
}

function campoUnico(error) {
  const peloErrors = error.errors?.find((item) => item?.path)?.path;
  if (peloErrors) return String(peloErrors).replace(/"/g, '');

  const chaves = Object.keys(error.fields || {});
  if (chaves.length > 0) return chaves[0].replace(/"/g, '');

  const detalhe = error.parent?.detail || error.original?.detail || '';
  const match = detalhe.match(/(?:Chave|Key) \(([^)]+)\)=/i);
  if (match) return match[1].replace(/"/g, '').trim();

  return '';
}

function mensagemUnico(error) {
  const campo = campoUnico(error);
  const constraint = error.parent?.constraint || error.original?.constraint || '';
  const chave = `${campo} ${constraint}`.toLowerCase();

  if (chave.includes('email')) return 'E-mail já cadastrado';
  if (chave.includes('identificacao')) return 'Identificação de mesa já cadastrada';
  if (chave.includes('nome')) return 'Categoria já cadastrada';
  return 'Valor já cadastrado';
}

function mensagemFk(error) {
  const texto = textoBanco(error);
  const ausente = /not present|não está presente|nao esta presente/i.test(texto);
  const vinculo = /still referenced|is referenced|ainda é referenciada|é referenciada|violates restrict|update or delete|atualização ou exclusão|atualizacao ou exclusao/i.test(
    texto
  );

  if (vinculo && !ausente) {
    return 'Não é possível excluir ou alterar: o registro está vinculado a outros dados';
  }

  return 'Referência inválida: o recurso relacionado não existe';
}

function mensagemValidacao(error) {
  const partes = (error.errors || []).map((item) => {
    const campo = item.path ? String(item.path) : 'campo';

    switch (item.validatorKey) {
      case 'min':
        return `${campo} abaixo do mínimo permitido`;
      case 'max':
        return `${campo} acima do máximo permitido`;
      case 'notEmpty':
      case 'notNull':
        return `${campo} é obrigatório`;
      case 'len':
        return `${campo} com tamanho inválido`;
      default:
        return `${campo} inválido`;
    }
  });

  const unicos = [...new Set(partes)];
  return unicos.length ? unicos.join('; ') : 'Dados inválidos';
}

/**
 * @returns {{ status: number, body: { erro: string }, logar: boolean } | null}
 */
export function mapearErroSequelize(error) {
  if (!error || typeof error !== 'object') return null;

  const codigo = codigoPg(error);

  if (error.name === 'SequelizeUniqueConstraintError' || codigo === CODIGO_UNIQUE) {
    return { status: 409, body: { erro: mensagemUnico(error) }, logar: false };
  }

  if (
    error.name === 'SequelizeForeignKeyConstraintError' ||
    codigo === CODIGO_FK ||
    codigo === CODIGO_RESTRICT
  ) {
    return { status: 409, body: { erro: mensagemFk(error) }, logar: true };
  }

  if (error.name === 'SequelizeValidationError') {
    return { status: 400, body: { erro: mensagemValidacao(error) }, logar: false };
  }

  if (error.name === 'SequelizeDatabaseError' && CODIGOS_400.has(codigo)) {
    return {
      status: 400,
      body: { erro: 'Dados inválidos para uma restrição do banco' },
      logar: true,
    };
  }

  return null;
}
