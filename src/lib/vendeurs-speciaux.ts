// Les deux numéros de vendeur toujours réservés (voir migration 0007) :
// articles vendus directement par la ludothèque, jamais de vrai vendeur
// derrière — rien ne leur est jamais dû, et un achat par un bénévole sur
// ces numéros est offert.
export const NUMERO_LUDOTHEQUE = 901;
export const NUMERO_DONS_LUDOTHEQUE = 902;
export const NUMEROS_SPECIAUX = [NUMERO_LUDOTHEQUE, NUMERO_DONS_LUDOTHEQUE];

export function estVendeurSpecial(numeroVendeur: number): boolean {
  return NUMEROS_SPECIAUX.includes(numeroVendeur);
}
