export function getUIElement<T = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing screen element: ${id}`);
  return element as T;
}

export type Beast = {
  id: string;
  index: number;
  Name: string;
  Classification: string;
  AutoAttackElement: string;
  Location: string;
  Trick?: { Name: string; Type: string; Element: string; Effect: string };
  TemperedRelease?: { Name: string; Type: string; Element: string; Effect: string };
  Borrow?: { Name: string; Type: string; Element: string; Effect: string };
  PartingBlow?: { Name: string; Type: string; Element: string; Effect: string };
};

export type SearchResult = {
  name?: string;
  Name?: string;
  zones?: string[];
  coordinates?: { zone: string; x: number; y: number }[];
  Zone?: string;
  X?: number;
  Y?: number;
  [key: string]: any;
};

export type SpellSource = {
  Type: string;
  Name: string;
  Location: string;
  X?: number | null;
  Y?: number | null;
  IsRecommended?: boolean;
};

export type Spell = {
  Number: number;
  Name: string;
  Rank: number;
  Sources: SpellSource[];
};