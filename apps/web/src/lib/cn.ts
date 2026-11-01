export type ClassValue = string | false | null | undefined;

/**
 * Une clases condicionales sin dependencias externas. Las clases llegan como
 * strings completos (nunca concatenados) para que Tailwind pueda purgarlas.
 */
export const cn = (...classes: ClassValue[]): string =>
  classes.filter((value): value is string => Boolean(value)).join(' ');
