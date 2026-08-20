"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Frequency, SuccessRule, VerificationType } from "@/lib/types/database";

const verificationOptions: { value: VerificationType; label: string; desc: string }[] = [
  { value: "photo", label: "사진", desc: "인증샷을 찍어서 올려요" },
  { value: "text", label: "텍스트", desc: "글로 오늘 한 일을 남겨요" },
  { value: "check", label: "체크만", desc: "완료 여부만 체크해요" },
];

const successRuleOptions: { value: SuccessRule; label: string; desc: string }[] = [
  { value: "both", label: "둘 다 성공해야 인정", desc: "한 명이라도 실패하면 오늘은 실패예요" },
  { value: "either", label: "한 명만 성공해도 인정", desc: "각자 자기 몫만 챙기면 돼요" },
];

const frequencyOptions: { value: Frequency; label: string; desc: string }[] = [
  { value: "daily", label: "매일", desc: "하루도 빠짐없이" },
  { value: "weekdays", label: "평일만", desc: "월~금만 목표일이에요" },
  { value: "weekends", label: "주말만", desc: "토·일만 목표일이에요" },
  { value: "custom", label: "요일 선택", desc: "원하는 요일만 골라요, 예: 주 3회" },
];

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

const routineSchema = z
  .object({
    title: z.string().trim().min(1, "루틴 제목을 입력해주세요").max(50, "50자 이내로 입력해주세요"),
    verification_type: z.enum(["photo", "text", "check"]),
    success_rule: z.enum(["both", "either"]),
    frequency: z.enum(["daily", "weekdays", "weekends", "custom"]),
    frequency_days: z.array(z.number()).nullable(),
    start_date: z.string().min(1, "시작일을 선택해주세요"),
    end_date: z.string().min(1, "종료일을 입력해주세요"),
    penalty_text: z.string().trim().max(100, "100자 이내로 입력해주세요").optional(),
    assignee_id: z.string().nullable(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "종료일은 시작일 이후여야 해요",
    path: ["end_date"],
  })
  .refine((data) => data.frequency !== "custom" || (data.frequency_days?.length ?? 0) > 0, {
    message: "요일을 하나 이상 골라주세요",
    path: ["frequency_days"],
  });

type RoutineFormValues = z.infer<typeof routineSchema>;

type Props =
  | { mode: "create"; routineId?: undefined; initialValues?: undefined }
  | {
      mode: "edit";
      routineId: string;
      initialValues: {
        title: string;
        verification_type: VerificationType;
        success_rule: SuccessRule;
        frequency: Frequency;
        frequency_days: number[] | null;
        start_date: string;
        end_date: string | null;
        penalty_text: string | null;
        assignee_id: string | null;
      };
    };

export default function RoutineForm(props: Props) {
  const { mode } = props;
  const supabase = createClient();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const initial = mode === "edit" ? props.initialValues : undefined;
  const oneMonthFromToday = (() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RoutineFormValues>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
      title: initial?.title ?? "",
      verification_type: initial?.verification_type ?? "check",
      success_rule: initial?.success_rule ?? "both",
      frequency: initial?.frequency ?? "daily",
      frequency_days: initial?.frequency_days ?? null,
      start_date: initial?.start_date ?? today,
      end_date: initial?.end_date ?? oneMonthFromToday,
      penalty_text: initial?.penalty_text ?? "",
      assignee_id: initial?.assignee_id ?? null,
    },
  });

  const isPersonal = watch("assignee_id") !== null;
  const frequency = watch("frequency");

  async function onSubmit(values: RoutineFormValues) {
    setSubmitError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const payload = {
      title: values.title.trim(),
      verification_type: values.verification_type,
      success_rule: values.assignee_id ? ("either" as const) : values.success_rule,
      frequency: values.frequency,
      frequency_days: values.frequency === "custom" ? values.frequency_days : null,
      start_date: values.start_date,
      end_date: values.end_date,
      penalty_text: values.penalty_text?.trim() ? values.penalty_text.trim() : null,
      assignee_id: values.assignee_id,
    };

    if (mode === "create") {
      const { error } = await supabase.from("routines").insert({ ...payload, created_by: user.id });
      if (error) {
        setSubmitError(error.message);
        return;
      }
      router.push("/home");
    } else {
      const { error } = await supabase.from("routines").update(payload).eq("id", props.routineId);
      if (error) {
        setSubmitError(error.message);
        return;
      }
      router.push(`/routines/${props.routineId}`);
    }

    router.refresh();
  }

  const backHref = mode === "edit" ? `/routines/${props.routineId}` : "/home";

  return (
    <main className="mx-auto min-h-screen max-w-md bg-bg px-5 pb-24 pt-8">
      <header className="flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="뒤로 가기"
          className="flex h-8 w-8 items-center justify-center rounded-full text-plum dark:text-white hover:bg-surface"
        >
          &lt;
        </Link>
        <h1 className="font-display text-xl font-bold text-plum dark:text-white">
          {mode === "create" ? "새 루틴 만들기" : "루틴 수정하기"}
        </h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-6">
        <div>
          <label htmlFor="title" className="text-xs font-bold tracking-wide text-ink-muted">
            루틴 제목
          </label>
          <input
            id="title"
            {...register("title")}
            placeholder="예: 아침 6시 기상 인증"
            className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-coral"
          />
          {errors.title && <p className="mt-2 text-xs text-coral">{errors.title.message}</p>}
        </div>

        <div>
          <span className="text-xs font-bold tracking-wide text-ink-muted">누구를 위한 루틴인가요?</span>
          <Controller
            name="assignee_id"
            control={control}
            render={({ field }) => (
              <div className="mt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => field.onChange(null)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition",
                    field.value === null
                      ? "border-coral bg-coral/5"
                      : "border-border hover:border-coral/40"
                  )}
                >
                  <div className="text-sm font-bold text-ink">우리 둘 다</div>
                  <div className="mt-0.5 text-xs text-ink-muted">공동 루틴, 둘 다 화면에서 체크인해요</div>
                </button>
                <button
                  type="button"
                  disabled={!userId}
                  onClick={() => userId && field.onChange(userId)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition disabled:opacity-40",
                    field.value === userId && userId
                      ? "border-coral bg-coral/5"
                      : "border-border hover:border-coral/40"
                  )}
                >
                  <div className="text-sm font-bold text-ink">나만</div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    내 개인 할일, 파트너 화면에도 보이지만 체크인은 나만 할 수 있어요
                  </div>
                </button>
              </div>
            )}
          />
        </div>

        <div>
          <span className="text-xs font-bold tracking-wide text-ink-muted">인증 방식</span>
          <Controller
            name="verification_type"
            control={control}
            render={({ field }) => (
              <div className="mt-2 flex flex-col gap-2">
                {verificationOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => field.onChange(option.value)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition",
                      field.value === option.value
                        ? "border-coral bg-coral/5"
                        : "border-border hover:border-coral/40"
                    )}
                  >
                    <div className="text-sm font-bold text-ink">{option.label}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">{option.desc}</div>
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        <div>
          <span className="text-xs font-bold tracking-wide text-ink-muted">반복 주기</span>
          <Controller
            name="frequency"
            control={control}
            render={({ field }) => (
              <div className="mt-2 flex flex-col gap-2">
                {frequencyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => field.onChange(option.value)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition",
                      field.value === option.value
                        ? "border-coral bg-coral/5"
                        : "border-border hover:border-coral/40"
                    )}
                  >
                    <div className="text-sm font-bold text-ink">{option.label}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">{option.desc}</div>
                  </button>
                ))}
              </div>
            )}
          />
          {frequency === "custom" && (
            <Controller
              name="frequency_days"
              control={control}
              render={({ field }) => {
                const selected = field.value ?? [];
                return (
                  <div className="mt-2 flex gap-1.5">
                    {weekdayLabels.map((label, dow) => {
                      const active = selected.includes(dow);
                      return (
                        <button
                          key={dow}
                          type="button"
                          onClick={() =>
                            field.onChange(
                              active ? selected.filter((d) => d !== dow) : [...selected, dow]
                            )
                          }
                          className={cn(
                            "flex h-10 flex-1 items-center justify-center rounded-lg border text-xs font-bold transition",
                            active
                              ? "border-coral bg-coral text-white"
                              : "border-border text-ink-muted hover:border-coral/40"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                );
              }}
            />
          )}
          {errors.frequency_days && (
            <p className="mt-2 text-xs text-coral">{errors.frequency_days.message}</p>
          )}
        </div>

        {!isPersonal && (
          <div>
            <span className="text-xs font-bold tracking-wide text-ink-muted">성공 조건</span>
            <Controller
              name="success_rule"
              control={control}
              render={({ field }) => (
                <div className="mt-2 flex flex-col gap-2">
                  {successRuleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left transition",
                        field.value === option.value
                          ? "border-coral bg-coral/5"
                          : "border-border hover:border-coral/40"
                      )}
                    >
                      <div className="text-sm font-bold text-ink">{option.label}</div>
                      <div className="mt-0.5 text-xs text-ink-muted">{option.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
        )}

        <div>
          <label htmlFor="penalty_text" className="text-xs font-bold tracking-wide text-ink-muted">
            벌칙 문구 (선택)
          </label>
          <input
            id="penalty_text"
            {...register("penalty_text")}
            placeholder="예: 오늘 데이트 코스 결정권은 상대에게"
            className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-coral"
          />
          <p className="mt-2 text-xs text-ink-muted">
            둘 다 인증을 안 한 날, 루틴 상세 화면에 이 문구가 노출돼요.
          </p>
          {errors.penalty_text && <p className="mt-2 text-xs text-coral">{errors.penalty_text.message}</p>}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="start_date" className="text-xs font-bold tracking-wide text-ink-muted">
              시작일
            </label>
            <input
              id="start_date"
              type="date"
              {...register("start_date")}
              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-coral"
            />
            {errors.start_date && <p className="mt-2 text-xs text-coral">{errors.start_date.message}</p>}
          </div>
          <div className="flex-1">
            <label htmlFor="end_date" className="text-xs font-bold tracking-wide text-ink-muted">
              종료일
            </label>
            <input
              id="end_date"
              type="date"
              {...register("end_date")}
              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-coral"
            />
            {errors.end_date && <p className="mt-2 text-xs text-coral">{errors.end_date.message}</p>}
          </div>
        </div>

        {submitError && <p className="text-xs text-coral">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-coral py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {isSubmitting
            ? mode === "create"
              ? "만드는 중..."
              : "저장하는 중..."
            : mode === "create"
              ? "루틴 만들기"
              : "저장하기"}
        </button>
      </form>
    </main>
  );
}
