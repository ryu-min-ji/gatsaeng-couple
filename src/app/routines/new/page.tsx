"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { SuccessRule, VerificationType } from "@/lib/types/database";

const verificationOptions: { value: VerificationType; label: string; desc: string }[] = [
  { value: "photo", label: "사진", desc: "인증샷을 찍어서 올려요" },
  { value: "text", label: "텍스트", desc: "글로 오늘 한 일을 남겨요" },
  { value: "check", label: "체크만", desc: "완료 여부만 체크해요" },
];

const successRuleOptions: { value: SuccessRule; label: string; desc: string }[] = [
  { value: "both", label: "둘 다 성공해야 인정", desc: "한 명이라도 실패하면 오늘은 실패예요" },
  { value: "either", label: "한 명만 성공해도 인정", desc: "각자 자기 몫만 챙기면 돼요" },
];

const routineSchema = z
  .object({
    title: z.string().trim().min(1, "루틴 제목을 입력해주세요").max(50, "50자 이내로 입력해주세요"),
    verification_type: z.enum(["photo", "text", "check"]),
    success_rule: z.enum(["both", "either"]),
    start_date: z.string().min(1, "시작일을 선택해주세요"),
    end_date: z.string().optional(),
    penalty_text: z.string().trim().max(100, "100자 이내로 입력해주세요").optional(),
  })
  .refine((data) => !data.end_date || data.end_date >= data.start_date, {
    message: "종료일은 시작일 이후여야 해요",
    path: ["end_date"],
  });

type RoutineFormValues = z.infer<typeof routineSchema>;

export default function NewRoutinePage() {
  const supabase = createClient();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RoutineFormValues>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
      title: "",
      verification_type: "check",
      success_rule: "both",
      start_date: today,
      end_date: "",
      penalty_text: "",
    },
  });

  async function onSubmit(values: RoutineFormValues) {
    setSubmitError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("routines").insert({
      title: values.title.trim(),
      verification_type: values.verification_type,
      success_rule: values.success_rule,
      start_date: values.start_date,
      end_date: values.end_date ? values.end_date : null,
      penalty_text: values.penalty_text?.trim() ? values.penalty_text.trim() : null,
      created_by: user.id,
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-bg px-5 pb-24 pt-8">
      <header className="flex items-center gap-3">
        <Link
          href="/home"
          aria-label="뒤로 가기"
          className="flex h-8 w-8 items-center justify-center rounded-full text-plum hover:bg-white"
        >
          &lt;
        </Link>
        <h1 className="font-display text-xl font-bold text-plum">새 루틴 만들기</h1>
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
              종료일 (선택)
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
          {isSubmitting ? "만드는 중..." : "루틴 만들기"}
        </button>
      </form>
    </main>
  );
}
