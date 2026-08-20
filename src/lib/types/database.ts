// supabase/schema.sql 과 1:1로 대응하는 타입.
// 추후 `supabase gen types typescript`로 자동 생성한 파일로 교체 가능.
//
// 참고: Profile/Routine/CheckIn은 interface가 아니라 type으로 선언한다.
// interface는 암묵적 인덱스 시그니처가 없어서 @supabase/supabase-js가 기대하는
// GenericSchema(Record<string, ...> 기반) 제약을 만족하지 못하고, 그러면
// supabase.from(...) 결과 타입 전체가 never로 무너진다.

export type VerificationType = "photo" | "text" | "check";
export type SuccessRule = "both" | "either";

export type Profile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  partner_id: string | null;
  invite_code: string;
  created_at: string;
};

export type Routine = {
  id: string;
  title: string;
  verification_type: VerificationType;
  success_rule: SuccessRule;
  start_date: string;
  end_date: string | null;
  penalty_text: string | null;
  created_by: string;
  created_at: string;
};

export type CheckIn = {
  id: string;
  routine_id: string;
  user_id: string;
  date: string;
  proof_url: string | null;
  memo: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; nickname: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      routines: {
        Row: Routine;
        Insert: Partial<Routine> & {
          title: string;
          verification_type: VerificationType;
          created_by: string;
        };
        Update: Partial<Routine>;
        Relationships: [];
      };
      check_ins: {
        Row: CheckIn;
        Insert: Partial<CheckIn> & { routine_id: string; user_id: string };
        Update: Partial<CheckIn>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      connect_partner: {
        Args: { target_code: string };
        Returns: Profile;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
