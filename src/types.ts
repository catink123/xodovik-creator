export interface Publication {
  id: number;
  title: string;
}

export interface HouseEntry {
  id: number;
  houseID: string;
  surnames: string[];
  publications: number[];
}

export interface DataSection {
  id: number;
  title: string;
  tables: HouseEntry[];
}
