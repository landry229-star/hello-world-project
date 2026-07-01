// Configuration paiement manuel Mobile Money — Bénin.
// Remplacez les numéros par vos vrais numéros marchand quand vous serez prêt.
export type Operator = "mtn" | "moov" | "celtiis";

export const MERCHANT_ACCOUNTS: Record<
  Operator,
  { label: string; number: string; holder: string; ussd: string; color: string }
> = {
  mtn: {
    label: "MTN MoMo",
    number: "+229 00 00 00 00", // À remplacer
    holder: "LandryShop",
    ussd: "*126#",
    color: "#FFCB05",
  },
  moov: {
    label: "Moov Money",
    number: "+229 00 00 00 00", // À remplacer
    holder: "LandryShop",
    ussd: "*855#",
    color: "#0066B3",
  },
  celtiis: {
    label: "Celtiis Cash",
    number: "+229 00 00 00 00", // À remplacer
    holder: "LandryShop",
    ussd: "*880#",
    color: "#E30613",
  },
};