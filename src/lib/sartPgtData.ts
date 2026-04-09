/**
 * PGT-A vs Non-PGT-A live birth rates per embryo transfer by age group.
 *
 * Source: "Preimplantation genetic testing significantly improves in vitro
 * fertilization outcome in all patient age groups: An analysis of 181,609
 * cycles from SART National Summary Report."
 * OAText (open access). n = 181,609 elective single embryo transfers (eSETs):
 *   · Fresh ET (no PGT):  65,419 cycles
 *   · First FET (no PGT): 33,175 cycles
 *   · First FET/PGT-A:    83,015 cycles
 *
 * Values are live birth rates PER TRANSFER (not cumulative from stimulation).
 * PGT-A rates are stable across age (~53–58%) because confirmed-euploid embryo
 * success depends mainly on uterine receptivity, not embryo age. Non-PGT-A
 * rates fall steeply with age as aneuploidy rates rise.
 */

import type { AgeBracket } from "@/lib/constants";

export type PgtAgeDatum = {
  ageGroup: AgeBracket;
  /** Live birth rate per transfer with PGT-A (%). */
  pgtA: number;
  /** Live birth rate per transfer without PGT-A, frozen ET (%). */
  nonPgtA: number;
};

export const SART_PGT_DATA: PgtAgeDatum[] = [
  { ageGroup: "<35",   pgtA: 58.1, nonPgtA: 52.1 },
  { ageGroup: "35-37", pgtA: 57.1, nonPgtA: 44.5 },
  { ageGroup: "38-40", pgtA: 55.6, nonPgtA: 35.8 },
  { ageGroup: ">40",   pgtA: 53.1, nonPgtA: 23.4 },
];
