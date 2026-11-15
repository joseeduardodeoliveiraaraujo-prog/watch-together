export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      playback_state: {
        Row: {
          current_item_id: string | null;
          is_playing: boolean;
          last_command_id: string | null;
          position_seconds: number;
          position_updated_at: string;
          room_id: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
          video_id: string | null;
        };
        Insert: {
          current_item_id?: string | null;
          is_playing?: boolean;
          last_command_id?: string | null;
          position_seconds?: number;
          position_updated_at?: string;
          room_id: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          video_id?: string | null;
        };
        Update: {
          current_item_id?: string | null;
          is_playing?: boolean;
          last_command_id?: string | null;
          position_seconds?: number;
          position_updated_at?: string;
          room_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          video_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'playback_state_current_item_id_fkey';
            columns: ['current_item_id'];
            isOneToOne: false;
            referencedRelation: 'playlist_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'playback_state_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: true;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'playback_state_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      playlist_items: {
        Row: {
          added_by: string | null;
          created_at: string;
          id: string;
          position: number;
          room_id: string;
          title: string | null;
          video_id: string;
        };
        Insert: {
          added_by?: string | null;
          created_at?: string;
          id?: string;
          position: number;
          room_id: string;
          title?: string | null;
          video_id: string;
        };
        Update: {
          added_by?: string | null;
          created_at?: string;
          id?: string;
          position?: number;
          room_id?: string;
          title?: string | null;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'playlist_items_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'playlist_items_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: {
          joined_at: string;
          room_id: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          room_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          room_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_members_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      rooms: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          last_activity_at: string;
          owner_id: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          last_activity_at?: string;
          owner_id?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          last_activity_at?: string;
          owner_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rooms_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_room: {
        Args: never;
        Returns: {
          code: string;
          created_at: string;
          id: string;
          last_activity_at: string;
          owner_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'rooms';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      join_room: {
        Args: { p_code: string };
        Returns: {
          code: string;
          created_at: string;
          id: string;
          last_activity_at: string;
          owner_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'rooms';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      leave_room: { Args: { p_room_id: string }; Returns: undefined };
      playback_command: {
        Args: {
          p_action: string;
          p_command_id: string;
          p_position?: number;
          p_room_id: string;
          p_video_id?: string;
        };
        Returns: {
          current_item_id: string | null;
          is_playing: boolean;
          last_command_id: string | null;
          position_seconds: number;
          position_updated_at: string;
          room_id: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
          video_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'playback_state';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      server_now: { Args: never; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
