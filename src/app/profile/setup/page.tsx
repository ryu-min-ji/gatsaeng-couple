"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

export default function ProfileSetupPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setNickname(data.nickname === "갓생러" ? "" : data.nickname);
        setAvatarUrl(data.avatar_url);
      }
    }
    loadProfile();
  }, [supabase, router]);

  function handleFileSelect(file: File) {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    setError(null);

    if (nickname.trim().length === 0) {
      setError("닉네임을 입력해주세요");
      return;
    }
    if (!userId) return;

    setSaving(true);

    let nextAvatarUrl = avatarUrl;

    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, selectedFile, { upsert: true });

      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      nextAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ nickname: nickname.trim(), avatar_url: nextAvatarUrl })
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/connect");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center px-6 pb-10 pt-16 text-center">
      <h1 className="font-display text-2xl font-bold leading-snug text-plum">
        나를 소개해주세요
      </h1>
      <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-ink-muted">
        파트너에게 보여질 프로필이에요, 나중에 언제든 바꿀 수 있어요
      </p>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-8 flex flex-col items-center gap-2"
      >
        <Avatar avatarUrl={previewUrl ?? avatarUrl} nickname={nickname} className="h-24 w-24 text-2xl" />
        <span className="text-xs font-bold text-coral">갤러리에서 사진 선택</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
      />

      <div className="mt-8 w-full text-left">
        <label className="text-xs font-bold tracking-wide text-ink-muted" htmlFor="nickname">
          닉네임
        </label>
        <input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="파트너에게 불리고 싶은 이름"
          maxLength={20}
          className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-coral"
        />
        {error && <p className="mt-2 text-xs text-coral">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-coral py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "저장하는 중..." : "저장하고 계속하기"}
        </button>
      </div>

      <Link href="/connect" className="mt-6 text-xs font-bold text-ink-muted underline">
        나중에 할게요
      </Link>
    </main>
  );
}
