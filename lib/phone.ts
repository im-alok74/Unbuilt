import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/** Last 10 digits of an Indian-style phone number; "" if there aren't enough digits to match on. */
export function normPhone(p: string | null | undefined): string {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

/** Same normalisation, in SQL, for comparing a column against normPhone() values. */
export function normPhoneSql(col: AnyPgColumn): SQL<string> {
  return sql<string>`right(regexp_replace(coalesce(${col}, ''), '\\D', '', 'g'), 10)`;
}
