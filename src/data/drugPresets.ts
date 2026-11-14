/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DrugUnit = 'g' | 'mg' | 'mcg' | 'ng' | 'UI' | 'mEq';
export type TimeBase = 'min' | 'hour';

export interface DrugPreset {
  id: string;
  name: string;
  category:
    | 'Miorilassanti'
    | 'Analgesici'
    | 'Sedativi / Ipnotici'
    | 'Vasopressori Inotropi'
    | 'Vasodilatatori'
    | 'Anticoagulanti'
    | 'β-Bloccanti'
    | 'Broncodilatatori';
  preparation: string;
  concentrationLabel: string;
  nominalVolume: number;
  syringeDrugAmount: number;
  syringeDrugUnit: DrugUnit;
  flowMode: 'dose' | 'direct_ml_h';
  doseUnit: DrugUnit;
  useWeight: boolean;
  timeBase: TimeBase;
  dosageRangeText: string;
  maxDose?: number;
  maxRateMlH?: number;
  defaultDose: number;
  defaultRateMlH: number;
  suggestedColor: 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';
}

export const DRUG_CATEGORIES: DrugPreset['category'][] = [
  'Miorilassanti',
  'Analgesici',
  'Sedativi / Ipnotici',
  'Vasopressori Inotropi',
  'Vasodilatatori',
  'Anticoagulanti',
  'β-Bloccanti',
  'Broncodilatatori'
];

export const DRUG_PRESETS: DrugPreset[] = [
  // MIORILASSANTI
  {
    id: 'atracurio',
    name: 'Atracurio',
    category: 'Miorilassanti',
    preparation: 'Puro (10 fl)',
    concentrationLabel: '10 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 500,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '4,5 - 29,5 µg/kg/min',
    maxDose: 29.5,
    defaultDose: 10,
    defaultRateMlH: 4.2,
    suggestedColor: 'sky'
  },
  {
    id: 'rocuronio',
    name: 'Rocuronio',
    category: 'Miorilassanti',
    preparation: 'Puro (10 fl)',
    concentrationLabel: '10 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 500,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '8 - 10 µg/kg/min',
    maxDose: 10,
    defaultDose: 8,
    defaultRateMlH: 3.4,
    suggestedColor: 'sky'
  },
  {
    id: 'cisatracurio',
    name: 'Cisatracurio',
    category: 'Miorilassanti',
    preparation: 'Puro (10 fl)',
    concentrationLabel: '2 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 100,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '1 - 3 µg/kg/min',
    maxDose: 3,
    defaultDose: 2,
    defaultRateMlH: 4.2,
    suggestedColor: 'sky'
  },

  // ANALGESICI
  {
    id: 'fentanil',
    name: 'Fentanil',
    category: 'Analgesici',
    preparation: '5 fl (500 µg) in 50 ml',
    concentrationLabel: '10 µg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 500,
    syringeDrugUnit: 'mcg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'hour',
    dosageRangeText: '2 - 4 µg/kg/h',
    maxDose: 4,
    defaultDose: 2,
    defaultRateMlH: 14,
    suggestedColor: 'amber'
  },
  {
    id: 'remifentanil',
    name: 'Remifentanil',
    category: 'Analgesici',
    preparation: '2 fl (2 mg) in 40 ml',
    concentrationLabel: '50 µg/ml',
    nominalVolume: 40,
    syringeDrugAmount: 2,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '0,02 - 0,15 µg/kg/min',
    maxDose: 0.15,
    defaultDose: 0.05,
    defaultRateMlH: 4.2,
    suggestedColor: 'amber'
  },

  // SEDATIVI / IPNOTICI
  {
    id: 'midazolam',
    name: 'Midazolam',
    category: 'Sedativi / Ipnotici',
    preparation: '3 fl (45 mg) in 45 ml',
    concentrationLabel: '1 mg/ml',
    nominalVolume: 45,
    syringeDrugAmount: 45,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mg',
    useWeight: true,
    timeBase: 'hour',
    dosageRangeText: '0,05 mg/kg/h',
    maxDose: 0.05,
    defaultDose: 0.05,
    defaultRateMlH: 3.5,
    suggestedColor: 'violet'
  },
  {
    id: 'propofol-2',
    name: 'Propofol 2%',
    category: 'Sedativi / Ipnotici',
    preparation: 'Puro (1 fl)',
    concentrationLabel: '20 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 1000,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mg',
    useWeight: true,
    timeBase: 'hour',
    dosageRangeText: '2 - 6 mg/kg/h',
    maxDose: 6,
    defaultDose: 3,
    defaultRateMlH: 10.5,
    suggestedColor: 'violet'
  },
  {
    id: 'dexmedetomidina',
    name: 'Dexmedetomidina',
    category: 'Sedativi / Ipnotici',
    preparation: '2 fl (400 µg) in 50 ml',
    concentrationLabel: '8 µg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 400,
    syringeDrugUnit: 'mcg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'hour',
    dosageRangeText: '0,2 - 1,4 µg/kg/h',
    maxDose: 1.4,
    defaultDose: 0.7,
    defaultRateMlH: 6.1,
    suggestedColor: 'violet'
  },

  // VASOPRESSORI INOTROPI
  {
    id: 'adrenalina',
    name: 'Adrenalina',
    category: 'Vasopressori Inotropi',
    preparation: '10 fl (10 mg) in 50 ml S.G.',
    concentrationLabel: '0,2 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 10,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '0,01 - 2,8 µg/kg/min',
    maxDose: 2.8,
    defaultDose: 0.1,
    defaultRateMlH: 2.1,
    suggestedColor: 'rose'
  },
  {
    id: 'noradrenalina',
    name: 'Noradrenalina',
    category: 'Vasopressori Inotropi',
    preparation: '5 fl (10 mg) in 50 ml S.G.',
    concentrationLabel: '0,2 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 10,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '0,01 - 1,2 µg/kg/min',
    maxDose: 1.2,
    defaultDose: 0.1,
    defaultRateMlH: 2.1,
    suggestedColor: 'rose'
  },
  {
    id: 'noradrenalina-flac',
    name: 'Noradrenalina flac',
    category: 'Vasopressori Inotropi',
    preparation: '1 flacone puro',
    concentrationLabel: '0,16 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 8,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '0,01 - 1,2 µg/kg/min',
    maxDose: 1.2,
    defaultDose: 0.1,
    defaultRateMlH: 2.6,
    suggestedColor: 'rose'
  },
  {
    id: 'dobutamina',
    name: 'Dobutamina',
    category: 'Vasopressori Inotropi',
    preparation: '1 fl (250 mg) in 50 ml',
    concentrationLabel: '5 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 250,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '2 - 20 µg/kg/min',
    maxDose: 20,
    defaultDose: 5,
    defaultRateMlH: 4.2,
    suggestedColor: 'rose'
  },
  {
    id: 'dopamina',
    name: 'Dopamina',
    category: 'Vasopressori Inotropi',
    preparation: '1 fl (200 mg) in 50 ml',
    concentrationLabel: '4 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 200,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '1 - 20 µg/kg/min',
    maxDose: 20,
    defaultDose: 5,
    defaultRateMlH: 5.3,
    suggestedColor: 'rose'
  },
  {
    id: 'terlipressina',
    name: 'Terlipressina',
    category: 'Vasopressori Inotropi',
    preparation: '2 fl (1,7 mg) in 50 ml',
    concentrationLabel: '0,03 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 1.7,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '0,02 - 0,04 µg/kg/min',
    maxDose: 0.04,
    defaultDose: 0.03,
    defaultRateMlH: 3.7,
    suggestedColor: 'rose'
  },
  {
    id: 'isoprenalina',
    name: 'Isoprenalina',
    category: 'Vasopressori Inotropi',
    preparation: '5 fl (1 mg) in 50 ml',
    concentrationLabel: '20 µg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 1,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '0,05 - 0,5 µg/kg/min',
    maxDose: 0.5,
    defaultDose: 0.1,
    defaultRateMlH: 21,
    suggestedColor: 'rose'
  },
  {
    id: 'argipressina',
    name: 'Argipressina',
    category: 'Vasopressori Inotropi',
    preparation: '1 fl (40 UI) in 50 ml',
    concentrationLabel: '0,8 UI/ml',
    nominalVolume: 50,
    syringeDrugAmount: 40,
    syringeDrugUnit: 'UI',
    flowMode: 'direct_ml_h',
    doseUnit: 'UI',
    useWeight: false,
    timeBase: 'hour',
    dosageRangeText: '0,75 - 2,25 ml/h',
    maxRateMlH: 2.25,
    defaultDose: 1,
    defaultRateMlH: 1.5,
    suggestedColor: 'rose'
  },

  // VASODILATATORI
  {
    id: 'nitroglicerina',
    name: 'Nitroglicerina',
    category: 'Vasodilatatori',
    preparation: 'Puro (1 fl)',
    concentrationLabel: '1 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 50,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '0,15 - 4 µg/kg/min',
    maxDose: 4,
    defaultDose: 0.5,
    defaultRateMlH: 2.1,
    suggestedColor: 'amber'
  },
  {
    id: 'nitroprussiato',
    name: 'Nitroprussiato',
    category: 'Vasodilatatori',
    preparation: '1 fl (50 mg / 50 ml S.G.)',
    concentrationLabel: '1 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 50,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '0,3 - 8 mg/kg/min',
    maxDose: 8,
    defaultDose: 0.5,
    defaultRateMlH: 3,
    suggestedColor: 'amber'
  },

  // ANTICOAGULANTI
  {
    id: 'eparina-sodica',
    name: 'Eparina sodica',
    category: 'Anticoagulanti',
    preparation: '25.000 UI in 50 ml',
    concentrationLabel: '500 UI/ml',
    nominalVolume: 50,
    syringeDrugAmount: 25000,
    syringeDrugUnit: 'UI',
    flowMode: 'dose',
    doseUnit: 'UI',
    useWeight: true,
    timeBase: 'hour',
    dosageRangeText: 'in base ad aPTT (UI/kg/h)',
    defaultDose: 15,
    defaultRateMlH: 2.1,
    suggestedColor: 'emerald'
  },
  {
    id: 'bivalirudina',
    name: 'Bivalirudina',
    category: 'Anticoagulanti',
    preparation: '1 fl (250 mg) / 50 ml',
    concentrationLabel: '5 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 250,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mg',
    useWeight: true,
    timeBase: 'hour',
    dosageRangeText: '0,25 - 1,75 mg/kg/h (aPTT)',
    maxDose: 1.75,
    defaultDose: 0.5,
    defaultRateMlH: 7,
    suggestedColor: 'emerald'
  },

  // BETA-BLOCCANTI
  {
    id: 'esmololo',
    name: 'Esmololo',
    category: 'β-Bloccanti',
    preparation: 'Puro (5 fl)',
    concentrationLabel: '10 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 500,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '25 - 300 µg/kg/min',
    maxDose: 300,
    defaultDose: 50,
    defaultRateMlH: 21,
    suggestedColor: 'violet'
  },
  {
    id: 'landiololo',
    name: 'Landiololo',
    category: 'β-Bloccanti',
    preparation: '1 fl (300 mg) / 50 ml',
    concentrationLabel: '6 mg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 300,
    syringeDrugUnit: 'mg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: true,
    timeBase: 'min',
    dosageRangeText: '1 - 40 µg/kg/min',
    maxDose: 40,
    defaultDose: 10,
    defaultRateMlH: 7,
    suggestedColor: 'violet'
  },

  // BRONCODILATATORI
  {
    id: 'ventolin',
    name: 'Ventolin',
    category: 'Broncodilatatori',
    preparation: '5000 µg / 50 ml',
    concentrationLabel: '100 µg/ml',
    nominalVolume: 50,
    syringeDrugAmount: 5000,
    syringeDrugUnit: 'mcg',
    flowMode: 'dose',
    doseUnit: 'mcg',
    useWeight: false,
    timeBase: 'min',
    dosageRangeText: '5 - 20 µg/min',
    maxDose: 20,
    defaultDose: 10,
    defaultRateMlH: 6,
    suggestedColor: 'emerald'
  }
];

/**
 * Find a matching drug preset by drug name (exact or prefix/case-insensitive match).
 */
export function findDrugPresetByName(drugName?: string): DrugPreset | undefined {
  if (!drugName) return undefined;
  const clean = drugName.trim().toLowerCase();
  if (!clean) return undefined;
  return (
    DRUG_PRESETS.find((p) => p.name.toLowerCase() === clean) ||
    DRUG_PRESETS.find((p) => clean.includes(p.name.toLowerCase()))
  );
}
