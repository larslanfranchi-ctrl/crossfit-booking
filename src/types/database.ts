export type UserRole = "admin" | "instructor" | "user";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          address_street: string | null;
          address_zip: string | null;
          address_city: string | null;
          birth_date: string | null;
          role: UserRole;
          is_active: boolean;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          address_street?: string | null;
          address_zip?: string | null;
          address_city?: string | null;
          birth_date?: string | null;
          role?: UserRole;
          is_active?: boolean;
        };
        Update: {
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          address_street?: string | null;
          address_zip?: string | null;
          address_city?: string | null;
          birth_date?: string | null;
          role?: UserRole;
          is_active?: boolean;
        };
        Relationships: [];
      };
      course_types: {
        Row: {
          id: number;
          name: string;
          is_active: boolean;
        };
        Insert: {
          name: string;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      appointment_slots: {
        Row: {
          id: number;
          start_time: string;
          end_time: string;
          capacity: number;
          course_type_id: number;
          description: string | null;
          instructor_id: string | null;
          training_id: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          start_time: string;
          end_time: string;
          capacity?: number;
          course_type_id: number;
          description?: string | null;
          instructor_id?: string | null;
          training_id?: number | null;
          created_by?: string | null;
        };
        Update: {
          start_time?: string;
          end_time?: string;
          capacity?: number;
          course_type_id?: number;
          description?: string | null;
          instructor_id?: string | null;
          training_id?: number | null;
        };
        Relationships: [];
      };
      trainings: {
        Row: {
          id: number;
          name: string;
          content: string | null;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          name: string;
          content?: string | null;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          content?: string | null;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: number;
          name: string;
          duration: string;
          check_ins: string;
          classes: string;
          price: string;
          price_note: string;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          name: string;
          duration: string;
          check_ins: string;
          classes?: string;
          price: string;
          price_note?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          duration?: string;
          check_ins?: string;
          classes?: string;
          price?: string;
          price_note?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      user_memberships: {
        Row: {
          id: number;
          user_id: string;
          membership_id: number;
          starts_on: string;
          ends_on: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          membership_id: number;
          starts_on?: string;
          ends_on?: string | null;
        };
        Update: {
          membership_id?: number;
          starts_on?: string;
          ends_on?: string | null;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: number;
          slot_id: number;
          user_id: string;
          booked_at: string;
        };
        Insert: {
          slot_id: number;
          user_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: {
      slot_availability: {
        Row: {
          id: number;
          start_time: string;
          end_time: string;
          capacity: number;
          booked_count: number;
          course_type_id: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_all_users_with_email: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          full_name: string | null;
          email: string;
          role: UserRole;
          is_active: boolean;
        }[];
      };
      get_slot_detail: {
        Args: { p_slot_id: number };
        Returns: {
          instructor_name: string | null;
          participant_names: string[] | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
