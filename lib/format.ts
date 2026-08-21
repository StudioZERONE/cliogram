/**
 * Number formatting and parsing utilities for Thousand Separator (Commas)
 */

export const formatCommaString = (val: string | number): string => {
  if (val === '' || val === null || val === undefined) return '';
  let str = String(val).replace(/,/g, '').trim();
  const isNegative = str.startsWith('-');
  if (isNegative) str = str.slice(1);

  if (str === '') return isNegative ? '-' : '';

  const parts = str.split('.');
  const integerPart = parts[0].replace(/[^\d]/g, '');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (parts.length > 1) {
    const decimalPart = parts[1].replace(/[^\d]/g, '');
    return (isNegative ? '-' : '') + (formattedInteger || '0') + '.' + decimalPart;
  }
  return (isNegative ? '-' : '') + formattedInteger;
};

export const parseCommaNumber = (val: string): number => {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};
