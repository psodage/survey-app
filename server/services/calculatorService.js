/** Stateless measurement / rate quote (extend with your survey formulas). */
export function quote(body) {
  const lengthM = Number(body.lengthM) || 0
  const widthM = Number(body.widthM) || 0
  const ratePerSqm = Number(body.ratePerSqm) || 0
  const areaSqm = lengthM * widthM
  const estimated = areaSqm * ratePerSqm
  return {
    areaSqm: Math.round(areaSqm * 100) / 100,
    ratePerSqm,
    estimatedTotal: Math.round(estimated * 100) / 100,
    currency: body.currency || 'INR',
  }
}
