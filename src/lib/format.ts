export function number(value: number, digits = 1) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function integer(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}
