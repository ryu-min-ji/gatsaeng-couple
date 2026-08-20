// supabase/schema.sql 과 1:1로 대응하는 타입.
// 추후 `supabase gen types typescript`로 자동 생성한 파일로 교체 가능.

export type VerificationType = "photo" | "text" | "check";
export type SuccessRule = "both" | "either";

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  partner_id: string | null;
  invite_code: string;
  created_at: string;
}

export interface Routine {
  id: string;
  title: string;
  verification_type: VerificationType;
  success_rule: SuccessRule;
  start_date: string;
  end_date: string | null;
  created_by: string;
  created_at: string;
}

export interface CheckIn {
  id: string;
  routine_id: string;
  user_id: string;
  date: string;
  proof_url: string | null;
  memo: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; nickname: string };
        Update: Partial<Profile>;
      };
      routines: {
        Row: Routine;
        Insert: Partial<Routine> & {
          title: string;
          verification_type: VerificationType;
          created_by: string;
        };
        Update: Partial<Routine>;
      };
      check_ins: {
        Row: CheckIn;
        Insert: Partial<CheckIn> & { routine_id: string; user_id: string };
        Update: Partial<CheckIn>;
      };
    };
  };
}
