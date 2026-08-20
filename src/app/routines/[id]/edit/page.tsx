import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import RoutineForm from "../../RoutineForm";

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: routine } = await supabase
    .from("routines")
    .select(
      "id, title, verification_type, success_rule, frequency, frequency_days, start_date, end_date, penalty_text, assignee_id"
    )
    .eq("id", id)
    .single();

  if (!routine) notFound();

  return (
    <RoutineForm
      mode="edit"
      routineId={routine.id}
      initialValues={{
        title: routine.title,
        verification_type: routine.verification_type,
        success_rule: routine.success_rule,
        frequency: routine.frequency,
        frequency_days: routine.frequency_days,
        start_date: routine.start_date,
        end_date: routine.end_date,
        penalty_text: routine.penalty_text,
        assignee_id: routine.assignee_id,
      }}
    />
  );
}
