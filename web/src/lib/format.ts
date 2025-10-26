export const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
})

export const formatSupplyUnits = (value: number, symbol: string) =>
  `${numberFormatter.format(value)} ${symbol}`
