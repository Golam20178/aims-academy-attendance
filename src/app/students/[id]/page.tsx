import { Portal } from "@/components/academy/portal";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Portal page="profile" id={id} />;
}
