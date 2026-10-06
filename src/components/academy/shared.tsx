"use client";
import { ReactNode } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Attendance, summary } from "@/lib/academy";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
export function Choice({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  items: string[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label={label} className="w-full min-w-36">
        <SelectValue
          placeholder={
            label === "Lecturer role"
              ? "Choose a lecturer role"
              : "Choose a programme"
          }
        />
      </SelectTrigger>
      <SelectContent>
        {items.map((v) => (
          <SelectItem
            key={v}
            value={v}
            className="py-2 text-left [&_span]:whitespace-normal"
          >
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
export function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="my-2 text-3xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <Badge
      variant={
        value === "Absent" || value === "Inactive" ? "secondary" : "default"
      }
    >
      {value}
    </Badge>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
export function AttendanceChart({
  records,
  monthly = false,
}: {
  records: Attendance[];
  monthly?: boolean;
}) {
  const groups = new Map<string, Attendance[]>();
  records.forEach((r) => {
    const key = monthly ? r.date.slice(0, 7) : r.date;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  const data = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([date, rs]) => ({ date, ...summary(rs) }));
  if (!data.length)
    return <Empty text="Record attendance to see this chart." />;
  return (
    <div
      className="h-72 w-full min-w-0"
      role="img"
      aria-label="Chart showing present and absent attendance counts"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => (monthly ? v : v.slice(5))}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="present"
            name="Present"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="absent"
            name="Absent"
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
