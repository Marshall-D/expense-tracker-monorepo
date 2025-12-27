// packages/client/src/types.ts
export type Category = {
  id: string;
  name: string;
  color?: string;
  type?: "Global" | "Custom";
};

export type Expense = {
  id?: string;
  amount: number;
  currency: string;
  description: string;
  categoryId: string;
  date: string; // ISO yyyy-mm-dd
};

export type Budget = {
  id?: string;
  categoryId: string;
  amount: number;
  currency: string;
};
